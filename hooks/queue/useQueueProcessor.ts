import React, { useCallback } from 'react';
import { QueueItem, ActiveJob, BenchmarkResult, CalibrationStatus } from '../../types/queue';
import { ImageInfo, AdminSettings, DevicePerformanceMetrics } from '../../types';

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
    syncQueueStatus: () => void;
    updateNotification: (id: string, updates: any) => void;
    setImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    setAnalyzingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    executeAnalysis: (item: QueueItem) => Promise<any>;
    executeGeneration: (item: QueueItem) => Promise<any>;
    isBatchMode: boolean;
    executeBatchAnalysis: (items: QueueItem[]) => Promise<void>;
    setResilienceLog: React.Dispatch<React.SetStateAction<{ timestamp: number, type: 'info' | 'warn' | 'error', message: string }[]>>;
}

export const useQueueProcessor = ({
    settings, queueRef, activeRequestsRef, activeJobsRef, isPausedRef, concurrencyLimit, setConcurrencyLimit,
    checkBackendHealthRef, queuedAnalysisIds, queuedGenerationIds, syncQueueStatus, updateNotification, setImages, setAnalyzingIds,
    executeAnalysis, executeGeneration, isBatchMode, executeBatchAnalysis, setResilienceLog
}: UseQueueProcessorProps) => {

    const processQueueRef = React.useRef<() => Promise<void>>();

    // Batch Size State (for VRAM-aware adaptive batching)
    // Batch Size State (for VRAM-aware adaptive batching)
    const [optimalBatchSize, setOptimalBatchSize] = React.useState<number>(4);
    const [batchSizeCalibrated, setBatchSizeCalibrated] = React.useState<boolean>(false);
    const batchCalibrationInProgress = React.useRef<boolean>(false);

    // Calibration State (for concurrency)
    const calibrationRef = React.useRef<any>({
        isActive: false, startConcurrency: 1, endConcurrency: 4, stepDurationMs: 10000,
        currentConcurrency: 1, startTime: 0, results: [], timeRemainingInStep: 0,
        completedSteps: new Set()
    });

    const metricsHistoryRef = React.useRef<{ vram: number[], tps: number[] }>({ vram: [], tps: [] });

    // Consecutive Error Tracking for Auto-Pause
    const consecutiveErrorsRef = React.useRef<number>(0);
    const MAX_CONSECUTIVE_ERRORS = 3;

    // Retry Queue Configuration
    const RETRY_DELAY_MS = 120000; // 120 seconds
    const MAX_RETRY_ATTEMPTS = 30;
    const retryQueueRef = React.useRef<Map<string, {
        item: QueueItem;
        retryTime: number;
        retryCount: number;
    }>>(new Map());

    // Auto-Resume Backoff Tracking
    const resumeAttemptsRef = React.useRef<number>(0);
    const lastResumeTimeRef = React.useRef<number>(0);

    // VRAM Polling State
    const lastVramPctRef = React.useRef<number | null>(null);

    // Resilience Logger
    const logResilience = useCallback((type: 'info' | 'warn' | 'error', message: string) => {
        setResilienceLog(prev => {
            const entry = { timestamp: Date.now(), type, message };
            return [entry, ...prev].slice(0, 50); // Keep last 50
        });
    }, [setResilienceLog]);

    // Enhanced Resilience Logger with Metrics
    const logResilienceWithMetrics = useCallback((
        type: 'info' | 'warn' | 'error',
        action: string,
        metrics?: Record<string, string | number>
    ) => {
        let message = `[${action.toUpperCase()}]`;

        if (metrics) {
            const metricStr = Object.entries(metrics)
                .map(([key, val]) => {
                    if (typeof val === 'number' && !Number.isInteger(val)) {
                        return `${key}=${val.toFixed(1)}`;
                    }
                    return `${key}=${val}`;
                })
                .join(', ');
            message += ` | ${metricStr}`;
        }

        logResilience(type, message);
    }, [logResilience]);


    // Force VRAM Cleanup
    const triggerVramUnload = useCallback(async (): Promise<boolean> => {
        try {
            logResilience('info', "Triggering emergency VRAM unload...");
            const res = await fetch('http://localhost:2020/v1/system/unload', { method: 'POST' });
            const data = await res.json();
            return data.status === 'success';
        } catch (e) {
            console.error("Failed to trigger VRAM unload", e);
            return false;
        }
    }, [logResilience]);

    // Batch Size Calibration Function
    const calibrateBatchSize = useCallback(async () => {
        if (batchCalibrationInProgress.current) {
            console.log("[Batch Calibration] Already in progress, skipping");
            return;
        }

        console.log("[Batch Calibration] Starting VRAM-aware batch size calibration");
        batchCalibrationInProgress.current = true;

        try {
            // Use moondream backend URL (hardcoded for now, will be configurable later)
            const baseUrl = 'http://localhost:2020';
            const testSizes = [4, 8, 16, 32, 64];

            const response = await fetch(`${baseUrl}/diagnostics/vram-test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batch_sizes: testSizes })
            });

            const data = await response.json();
            const results = data.results || [];

            // Find largest batch size where VRAM < 85% and success=true
            const safeResults = results.filter((r: any) => r.success && r.vramPercent < 85);

            if (safeResults.length > 0) {
                const optimal = Math.max(...safeResults.map((r: any) => r.batchSize));
                setOptimalBatchSize(optimal);
                setBatchSizeCalibrated(true);
                console.log(`[Batch Calibration] Optimal batch size: ${optimal} images (VRAM < 85%)`);
                console.log(`[Batch Calibration] Full results:`, results);
            } else {
                // Fall back to smallest safe size
                setOptimalBatchSize(4);
                setBatchSizeCalibrated(true);
                console.warn("[Batch Calibration] No safe batch sizes found, using default: 4");
            }
        } catch (error) {
            console.error("[Batch Calibration] Error:", error);
            setOptimalBatchSize(4); // Safe fallback
            setBatchSizeCalibrated(true);
        } finally {
            batchCalibrationInProgress.current = false;
        }
    }, [settings, batchCalibrationInProgress]);

    // Process Retry Queue - Re-queue items after delay
    const processRetryQueue = useCallback(() => {
        const now = Date.now();
        const toRetry: QueueItem[] = [];

        retryQueueRef.current.forEach((entry, id) => {
            if (entry.retryTime <= now) {
                console.log(`[Retry] Re-queuing ${entry.item.fileName} (attempt ${entry.retryCount}/${MAX_RETRY_ATTEMPTS})`);
                toRetry.push(entry.item);
                retryQueueRef.current.delete(id);
            }
        });

        if (toRetry.length > 0) {
            queueRef.current.push(...toRetry);
            syncQueueStatus();
            // Trigger processing for reactivated items
            if (processQueueRef.current) processQueueRef.current();
        }
    }, []);

    // Check retry queue every 10 seconds
    React.useEffect(() => {
        const interval = setInterval(processRetryQueue, 10000);
        return () => clearInterval(interval);
    }, [processRetryQueue]);

    const startCalibration = useCallback(() => {
        console.log("[Queue] Starting Calibration Mode");
        calibrationRef.current = {
            isActive: true,
            startTime: Date.now(),
            stepStartTime: Date.now(),
            currentConcurrency: 1,
            metrics: { vram: [], tps: [] },
            results: []
        };
        setConcurrencyLimit(1);
        syncQueueStatus();
        if (processQueueRef.current) processQueueRef.current();
    }, [setConcurrencyLimit, syncQueueStatus]);

    const stopCalibration = useCallback(() => {
        console.log("[Queue] Stopping Calibration Mode");
        calibrationRef.current.isActive = false;
        // Keep concurrency at the "Sweet Spot" (highest TPS) or fallback to calculated
        if (calibrationRef.current.results.length > 0) {
            const best = calibrationRef.current.results.reduce((prev, current) => (current.avgTPS > prev.avgTPS ? current : prev));
            console.log("[Queue] Calibration Complete. Best Concurrency:", best.concurrency, "TPS:", best.avgTPS);
            setConcurrencyLimit(best.concurrency);
        }
        syncQueueStatus();
    }, [setConcurrencyLimit, syncQueueStatus]);


    const getCalibrationStatus = useCallback((): CalibrationStatus | undefined => {
        if (!calibrationRef.current.isActive) return undefined;
        return {
            isActive: true,
            startTime: calibrationRef.current.startTime,
            currentConcurrency: calibrationRef.current.currentConcurrency,
            results: calibrationRef.current.results,
            timeRemainingInStep: Math.max(0, 60 - (Date.now() - calibrationRef.current.stepStartTime) / 1000)
        };
    }, []);

    // Helper: Smart Batching - Find next job that matches active task types to keep model hot
    const getNextJob = useCallback(() => {
        if (queueRef.current.length === 0) return null;

        // If no active jobs, take first
        if (activeJobsRef.current.length === 0) return queueRef.current.shift();

        // Try to find a job that matches ANY active job's type (Simple Smart Batching)
        // This is a naive heuristic: if Analysis is running, try to grab another Analysis.
        // We look at the most recently started job to be 'sticky'.
        const lastActiveParams = activeJobsRef.current[activeJobsRef.current.length - 1];
        if (!lastActiveParams) return queueRef.current.shift();

        const typeToMatch = lastActiveParams.taskType;
        const index = queueRef.current.findIndex(item => item.taskType === typeToMatch);

        if (index !== -1) {
            // Found a match!
            const [item] = queueRef.current.splice(index, 1);
            return item;
        }

        // No match found, fallback to FIFO
        return queueRef.current.shift();
    }, [queueRef, activeJobsRef]);


    const processQueue = useCallback(async () => {
        if (isPausedRef.current) return;

        // Prevent immediate retry if we just resumed (< 2 seconds ago)
        const timeSinceResume = Date.now() - lastResumeTimeRef.current;
        if (timeSinceResume > 0 && timeSinceResume < 2000) {
            console.log('[Queue] Recently resumed, scheduling check...');
            setTimeout(() => { if (processQueueRef.current) processQueueRef.current(); }, 2000 - timeSinceResume);
            return;
        }

        // --- Calibration Logic Loop ---
        if (calibrationRef.current.isActive) {
            const cal = calibrationRef.current;
            const dur = (Date.now() - cal.stepStartTime) / 1000;

            // Minimum 5 samples for accuracy
            const processed = cal.metrics.tps.length;
            if (processed >= 5) {
                const avgTPS = cal.metrics.tps.length ? cal.metrics.tps.reduce((a: number, b: number) => a + b, 0) / cal.metrics.tps.length : 0;
                const maxVRAM = cal.metrics.vram.length ? Math.max(...cal.metrics.vram) : 0;

                console.log(`[Calibration] Step ${cal.currentConcurrency} Done. TPS: ${avgTPS.toFixed(2)}, VRAM: ${maxVRAM.toFixed(0)}%`);

                cal.results.push({
                    concurrency: cal.currentConcurrency,
                    avgTPS,
                    maxVRAM,
                    totalProcessed: processed,
                    timestamp: Date.now()
                });

                // Predictive OOM Check
                let predictedNextVRAM = maxVRAM;
                if (cal.results.length >= 2) {
                    const prev = cal.results[cal.results.length - 2];
                    const delta = maxVRAM - prev.maxVRAM;
                    // Linear extrapolation for next step
                    predictedNextVRAM = maxVRAM + Math.max(0, delta);
                    console.log(`[Calibration] VRAM Delta: +${delta.toFixed(1)}%. Predicted Next: ${predictedNextVRAM.toFixed(1)}%`);
                }

                // Next Step Decision
                // Stop if current is unsafe OR next is predicted unsafe OR empty queue
                if (maxVRAM > 90 || predictedNextVRAM > 95 || queueRef.current.length === 0) {
                    // If we hit unsafe levels, maybe step back one for safety
                    if (maxVRAM > 92 && cal.currentConcurrency > 1) {
                        console.log("[Calibration] Current step unsafe. Reverting to previous concurrency.");
                        cal.results.pop(); // Remove unsafe result
                    }
                    stopCalibration();
                    return;
                } else {
                    cal.currentConcurrency++;
                    cal.stepStartTime = Date.now();
                    cal.metrics = { vram: [], tps: [] }; // Reset metrics
                    setConcurrencyLimit(cal.currentConcurrency);
                }
            }
        }
        // ------------------------------

        const effectiveConcurrency = calibrationRef.current.isActive ? calibrationRef.current.currentConcurrency : concurrencyLimit;

        if (activeRequestsRef.current >= effectiveConcurrency) return;

        while (activeRequestsRef.current < effectiveConcurrency && queueRef.current.length > 0) {

            const task = getNextJob(); // Use Smart Batching
            if (!task) { syncQueueStatus(); break; }

            // --- BATCH MODE LOGIC ---
            // If batch mode is ON and task is 'analysis', try to grab more
            // Use VRAM-calibrated batch size (defaults to 4 if not calibrated)
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

            activeRequestsRef.current++; // Batch counts as 1 concurrent request for simplicity (single GPU op)

            // Log thread increment
            logResilienceWithMetrics('info', 'Thread Start', {
                Active: activeRequestsRef.current,
                Limit: concurrencyLimit,
                Queue: queueRef.current.length
            });

            // Mark all as active
            currentBatch.forEach(t => {
                activeJobsRef.current.push({ id: t.id, fileName: t.fileName, size: t.data.image?.dataUrl.length || 0, startTime: Date.now(), taskType: t.taskType });
            });
            syncQueueStatus();

            syncQueueStatus();

            // EXECUTE
            (async () => {
                try {
                    // Log job start with queue state
                    logResilienceWithMetrics('info', 'Job Start', {
                        Type: task.taskType,
                        Batch: currentBatch.length,
                        Active: activeJobsRef.current.length,
                        Concurrency: `${activeRequestsRef.current}/${concurrencyLimit}`,
                        Queue: queueRef.current.length
                    });

                    const jobStartTime = Date.now();
                    let metrics: DevicePerformanceMetrics | undefined;

                    if (currentBatch.length > 1 && task.taskType === 'analysis') {
                        // BATCH EXECUTION
                        await executeBatchAnalysis(currentBatch);
                        // Metrics approximation?
                    } else {
                        // SINGLE EXECUTION (Loop if we somehow grabbed multiple non-analysis or single analysis)
                        for (const t of currentBatch) {
                            if (t.taskType === 'analysis') metrics = await executeAnalysis(t);
                            else if (t.taskType === 'generate') metrics = await executeGeneration(t);

                            // Low VRAM Mode: Unload after EACH image (not after entire batch)
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

                    // Log job completion with performance metrics
                    if (metrics) {
                        const duration = (Date.now() - jobStartTime) / 1000;
                        logResilienceWithMetrics('info', 'Job Complete', {
                            Type: task.taskType,
                            Duration: `${duration.toFixed(1)}s`,
                            VRAM: `${metrics.vramUsagePercent?.toFixed(0)}%`,
                            TPS: metrics.tokensPerSecond?.toFixed(1) || 'N/A',
                            Queue: queueRef.current.length
                        });
                    }

                    if (metrics) {
                        const { vramUsagePercent, tokensPerSecond } = metrics;

                        // Calibration Recording
                        if (calibrationRef.current.isActive) {
                            if (vramUsagePercent) calibrationRef.current.metrics.vram.push(vramUsagePercent);
                            if (tokensPerSecond) calibrationRef.current.metrics.tps.push(tokensPerSecond);
                        }

                        // Normal Adaptive Logic (Only if NOT calibrating)
                        if (!calibrationRef.current.isActive) {

                            // Update Rolling History (keep last 5)
                            if (vramUsagePercent) {
                                metricsHistoryRef.current.vram.unshift(vramUsagePercent);
                                if (metricsHistoryRef.current.vram.length > 5) metricsHistoryRef.current.vram.pop();
                            }
                            if (tokensPerSecond) {
                                metricsHistoryRef.current.tps.unshift(tokensPerSecond);
                                if (metricsHistoryRef.current.tps.length > 5) metricsHistoryRef.current.tps.pop();
                            }

                            // 1. High VRAM Pressure (>90%) -> Aggressive Step Down
                            if (vramUsagePercent && vramUsagePercent > 90) {
                                if (concurrencyLimit > 1) {
                                    logResilienceWithMetrics('warn', 'VRAM Pressure', {
                                        VRAM: `${vramUsagePercent.toFixed(1)}%`,
                                        Action: `Concurrency ${concurrencyLimit}→${concurrencyLimit - 1}`,
                                        Queue: queueRef.current.length
                                    });
                                    setConcurrencyLimit(p => Math.max(1, p - 1));
                                }
                            }
                            // 2. Low TPS (Struggling Provider) -> Step Down
                            // Threshold depends on model, but < 2 tokens/sec is generally bad for vision/gen
                            else if (tokensPerSecond && tokensPerSecond < 2.0 && concurrencyLimit > 1) {
                                logResilienceWithMetrics('warn', 'Low TPS', {
                                    TPS: tokensPerSecond.toFixed(1),
                                    Action: `Concurrency ${concurrencyLimit}→${concurrencyLimit - 1}`,
                                    Queue: queueRef.current.length
                                });
                                setConcurrencyLimit(p => Math.max(1, p - 1));
                            }
                            // 3. Recovery / Step Up
                            // If VRAM < 80% AND TPS > 5 AND Queue > 0 -> Slowly try to increase
                            else if ((vramUsagePercent || 0) < 80 && (tokensPerSecond || 10) > 5 && queueRef.current.length > 2) {
                                // Only if we haven't increased recently (debouncing logic omitted for simplicity, relying on react updates)
                                if (concurrencyLimit < 4) { // Cap adaptive auto-scale at 4 safely
                                    logResilienceWithMetrics('info', 'Scale Up', {
                                        VRAM: `${vramUsagePercent}%`,
                                        TPS: tokensPerSecond.toFixed(1),
                                        Action: `Concurrency ${concurrencyLimit}→${concurrencyLimit + 1}`,
                                        Queue: queueRef.current.length
                                    });
                                    setConcurrencyLimit(p => Math.min(p + 1, 4));
                                }
                            }
                        }
                    } else {
                        // Fallback simple scaling if no metrics (Legacy) & NOT Calibrating
                        if (!calibrationRef.current.isActive && concurrencyLimit < 3) setConcurrencyLimit(p => Math.min(p + 1, 3));
                    }

                } catch (err: any) {
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

                    // 4. Auto-Resume Logic with VRAM Check
                    const attemptResume = async () => {
                        if (!isPausedRef.current) return;

                        try {
                            // Check VRAM status via Models endpoint (lightweight)
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 3000);
                            const res = await fetch('http://127.0.0.1:2020/v1/models', { signal: controller.signal });
                            clearTimeout(timeoutId);

                            const usedStr = res.headers.get('X-VRAM-Used');
                            const totalStr = res.headers.get('X-VRAM-Total');

                            if (usedStr && totalStr) {
                                const used = parseInt(usedStr);
                                const total = parseInt(totalStr);
                                const pct = (used / total) * 100;

                                // User requested relaxation: Only blocking if literally full (approx 100%)
                                if (pct > 99) {
                                    // Exponential backoff: 5s, 10s, 20s, 40s, max 60s
                                    const attempt = resumeAttemptsRef.current;
                                    const delay = Math.min(5000 * Math.pow(2, attempt), 60000);
                                    resumeAttemptsRef.current++;
                                    logResilienceWithMetrics('warn', 'Resume Delayed', {
                                        VRAM: `${pct.toFixed(1)}%`,
                                        Attempt: attempt + 1,
                                        NextRetry: `${delay / 1000}s`,
                                        Queue: queueRef.current.length
                                    });
                                    setTimeout(attemptResume, delay);
                                    return;
                                }
                            }

                            const vramPct = usedStr && totalStr ? ((parseInt(usedStr) / parseInt(totalStr)) * 100).toFixed(0) : 'N/A';
                            logResilienceWithMetrics('info', 'Queue Resumed', {
                                VRAM: `${vramPct}%`,
                                AfterAttempts: resumeAttemptsRef.current,
                                Queue: queueRef.current.length
                            });
                            console.log("[Queue] VRAM levels nominal. Auto-resuming queue...");
                            isPausedRef.current = false;
                            consecutiveErrorsRef.current = 0;
                            resumeAttemptsRef.current = 0; // Reset backoff on successful resume
                            lastResumeTimeRef.current = Date.now();
                            syncQueueStatus();
                            if (processQueueRef.current) processQueueRef.current();

                        } catch (e) {
                            // If backend is unreachable, keep waiting
                            logResilience('error', "Backend unreachable during VRAM check. Extending cooldown...");
                            console.error("[Queue] Backend unreachable. Extending cooldown...");
                            setTimeout(attemptResume, 5000);
                        }
                    };

                    // OOM Error Handling: Reduce batch size and re-queue
                    if (isOOMError && currentBatch.length > 1) {
                        const newBatchSize = Math.max(1, Math.floor(optimalBatchSize / 2));
                        logResilienceWithMetrics('error', 'OOM Detected', {
                            BatchSize: currentBatch.length,
                            Reducing: `${optimalBatchSize}→${newBatchSize}`,
                            Queue: queueRef.current.length,
                            VRAM: 'Critical'
                        });
                        setOptimalBatchSize(newBatchSize);
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
                        setTimeout(attemptResume, 5000);
                    } else if (msg.includes("queue is full") || isOOMError) {
                        // AUTO-RESUME LOGIC
                        const newBatchSize = Math.max(1, Math.floor(optimalBatchSize / 2));
                        logResilienceWithMetrics('warn', 'Emergency Throttle', {
                            Reason: isOOMError ? 'OOM' : 'Overload',
                            Concurrency: `ANY→ 1`,
                            BatchSize: `${optimalBatchSize}→${newBatchSize}`,
                            Queue: queueRef.current.length
                        });

                        // Critical: Free VRAM and wait for confirmation
                        const unloadSuccess = await triggerVramUnload();

                        // 1. Throttle hard
                        setConcurrencyLimit(1);
                        setOptimalBatchSize(newBatchSize);

                        // 2. Requeue current task
                        queueRef.current.unshift(task);

                        // 3. Pause temporarily
                        isPausedRef.current = true;
                        syncQueueStatus();

                        // 4. Trigger Resume Loop with adaptive initial delay
                        resumeAttemptsRef.current = 0; // Reset backoff counter
                        const initialDelay = unloadSuccess ? 5000 : 15000; // Longer delay if unload failed
                        setTimeout(attemptResume, initialDelay);
                    } else {
                        // Get retry count for this task
                        const currentRetryCount = task.retryCount || 0;
                        const newRetryCount = currentRetryCount + 1;

                        // Check if we've exhausted retry attempts
                        if (newRetryCount >= MAX_RETRY_ATTEMPTS) {
                            // Permanent failure after 30 attempts
                            console.error(`[Queue] ${task.fileName} failed after ${MAX_RETRY_ATTEMPTS} attempts. Marking as permanently failed.`);
                            task.permanentlyFailed = true;
                            updateNotification(task.id, { status: 'error', message: `Failed after ${MAX_RETRY_ATTEMPTS} attempts` });

                            if (task.taskType === 'analysis' && task.data.image) {
                                const fail = { ...task.data.image, analysisFailed: true, analysisError: msg, permanentlyFailed: true };
                                setImages(p => p.map(i => i.id === fail.id ? fail : i));
                                setAnalyzingIds(p => { const s = new Set(p); s.delete(fail.id); return s; });
                                queuedAnalysisIds.current.delete(fail.id);
                            }
                        } else {
                            // Schedule retry after delay
                            const retryTime = Date.now() + RETRY_DELAY_MS;
                            task.retryCount = newRetryCount;
                            task.nextRetryTime = retryTime;

                            retryQueueRef.current.set(task.id, {
                                item: task,
                                retryTime,
                                retryCount: newRetryCount
                            });

                            const delayMinutes = Math.floor(RETRY_DELAY_MS / 60000);
                            console.log(`[Queue] ${task.fileName} scheduled for retry ${newRetryCount}/${MAX_RETRY_ATTEMPTS} in ${delayMinutes}m`);
                            updateNotification(task.id, {
                                status: 'warning',
                                message: `Retry ${newRetryCount}/${MAX_RETRY_ATTEMPTS} in ${delayMinutes}min...`
                            });

                            // Clean up state temporarily (will restore on retry)
                            if (task.taskType === 'analysis' && task.data.image) {
                                setAnalyzingIds(p => { const s = new Set(p); s.delete(task.data.image!.id); return s; });
                            }
                        }

                        // Reset concurrency on error (but not fatal)
                        if (!calibrationRef.current.isActive) setConcurrencyLimit(1);

                        // Auto-pause after consecutive errors
                        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
                            logResilienceWithMetrics('error', 'Max Errors Reached', {
                                Errors: consecutiveErrorsRef.current,
                                Action: 'Pausing',
                                Queue: queueRef.current.length
                            });
                            console.error(`[Queue] ${MAX_CONSECUTIVE_ERRORS} consecutive errors detected. Auto-pausing queue.`);

                            // Clear VRAM before pausing to aid recovery
                            await triggerVramUnload();

                            isPausedRef.current = true;
                            syncQueueStatus();

                            // CRITICAL FIX: Trigger auto-resume instead of permanent pause
                            resumeAttemptsRef.current = 0;
                            setTimeout(attemptResume, 10000); // 10s initial delay for error recovery
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
                        if (t.taskType === 'generate') queuedGenerationIds.current.delete(t.id);
                    });
                    syncQueueStatus();

                    // Recursive Trigger
                    if (processQueueRef.current) processQueueRef.current();
                }
            })();
        }

    }, [isPausedRef, activeRequestsRef, concurrencyLimit, queueRef, queuedAnalysisIds, activeJobsRef, executeAnalysis, executeGeneration, setConcurrencyLimit, settings, syncQueueStatus, updateNotification, setImages, setAnalyzingIds, queuedGenerationIds, getNextJob, stopCalibration, isBatchMode, executeBatchAnalysis]); // Added dependencies

    // Update ref whenever callback changes
    React.useEffect(() => { processQueueRef.current = processQueue; }, [processQueue]);

    // Periodic VRAM Polling (every 3s during active processing)
    React.useEffect(() => {
        console.log('[VRAM Poll] Effect started - setting up polling interval');
        logResilience('info', '[VRAM Poll] Starting periodic VRAM monitoring');

        const pollVRAM = async () => {
            console.log('[VRAM Poll] Poll attempt starting...');

            try {
                console.log('[VRAM Poll] Fetching from http://127.0.0.1:2020/v1/models');
                const res = await fetch('http://127.0.0.1:2020/v1/models');
                console.log('[VRAM Poll] Fetch completed, status:', res.status);

                const used = res.headers.get('X-VRAM-Used');
                const total = res.headers.get('X-VRAM-Total');
                console.log('[VRAM Poll] Headers:', { used, total });

                if (used && total) {
                    const pct = (parseInt(used) / parseInt(total)) * 100;
                    console.log('[VRAM Poll] Calculated %:', pct);

                    // Only log significant changes (>10% delta) or first reading
                    if (!lastVramPctRef.current || Math.abs(pct - lastVramPctRef.current) > 10) {
                        logResilienceWithMetrics('info', 'VRAM Status', {
                            VRAM: `${pct.toFixed(0)}%`,
                            Used: `${used}MB`,
                            Total: `${total}MB`,
                            Active: activeRequestsRef.current,
                            Queue: queueRef.current.length
                        });
                        lastVramPctRef.current = pct;
                    }
                } else {
                    logResilience('warn', '[VRAM Poll] Headers missing: X-VRAM-Used or X-VRAM-Total');
                }
            } catch (e: any) {
                console.error('[VRAM Poll] Error:', e);
                logResilience('error', `[VRAM Poll] Failed: ${e.message}`);
            }
        };

        const interval = setInterval(pollVRAM, 3000); // Every 3s
        pollVRAM(); // Initial poll
        console.log('[VRAM Poll] Interval set, initial poll triggered');

        return () => {
            console.log('[VRAM Poll] Effect cleanup - clearing interval');
            clearInterval(interval);
        };
    }, []); // Empty deps - runs throughout component lifecycle

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
