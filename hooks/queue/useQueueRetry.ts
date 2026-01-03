import React, { useRef, useCallback, useEffect } from 'react';
import { QueueItem } from '../../types/queue';

/**
 * Hook for retry queue management and auto-resume logic
 * Handles failed job recovery and exponential backoff
 */

interface UseQueueRetryProps {
    queueRef: React.MutableRefObject<QueueItem[]>;
    isPausedRef: React.MutableRefObject<boolean>;
    syncQueueStatus: () => void;
    processQueueRef: React.MutableRefObject<(() => Promise<void>) | undefined>;
    logResilience: (type: 'info' | 'warn' | 'error', message: string) => void;
    logResilienceWithMetrics: (
        type: 'info' | 'warn' | 'error',
        action: string,
        metrics?: Record<string, string | number>
    ) => void;
    retryQueueRef: React.MutableRefObject<Map<string, {
        item: QueueItem;
        retryTime: number;
        retryCount: number;
    }>>;
}

export const useQueueRetry = ({
    queueRef,
    isPausedRef,
    syncQueueStatus,
    processQueueRef,
    logResilience,
    logResilienceWithMetrics,
    retryQueueRef
}: UseQueueRetryProps) => {

    // Retry Queue Configuration
    const RETRY_DELAY_MS = 120000; // 120 seconds
    const MAX_RETRY_ATTEMPTS = 30;

    // Consecutive Error Tracking for Auto-Pause
    const consecutiveErrorsRef = useRef<number>(0);
    const MAX_CONSECUTIVE_ERRORS = 3;

    // Auto-Resume Backoff Tracking
    const resumeAttemptsRef = useRef<number>(0);
    const lastResumeTimeRef = useRef<number>(0);

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
    }, [queueRef, syncQueueStatus, processQueueRef]);

    // Check retry queue every 10 seconds
    useEffect(() => {
        const interval = setInterval(processRetryQueue, 10000);
        return () => clearInterval(interval);
    }, [processRetryQueue]);

    // Auto-Resume Logic with VRAM Check
    const attemptResume = useCallback(async () => {
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
    }, [isPausedRef, queueRef, syncQueueStatus, processQueueRef, logResilience, logResilienceWithMetrics]);

    // Schedule a job for retry
    const scheduleRetry = useCallback((task: QueueItem, currentRetryCount: number) => {
        const retryTime = Date.now() + RETRY_DELAY_MS;
        task.retryCount = currentRetryCount + 1;
        task.nextRetryTime = retryTime;

        retryQueueRef.current.set(task.id, {
            item: task,
            retryTime,
            retryCount: currentRetryCount + 1
        });

        const delayMinutes = Math.floor(RETRY_DELAY_MS / 60000);
        console.log(`[Queue] ${task.fileName} scheduled for retry ${currentRetryCount + 1}/${MAX_RETRY_ATTEMPTS} in ${delayMinutes}m`);
    }, []);

    return {
        retryQueueRef,
        consecutiveErrorsRef,
        MAX_CONSECUTIVE_ERRORS,
        resumeAttemptsRef,
        lastResumeTimeRef,
        processRetryQueue,
        attemptResume,
        scheduleRetry,
        MAX_RETRY_ATTEMPTS,
        RETRY_DELAY_MS
    };
};
