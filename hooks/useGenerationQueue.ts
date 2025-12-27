import { useState, useRef, useCallback } from 'react';
import { QueueItem, QueueStatus, ActiveJob } from '../types';

interface UseGenerationQueueProps {
    processTask: (task: QueueItem) => Promise<void>;
    shouldProcess?: (task: QueueItem) => boolean;
    onTaskSuccess?: (task: QueueItem) => void;
    onTaskError?: (task: QueueItem, error: any) => void;
}

export const useGenerationQueue = ({
    processTask,
    shouldProcess,
    onTaskSuccess,
    onTaskError
}: UseGenerationQueueProps) => {
    const queueRef = useRef<QueueItem[]>([]);
    const activeRequestsRef = useRef<number>(0);
    const isPausedRef = useRef<boolean>(false);
    const activeJobsRef = useRef<ActiveJob[]>([]);

    // Adaptive Concurrency State
    const [concurrencyLimit, setConcurrencyLimit] = useState(1);
    const consecutiveSuccesses = useRef(0);
    const MAX_CONCURRENCY = 5;

    const [queueStatus, setQueueStatus] = useState<QueueStatus>({
        activeCount: 0,
        pendingCount: 0,
        isPaused: false,
        activeJobs: [],
        queuedJobs: [],
        concurrencyLimit: 1
    });

    const syncQueueStatus = useCallback(() => {
        setQueueStatus({
            activeCount: activeRequestsRef.current,
            pendingCount: queueRef.current.length,
            isPaused: isPausedRef.current,
            activeJobs: [...activeJobsRef.current],
            queuedJobs: queueRef.current.map(item => ({
                id: item.id,
                fileName: item.fileName,
                size: item.data.image ? item.data.image.dataUrl.length : 0,
                startTime: item.addedAt,
                taskType: item.taskType
            })),
            concurrencyLimit: concurrencyLimit
        });
    }, [concurrencyLimit]);

    const processQueue = useCallback(async () => {
        if (isPausedRef.current) {
            // If paused, we only resume if active requests drain to 0
            if (activeRequestsRef.current === 0) {
                console.log("Queue drained. Resuming...");
                isPausedRef.current = false;
                syncQueueStatus();
            } else {
                return;
            }
        }

        if (activeRequestsRef.current >= concurrencyLimit) return;

        while (activeRequestsRef.current < concurrencyLimit && queueRef.current.length > 0) {
            const task = queueRef.current.shift();
            if (!task) {
                syncQueueStatus();
                break;
            }

            // Check if we should proceed (e.g., if task is still valid/needed)
            if (shouldProcess && !shouldProcess(task)) {
                syncQueueStatus();
                continue;
            }

            activeRequestsRef.current++;

            // Add to active jobs list
            const job: ActiveJob = {
                id: task.id,
                fileName: task.fileName,
                size: task.data.image ? task.data.image.dataUrl.length : 0,
                startTime: Date.now(),
                taskType: task.taskType
            };
            activeJobsRef.current.push(job);
            syncQueueStatus();

            // EXECUTE TASK
            (async () => {
                try {
                    await processTask(task);

                    // Success Handling
                    if (onTaskSuccess) onTaskSuccess(task);

                    // Adaptive Concurrency Success
                    consecutiveSuccesses.current++;
                    if (consecutiveSuccesses.current >= 3 && concurrencyLimit < MAX_CONCURRENCY) {
                        setConcurrencyLimit(prev => prev + 1);
                        consecutiveSuccesses.current = 0;
                    }

                } catch (err: any) {
                    const errorMessage = err.message || '';
                    console.error(`Task ${task.fileName} failed:`, errorMessage);

                    if (onTaskError) onTaskError(task, err);

                    // Check for "Queue is full" or Connection Errors
                    const isConnectionError = errorMessage.toLowerCase().includes('failed to fetch') ||
                        errorMessage.includes('ECONNREFUSED') ||
                        errorMessage.includes('Network request failed') ||
                        errorMessage.includes('NetworkError') ||
                        errorMessage.includes('Load failed') ||
                        errorMessage.includes('Queue is full');

                    if (isConnectionError) {
                        // Backoff Strategy
                        consecutiveSuccesses.current = 0;
                        if (concurrencyLimit > 1) {
                            setConcurrencyLimit(1); // Drop to 1 immediately
                        }

                        // If it's a queue full error, we might want to pause or retry
                        if (errorMessage.includes('Queue is full')) {
                            // For now, simple backoff is implemented via concurrency drop
                            // Could implement re-queue logic here if desired
                        }
                    } else {
                        // Non-connection error (e.g. generation failure)
                        // Just count as a failure?
                        consecutiveSuccesses.current = 0;
                    }

                } finally {
                    activeRequestsRef.current--;
                    activeJobsRef.current = activeJobsRef.current.filter(j => j.id !== task.id);
                    syncQueueStatus();
                    processQueue(); // Process next item
                }
            })();
        }
    }, [concurrencyLimit, processTask, shouldProcess, onTaskSuccess, onTaskError, syncQueueStatus]);

    const addToQueue = useCallback((items: QueueItem[]) => {
        queueRef.current.push(...items);
        syncQueueStatus();
        processQueue();
    }, [syncQueueStatus, processQueue]);

    const pauseQueue = useCallback(() => {
        isPausedRef.current = true;
        syncQueueStatus();
    }, [syncQueueStatus]);

    const resumeQueue = useCallback(() => {
        isPausedRef.current = false;
        syncQueueStatus();
        processQueue();
    }, [syncQueueStatus, processQueue]);

    const clearQueue = useCallback(() => {
        queueRef.current = [];
        syncQueueStatus();
    }, [syncQueueStatus]);

    const removeItem = useCallback((id: string) => {
        queueRef.current = queueRef.current.filter(item => item.id !== id);
        syncQueueStatus();
    }, [syncQueueStatus]);

    return {
        queueStatus,
        addToQueue,
        pause: pauseQueue,
        resume: resumeQueue,
        clearQueue,
        removeItem,
        concurrencyLimit
    };
};
