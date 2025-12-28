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
    executeAnalysis: (task: QueueItem) => Promise<DevicePerformanceMetrics | undefined>;
    executeGeneration: (task: QueueItem) => Promise<DevicePerformanceMetrics | undefined>;
    isBatchMode: boolean;
    executeBatchAnalysis: (tasks: QueueItem[]) => Promise<void>;
}

export const useQueueProcessor = ({
    settings, queueRef, activeRequestsRef, activeJobsRef, isPausedRef, concurrencyLimit, setConcurrencyLimit,
    checkBackendHealthRef, queuedAnalysisIds, queuedGenerationIds, syncQueueStatus, updateNotification, setImages, setAnalyzingIds,
    executeAnalysis, executeGeneration, isBatchMode, executeBatchAnalysis
}: UseQueueProcessorProps) => {

    const processQueueRef = React.useRef<() => Promise<void>>();

    // Batch Size State (for VRAM-aware adaptive batching)
    const [optimalBatchSize, setOptimalBatchSize] = React.useState<number>(4);
    const [batchSizeCalibrated, setBatchSizeCalibrated] = React.useState<boolean>(false);
    const [batchCalibrationInProgress, setBatchCalibrationInProgress] = React.useState<boolean>(false);

    // Calibration State (for concurrency)
    const calibrationRef = React.useRef<{
        isActive: boolean;
        startTime: number;
        stepStartTime: number;
        currentConcurrency: number;
        metrics: { vram: number[], tps: number[] };
        results: BenchmarkResult[];
    }>({
        isActive: false, startTime: 0, stepStartTime: 0, currentConcurrency: 0,
        metrics: { vram: [], tps: [] }, results: []
    });

    const metricsHistoryRef = React.useRef<{ vram: number[], tps: number[] }>({ vram: [], tps: [] });

    // Batch Size Calibration Function
    const calibrateBatchSize = useCallback(async () => {
        if (batchCalibrationInProgress) {
            console.log("[Batch Calibration] Already in progress, skipping");
            return;
        }

        console.log("[Batch Calibration] Starting VRAM-aware batch size calibration");
        setBatchCalibrationInProgress(true);

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
            setBatchCalibrationInProgress(false);
        }
    }, [settings, batchCalibrationInProgress]);

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

        // --- Calibration Logic Loop ---
        if (calibrationRef.current.isActive) {
            const cal = calibrationRef.current;
            const dur = (Date.now() - cal.stepStartTime) / 1000;

            if (dur > 60) {
                // Step Complete
                const avgTPS = cal.metrics.tps.length ? cal.metrics.tps.reduce((a, b) => a + b, 0) / cal.metrics.tps.length : 0;
                const maxVRAM = cal.metrics.vram.length ? Math.max(...cal.metrics.vram) : 0;
                const processed = cal.metrics.tps.length; // Approximation

                console.log(`[Calibration] Step ${cal.currentConcurrency} Done. TPS: ${avgTPS.toFixed(2)}, VRAM: ${maxVRAM.toFixed(0)}%`);

                cal.results.push({
                    concurrency: cal.currentConcurrency,
                    avgTPS,
                    maxVRAM,
                    totalProcessed: processed,
                    timestamp: Date.now()
                });

                // Next Step Decision
                if (maxVRAM > 95 || queueRef.current.length === 0) {
                    stopCalibration(); // Stop if unsafe or empty
                    return;
                } else {
                    cal.currentConcurrency++;
                    cal.stepStartTime = Date.now();
                    cal.metrics = { vram: [], tps: [] }; // Reset metrics for next step
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

            // Mark all as active
            currentBatch.forEach(t => {
                activeJobsRef.current.push({ id: t.id, fileName: t.fileName, size: t.data.image?.dataUrl.length || 0, startTime: Date.now(), taskType: t.taskType });
            });
            syncQueueStatus();

            syncQueueStatus();

            // EXECUTE
            (async () => {
                try {
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
                        }
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

                            // Decision Logic
                            // 1. High VRAM Pressure (>90%) -> Aggressive Step Down
                            if (vramUsagePercent && vramUsagePercent > 90) {
                                if (concurrencyLimit > 1) {
                                    console.warn(`[Adaptive Queue] High VRAM (${vramUsagePercent.toFixed(1)}%). Reducing concurrency.`);
                                    setConcurrencyLimit(p => Math.max(1, p - 1));
                                }
                            }
                            // 2. Low TPS (Struggling Provider) -> Step Down
                            // Threshold depends on model, but < 2 tokens/sec is generally bad for vision/gen
                            else if (tokensPerSecond && tokensPerSecond < 2.0 && concurrencyLimit > 1) {
                                console.warn(`[Adaptive Queue] Low TPS (${tokensPerSecond.toFixed(1)}). Reducing concurrency.`);
                                setConcurrencyLimit(p => Math.max(1, p - 1));
                            }
                            // 3. Recovery / Step Up
                            // If VRAM < 80% AND TPS > 5 AND Queue > 0 -> Slowly try to increase
                            else if ((vramUsagePercent || 0) < 80 && (tokensPerSecond || 10) > 5 && queueRef.current.length > 2) {
                                // Only if we haven't increased recently (debouncing logic omitted for simplicity, relying on react updates)
                                if (concurrencyLimit < 4) { // Cap adaptive auto-scale at 4 safely
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

                    // OOM Error Handling: Reduce batch size and re-queue
                    if (isOOMError && currentBatch.length > 1) {
                        console.error(`[Queue] OOM Error with batch size ${currentBatch.length}. Reducing batch size.`);

                        // Reduce optimal batch size by half
                        const newBatchSize = Math.max(1, Math.floor(optimalBatchSize / 2));
                        console.warn(`[Queue] Reducing batch size from ${optimalBatchSize} to ${newBatchSize}`);
                        setOptimalBatchSize(newBatchSize);

                        // Re-queue failed tasks to front of queue for retry
                        queueRef.current.unshift(...currentBatch);
                        console.log(`[Queue] Re-queued ${currentBatch.length} tasks for retry with smaller batch`);

                        // Don't mark as failed - they'll retry
                        syncQueueStatus();
                    }
                    // Connection Error Handling
                    else if (isConnError && settings?.resilience?.pauseOnLocalFailure) {
                        isPausedRef.current = true;
                        queueRef.current.unshift(task);
                    } else if (msg.includes("queue is full")) {
                        isPausedRef.current = true;
                        queueRef.current.unshift(task);
                        setConcurrencyLimit(p => Math.max(1, Math.floor(p / 2)));
                    } else {
                        updateNotification(task.id, { status: 'error', message: `Failed: ${task.fileName}` });
                        if (!calibrationRef.current.isActive) setConcurrencyLimit(1); // Only reset on error if not calibrating (maybe?)
                        // If calibrating, we might want to fail the step? For now, proceed.

                        if (task.taskType === 'analysis' && task.data.image) {
                            const fail = { ...task.data.image, analysisFailed: true, analysisError: msg };
                            setImages(p => p.map(i => i.id === fail.id ? fail : i));
                            setAnalyzingIds(p => { const s = new Set(p); s.delete(fail.id); return s; });
                            queuedAnalysisIds.current.delete(fail.id);
                        }
                    }
                } finally {
                    activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
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
