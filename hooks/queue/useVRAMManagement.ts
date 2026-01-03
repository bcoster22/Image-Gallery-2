import React, { useCallback, useState, useRef, useEffect } from 'react';
import { AdminSettings } from '../../types';

/**
 * Hook for VRAM monitoring and management
 * Handles VRAM polling, cleanup, and batch size calibration
 */

interface UseVRAMManagementProps {
    settings: AdminSettings | null;
    activeRequestsRef: React.MutableRefObject<number>;
    queueRef: React.MutableRefObject<any[]>;
    logResilience: (type: 'info' | 'warn' | 'error', message: string) => void;
    logResilienceWithMetrics: (
        type: 'info' | 'warn' | 'error',
        action: string,
        metrics?: Record<string, string | number>
    ) => void;
}

export const useVRAMManagement = ({
    settings,
    activeRequestsRef,
    queueRef,
    logResilience,
    logResilienceWithMetrics
}: UseVRAMManagementProps) => {

    // Batch Size State (for VRAM-aware adaptive batching)
    const [optimalBatchSize, setOptimalBatchSize] = useState<number>(4);
    const [batchSizeCalibrated, setBatchSizeCalibrated] = useState<boolean>(false);
    const batchCalibrationInProgress = useRef<boolean>(false);

    // VRAM Polling State
    const lastVramPctRef = useRef<number | null>(null);

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

    // Periodic VRAM Polling (every 3s during active processing)
    useEffect(() => {
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
        optimalBatchSize,
        batchSizeCalibrated,
        calibrateBatchSize,
        batchCalibrationInProgress,
        triggerVramUnload,
        lastVramPctRef
    };
};
