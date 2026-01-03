import React, { useCallback } from 'react';
import { QueueItem, ActiveJob } from '../../types/queue';
import { ImageInfo, AdminSettings } from '../../types';

// Import extracted hooks
import { useQueueResilience } from './useQueueResilience';
import { useVRAMManagement } from './useVRAMManagement';
import { useQueueRetry } from './useQueueRetry';
import { useQueueCalibration } from './useQueueCalibration';
import { useAdaptiveConcurrency } from './useAdaptiveConcurrency';

interface UseQueueProcessorProps {
    settings: AdminSettings | null;
    queueRef: React.MutableRefObject<QueueItem[]>;
    activeRequestsRef: React.MutableRefObject<number>;
    activeJobsRef: React.MutableRefObject<ActiveJob[]>;
    isPausedRef: React.MutableRefObject<boolean>;
    concurrencyLimit: number;
    setConcurrencyLimit: React.Dispatch<React.SetStateAction<number>>;
    checkBackendHealthRef: React.MutableRefObject<(() => Promise<void>) | null>;
    queuedAnalysisIds: React.MutableRefObject<Set<string>>;
    queuedGenerationIds: React.MutableRefObject<Set<string>>;
    syncQueueStatus: (retryCount?: number) => void;
    updateNotification: (id: string, updates: any) => void;
    setImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    setAnalyzingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    executeAnalysis: (item: QueueItem) => Promise<any>;
    executeGeneration: (item: QueueItem) => Promise<any>;
    isBatchMode: boolean;
    executeBatchAnalysis: (items: QueueItem[]) => Promise<void>;
    setResilienceLog: React.Dispatch<React.SetStateAction<{ timestamp: number, type: 'info' | 'warn' | 'error', message: string }[]>>;
    completedCountRef: React.MutableRefObject<number>;
    retryQueueRef: React.MutableRefObject<Map<string, any>>;
}

export const useQueueProcessor = ({
    settings, queueRef, activeRequestsRef, activeJobsRef, isPausedRef, concurrencyLimit, setConcurrencyLimit,
    checkBackendHealthRef, queuedAnalysisIds, queuedGenerationIds, syncQueueStatus, updateNotification, setImages, setAnalyzingIds,
    executeAnalysis, executeGeneration, isBatchMode, executeBatchAnalysis, setResilienceLog,
    completedCountRef, retryQueueRef
}: UseQueueProcessorProps) => {

    const processQueueRef = React.useRef<() => Promise<void>>();

    // Initialize all extracted hooks
    const { logResilience, logResilienceWithMetrics } = useQueueResilience({
        setResilienceLog
    });

    const {
        optimalBatchSize,
        batchSizeCalibrated,
        calibrateBatchSize,
        batchCalibrationInProgress,
        triggerVramUnload
    } = useVRAMManagement({
        settings,
        activeRequestsRef,
        queueRef,
        logResilience,
        logResilienceWithMetrics
    });

    const {
        // Retry queue ref is now passed in
        consecutiveErrorsRef,
        MAX_CONSECUTIVE_ERRORS,
        resumeAttemptsRef,
        lastResumeTimeRef,
        attemptResume,
        scheduleRetry,
        MAX_RETRY_ATTEMPTS,
        RETRY_DELAY_MS
    } = useQueueRetry({
        queueRef,
        isPausedRef,
        syncQueueStatus,
        processQueueRef,
        logResilience,
        logResilienceWithMetrics,
        retryQueueRef
    });

    const {
        calibrationRef,
        metricsHistoryRef,
        startCalibration,
        stopCalibration,
        getCalibrationStatus,
        recordCalibrationMetrics,
        processCalibrationStep
    } = useQueueCalibration({
        queueRef,
        concurrencyLimit,
        setConcurrencyLimit,
        syncQueueStatus,
        processQueueRef
    });

    const {
        getNextJob,
        adjustConcurrency
    } = useAdaptiveConcurrency({
        queueRef,
        activeJobsRef,
        concurrencyLimit,
        setConcurrencyLimit,
        calibrationRef,
        metricsHistoryRef,
        logResilienceWithMetrics
    });

    // Main queue processing function
    const processQueue = useCallback(async () => {
        if (isPausedRef.current) return;

        // Prevent immediate retry if we just resumed (< 2 seconds ago)
        const timeSinceResume = Date.now() - lastResumeTimeRef.current;
        if (timeSinceResume > 0 && timeSinceResume < 2000) {
            console.log('[Queue] Recently resumed, scheduling check...');
            setTimeout(() => { if (processQueueRef.current) processQueueRef.current(); }, 2000 - timeSinceResume);
            return;
        }

        // Calibration Logic Loop
        if (calibrationRef.current.isActive) {
            const result = processCalibrationStep();
            if (result?.shouldStop) return;
        }

        const effectiveConcurrency = calibrationRef.current.isActive
            ? calibrationRef.current.currentConcurrency
            : concurrencyLimit;

        if (activeRequestsRef.current >= effectiveConcurrency) return;

        while (activeRequestsRef.current < effectiveConcurrency && queueRef.current.length > 0) {

            const task = getNextJob(); // Use Smart Batching
            if (!task) { syncQueueStatus(); break; }

            // BATCH MODE LOGIC
            const BATCH_SIZE = optimalBatchSize;
            let currentBatch = [task];
            if (isBatchMode && task.taskType === 'analysis') {
                // Try to fill the batch
                for (let i = 0; i < BATCH_SIZE - 1; i++) {
                    if (queueRef.current.length > 0 && queueRef.current[0].taskType === 'analysis') {
                        const next = queueRef.current.shift();
                        if (next) currentBatch.push(next);
                    } else {
                        break;
                    }
                }
            }

            activeRequestsRef.current++;

            // Log thread increment
            logResilienceWithMetrics('info', 'Thread Start', {
                Active: activeRequestsRef.current,
                Limit: concurrencyLimit,
                Queue: queueRef.current.length
            });

            // Mark all as active
            currentBatch.forEach(t => {
                activeJobsRef.current.push({
                    id: t.id,
                    fileName: t.fileName,
                    size: t.data.image?.dataUrl.length || 0,
                    startTime: Date.now(),
                    taskType: t.taskType
                });
            });
            syncQueueStatus();

            // EXECUTE (async IIFE)
            (async () => {
                try {
                    // Log job start
                    logResilienceWithMetrics('info', 'Job Start', {
                        Type: task.taskType,
                        Batch: currentBatch.length,
                        Active: activeJobsRef.current.length,
                        Concurrency: `${activeRequestsRef.current}/${concurrencyLimit}`,
                        Queue: queueRef.current.length
                    });

                    const jobStartTime = Date.now();
                    let metrics: any;

                    if (currentBatch.length > 1 && task.taskType === 'analysis') {
                        // BATCH EXECUTION
                        await executeBatchAnalysis(currentBatch);
                    } else {
                        // SINGLE EXECUTION
                        for (const t of currentBatch) {
                            if (t.taskType === 'analysis') metrics = await executeAnalysis(t);
                            else if (t.taskType === 'generate' || t.taskType === 'enhance') metrics = await executeGeneration(t);

                            // Low VRAM Mode: Unload after EACH image
                            if (settings?.performance?.vramUsage === 'low') {
                                logResilienceWithMetrics('info', 'VRAM Unload', {
                                    Reason: 'Low VRAM Mode',
                                    After: `Image ${currentBatch.indexOf(t) + 1}/${currentBatch.length}`,
                                    Queue: queueRef.current.length
                                });
                                await triggerVramUnload();
                            }
                        }
                    }

                    // Reset consecutive error counter on success
                    consecutiveErrorsRef.current = 0;

                    // Increment completed count for successful tasks
                    completedCountRef.current += currentBatch.length;
                    syncQueueStatus(retryQueueRef.current.size);

                    // Log job completion
                    if (metrics) {
                        const duration = (Date.now() - jobStartTime) / 1000;
                        logResilienceWithMetrics('info', 'Job Complete', {
                            Type: task.taskType,
                            Duration: `${duration.toFixed(1)}s`,
                            VRAM: `${metrics.vramUsagePercent?.toFixed(0)}%`,
                            TPS: metrics.tokensPerSecond?.toFixed(1) || 'N/A',
                            Queue: queueRef.current.length
                        });

                        // Record calibration metrics
                        recordCalibrationMetrics(metrics.vramUsagePercent, metrics.tokensPerSecond);

                        // Adjust concurrency based on metrics
                        adjustConcurrency(metrics);
                    } else {
                        // Fallback if no metrics
                        adjustConcurrency();
                    }

                } catch (err: any) {
                    console.error("[Queue] Processing Error:", err);
                    const msg = String(err?.message || err || 'Unknown error').toLowerCase();
                    const isOOMError = msg.includes('out of memory') ||
                        msg.includes('oom') ||
                        msg.includes('cuda') ||
                        msg.includes('memory');
                    const isConnError = msg.includes('fetch') ||
                        msg.includes('connection') ||
                        msg.includes('network') ||
                        msg.includes('500') ||
                        msg.includes('502') ||
                        msg.includes('503') ||
                        msg.includes('504');

                    // Increment consecutive error counter
                    consecutiveErrorsRef.current++;
                    console.warn(`[Queue] Error ${consecutiveErrorsRef.current}/${MAX_CONSECUTIVE_ERRORS}:`, msg);

                    // OOM Error Handling: Reduce batch size and re-queue
                    if (isOOMError && currentBatch.length > 1) {
                        const newBatchSize = Math.max(1, Math.floor(optimalBatchSize / 2));
                        logResilienceWithMetrics('error', 'OOM Detected', {
                            BatchSize: currentBatch.length,
                            Reducing: `${optimalBatchSize}→${newBatchSize}`,
                            Queue: queueRef.current.length,
                            VRAM: 'Critical'
                        });
                        // Re-queue failed tasks to front of queue for retry
                        queueRef.current.unshift(...currentBatch);
                        syncQueueStatus();
                    }
                    // Connection Error Handling
                    else if (isConnError && settings?.resilience?.pauseOnLocalFailure) {
                        logResilienceWithMetrics('error', 'Backend Offline', {
                            Error: msg.substring(0, 30),
                            Queue: queueRef.current.length,
                            Action: 'Pausing'
                        });
                        isPausedRef.current = true;
                        queueRef.current.unshift(task);
                        syncQueueStatus();

                        // Trigger Resume Loop
                        setTimeout(() => attemptResume(), 5000);
                    } else if (msg.includes("queue is full") || isOOMError) {
                        // AUTO-RESUME LOGIC
                        logResilienceWithMetrics('warn', 'Emergency Throttle', {
                            Reason: isOOMError ? 'OOM' : 'Overload',
                            Concurrency: `ANY→ 1`,
                            Queue: queueRef.current.length
                        });

                        // Critical: Free VRAM and wait for confirmation
                        const unloadSuccess = await triggerVramUnload();

                        // 1. Throttle hard
                        setConcurrencyLimit(1);

                        // 2. Requeue current task
                        queueRef.current.unshift(task);

                        // 3. Pause temporarily
                        isPausedRef.current = true;
                        syncQueueStatus();

                        // 4. Trigger Resume Loop
                        const initialDelay = unloadSuccess ? 5000 : 15000;
                        setTimeout(() => attemptResume(), initialDelay);
                    } else {
                        // Get retry count for this task
                        const currentRetryCount = task.retryCount || 0;
                        const newRetryCount = currentRetryCount + 1;

                        // Check if we've exhausted retry attempts
                        if (newRetryCount >= MAX_RETRY_ATTEMPTS) {
                            // Permanent failure
                            console.error(`[Queue] ${task.fileName} failed after ${MAX_RETRY_ATTEMPTS} attempts.`);
                            task.permanentlyFailed = true;
                            updateNotification(task.id, {
                                status: 'error',
                                message: `Failed after ${MAX_RETRY_ATTEMPTS} attempts`
                            });

                            if (task.taskType === 'analysis' && task.data.image) {
                                const fail = {
                                    ...task.data.image,
                                    analysisFailed: true,
                                    analysisError: msg,
                                    permanentlyFailed: true
                                };
                                setImages(p => p.map(i => i.id === fail.id ? fail : i));
                                setAnalyzingIds(p => {
                                    const s = new Set(p);
                                    s.delete(fail.id);
                                    return s;
                                });
                                queuedAnalysisIds.current.delete(fail.id);
                            }
                        } else {
                            // Schedule retry
                            scheduleRetry(task, currentRetryCount);
                            const delayMinutes = Math.floor(RETRY_DELAY_MS / 60000);
                            updateNotification(task.id, {
                                status: 'warning',
                                message: `Retry ${newRetryCount}/${MAX_RETRY_ATTEMPTS} in ${delayMinutes}min...`
                            });

                            // Clean up state temporarily
                            if (task.taskType === 'analysis' && task.data.image) {
                                setAnalyzingIds(p => {
                                    const s = new Set(p);
                                    s.delete(task.data.image!.id);
                                    return s;
                                });
                            }
                        }

                        // Reset concurrency on error
                        if (!calibrationRef.current.isActive) setConcurrencyLimit(1);

                        // Auto-pause after consecutive errors
                        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
                            logResilienceWithMetrics('error', 'Max Errors Reached', {
                                Errors: consecutiveErrorsRef.current,
                                Action: 'Pausing',
                                Queue: queueRef.current.length
                            });
                            console.error(`[Queue] ${MAX_CONSECUTIVE_ERRORS} consecutive errors. Auto-pausing.`);

                            // Clear VRAM before pausing
                            await triggerVramUnload();

                            isPausedRef.current = true;
                            syncQueueStatus();

                            // Trigger auto-resume
                            setTimeout(() => attemptResume(), 10000);
                        }
                    }
                } finally {
                    activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);

                    // Log thread decrement
                    logResilienceWithMetrics('info', 'Thread Complete', {
                        Active: activeRequestsRef.current,
                        Limit: concurrencyLimit,
                        Queue: queueRef.current.length
                    });

                    const batchIds = new Set(currentBatch.map(t => t.id));
                    activeJobsRef.current = activeJobsRef.current.filter(j => !batchIds.has(j.id));

                    currentBatch.forEach(t => {
                        if (t.taskType === 'generate' || t.taskType === 'enhance')
                            queuedGenerationIds.current.delete(t.id);
                    });
                    syncQueueStatus();

                    // Recursive Trigger
                    if (processQueueRef.current) processQueueRef.current();
                }
            })();
        }

    }, [
        isPausedRef, activeRequestsRef, concurrencyLimit, queueRef, queuedAnalysisIds,
        activeJobsRef, executeAnalysis, executeGeneration, setConcurrencyLimit, settings,
        syncQueueStatus, updateNotification, setImages, setAnalyzingIds, queuedGenerationIds,
        getNextJob, isBatchMode, executeBatchAnalysis, optimalBatchSize, triggerVramUnload,
        logResilienceWithMetrics, consecutiveErrorsRef, MAX_CONSECUTIVE_ERRORS, attemptResume,
        scheduleRetry, MAX_RETRY_ATTEMPTS, RETRY_DELAY_MS, calibrationRef, processCalibrationStep,
        recordCalibrationMetrics, adjustConcurrency, lastResumeTimeRef
    ]);

    // Update ref whenever callback changes
    React.useEffect(() => {
        processQueueRef.current = processQueue;
    }, [processQueue]);

    // React to concurrency limit changes: If bandwidth opened up, process!
    React.useEffect(() => {
        if (!isPausedRef.current && queueRef.current.length > 0 && activeRequestsRef.current < concurrencyLimit) {
            processQueue();
        }
    }, [concurrencyLimit, processQueue, queueRef, activeRequestsRef, isPausedRef]);

    return {
        processQueue,
        startCalibration,
        stopCalibration,
        getCalibrationStatus,
        // Batch size calibration exports
        optimalBatchSize,
        batchSizeCalibrated,
        calibrateBatchSize,
        batchCalibrationInProgress
    };
};
