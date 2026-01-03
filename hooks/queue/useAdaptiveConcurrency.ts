import React, { useCallback, useRef } from 'react';
import { QueueItem, ActiveJob } from '../../types/queue';
import { DevicePerformanceMetrics } from '../../types';

/**
 * Hook for adaptive concurrency management
 * Handles dynamic scaling based on VRAM and TPS metrics, plus smart batching
 */

interface UseAdaptiveConcurrencyProps {
    queueRef: React.MutableRefObject<QueueItem[]>;
    activeJobsRef: React.MutableRefObject<ActiveJob[]>;
    concurrencyLimit: number;
    setConcurrencyLimit: React.Dispatch<React.SetStateAction<number>>;
    calibrationRef: React.MutableRefObject<any>;
    metricsHistoryRef: React.MutableRefObject<{ vram: number[], tps: number[] }>;
    logResilienceWithMetrics: (
        type: 'info' | 'warn' | 'error',
        action: string,
        metrics?: Record<string, string | number>
    ) => void;
}

export const useAdaptiveConcurrency = ({
    queueRef,
    activeJobsRef,
    concurrencyLimit,
    setConcurrencyLimit,
    calibrationRef,
    metricsHistoryRef,
    logResilienceWithMetrics
}: UseAdaptiveConcurrencyProps) => {

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

    // Adjust concurrency based on performance metrics
    const adjustConcurrency = useCallback((metrics?: DevicePerformanceMetrics) => {
        // Skip adjustments during calibration
        if (calibrationRef.current.isActive) return;

        if (metrics) {
            const { vramUsagePercent, tokensPerSecond } = metrics;

            // Update Rolling History (keep last 5)
            if (vramUsagePercent) {
                metricsHistoryRef.current.vram.unshift(vramUsagePercent);
                if (metricsHistoryRef.current.vram.length > 5)
                    metricsHistoryRef.current.vram.pop();
            }
            if (tokensPerSecond) {
                metricsHistoryRef.current.tps.unshift(tokensPerSecond);
                if (metricsHistoryRef.current.tps.length > 5)
                    metricsHistoryRef.current.tps.pop();
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
        } else {
            // Fallback simple scaling if no metrics (Legacy) & NOT Calibrating
            if (!calibrationRef.current.isActive && concurrencyLimit < 3)
                setConcurrencyLimit(p => Math.min(p + 1, 3));
        }
    }, [
        concurrencyLimit,
        setConcurrencyLimit,
        calibrationRef,
        metricsHistoryRef,
        queueRef,
        logResilienceWithMetrics
    ]);

    return {
        getNextJob,
        adjustConcurrency
    };
};
