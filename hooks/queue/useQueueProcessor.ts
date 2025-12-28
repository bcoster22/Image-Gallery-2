import React, { useCallback } from 'react';
import { QueueItem, ActiveJob } from '../../types/queue';
import { ImageInfo, AdminSettings } from '../../types';

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
    executeAnalysis: (task: QueueItem) => Promise<void>;
    executeGeneration: (task: QueueItem) => Promise<void>;
}

export const useQueueProcessor = ({
    settings, queueRef, activeRequestsRef, activeJobsRef, isPausedRef, concurrencyLimit, setConcurrencyLimit,
    checkBackendHealthRef, queuedAnalysisIds, queuedGenerationIds, syncQueueStatus, updateNotification, setImages, setAnalyzingIds,
    executeAnalysis, executeGeneration
}: UseQueueProcessorProps) => {

    const processQueueRef = React.useRef<() => Promise<void>>();

    const processQueue = useCallback(async () => {
        if (isPausedRef.current) {
            if (activeRequestsRef.current === 0) {
                console.log("Queue drained. Resuming...");
                isPausedRef.current = false;
                syncQueueStatus();
            } else { return; }
        }

        if (activeRequestsRef.current >= concurrencyLimit) return;

        while (activeRequestsRef.current < concurrencyLimit && queueRef.current.length > 0) {
            const task = queueRef.current.shift();
            if (!task) { syncQueueStatus(); break; }

            // Dedupe Analysis
            if (task.taskType === 'analysis' && task.data.image && !queuedAnalysisIds.current.has(task.data.image.id)) {
                syncQueueStatus(); continue;
            }

            activeRequestsRef.current++;
            activeJobsRef.current.push({ id: task.id, fileName: task.fileName, size: task.data.image?.dataUrl.length || 0, startTime: Date.now(), taskType: task.taskType });
            syncQueueStatus();

            // EXECUTE
            (async () => {
                try {
                    if (task.taskType === 'analysis') await executeAnalysis(task);
                    else if (task.taskType === 'generate') await executeGeneration(task);

                    if (concurrencyLimit < 5) setConcurrencyLimit(p => Math.min(p + 1, 5));

                } catch (err: any) {
                    const msg = err.message || '';
                    const isConnError = msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('500');
                    if (isConnError && settings?.resilience?.pauseOnLocalFailure) {
                        isPausedRef.current = true;
                        queueRef.current.unshift(task);
                    } else if (msg.includes("Queue is full")) {
                        isPausedRef.current = true;
                        queueRef.current.unshift(task);
                        setConcurrencyLimit(p => Math.max(1, Math.floor(p / 2)));
                    } else {
                        updateNotification(task.id, { status: 'error', message: `Failed: ${task.fileName}` });
                        setConcurrencyLimit(1);
                        if (task.taskType === 'analysis' && task.data.image) {
                            const fail = { ...task.data.image, analysisFailed: true, analysisError: msg };
                            setImages(p => p.map(i => i.id === fail.id ? fail : i));
                            setAnalyzingIds(p => { const s = new Set(p); s.delete(fail.id); return s; });
                            queuedAnalysisIds.current.delete(fail.id);
                        }
                    }
                } finally {
                    activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
                    activeJobsRef.current = activeJobsRef.current.filter(j => j.id !== task.id);
                    if (task.taskType === 'generate') queuedGenerationIds.current.delete(task.id);
                    syncQueueStatus();

                    // Recursive Trigger
                    if (processQueueRef.current) processQueueRef.current();
                }
            })();
        }
    }, [isPausedRef, activeRequestsRef, concurrencyLimit, queueRef, queuedAnalysisIds, activeJobsRef, executeAnalysis, executeGeneration, setConcurrencyLimit, settings, syncQueueStatus, updateNotification, setImages, setAnalyzingIds, queuedGenerationIds]);

    // Update ref whenever callback changes
    React.useEffect(() => { processQueueRef.current = processQueue; }, [processQueue]);

    return processQueue;
};
