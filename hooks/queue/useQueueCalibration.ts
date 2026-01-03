import React, { useRef, useCallback } from 'react';
import { CalibrationStatus, BenchmarkResult } from '../../types/queue';

/**
 * Hook for concurrency calibration
 * Manages calibration mode, metrics collection, and optimal concurrency calculation
 */

interface UseQueueCalibrationProps {
    queueRef: React.MutableRefObject<any[]>;
    concurrencyLimit: number;
    setConcurrencyLimit: React.Dispatch<React.SetStateAction<number>>;
    syncQueueStatus: () => void;
    processQueueRef: React.MutableRefObject<(() => Promise<void>) | undefined>;
}

export const useQueueCalibration = ({
    queueRef,
    concurrencyLimit,
    setConcurrencyLimit,
    syncQueueStatus,
    processQueueRef
}: UseQueueCalibrationProps) => {

    // Calibration State
    const calibrationRef = useRef<any>({
        isActive: false,
        startConcurrency: 1,
        endConcurrency: 4,
        stepDurationMs: 10000,
        currentConcurrency: 1,
        startTime: 0,
        results: [],
        timeRemainingInStep: 0,
        completedSteps: new Set()
    });

    const metricsHistoryRef = useRef<{ vram: number[], tps: number[] }>({ vram: [], tps: [] });

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
    }, [setConcurrencyLimit, syncQueueStatus, processQueueRef]);

    const stopCalibration = useCallback(() => {
        console.log("[Queue] Stopping Calibration Mode");
        calibrationRef.current.isActive = false;
        // Keep concurrency at the "Sweet Spot" (highest TPS) or fallback to calculated
        if (calibrationRef.current.results.length > 0) {
            const best = calibrationRef.current.results.reduce((prev: any, current: any) =>
                (current.avgTPS > prev.avgTPS ? current : prev)
            );
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

    // Record metrics during calibration
    const recordCalibrationMetrics = useCallback((vramPercent?: number, tokensPerSecond?: number) => {
        if (calibrationRef.current.isActive) {
            if (vramPercent) calibrationRef.current.metrics.vram.push(vramPercent);
            if (tokensPerSecond) calibrationRef.current.metrics.tps.push(tokensPerSecond);
        }
    }, []);

    // Process calibration step (called from main processQueue)
    const processCalibrationStep = useCallback(() => {
        if (!calibrationRef.current.isActive) return null;

        const cal = calibrationRef.current;
        const processed = cal.metrics.tps.length;

        // Minimum 5 samples for accuracy
        if (processed >= 5) {
            const avgTPS = cal.metrics.tps.length
                ? cal.metrics.tps.reduce((a: number, b: number) => a + b, 0) / cal.metrics.tps.length
                : 0;
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
                return { shouldStop: true };
            } else {
                cal.currentConcurrency++;
                cal.stepStartTime = Date.now();
                cal.metrics = { vram: [], tps: [] }; // Reset metrics
                setConcurrencyLimit(cal.currentConcurrency);
                return { shouldContinue: true, newConcurrency: cal.currentConcurrency };
            }
        }

        return null;
    }, [queueRef, stopCalibration, setConcurrencyLimit]);

    return {
        calibrationRef,
        metricsHistoryRef,
        startCalibration,
        stopCalibration,
        getCalibrationStatus,
        recordCalibrationMetrics,
        processCalibrationStep
    };
};
