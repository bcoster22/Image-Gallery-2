import { useState, useRef, useCallback } from 'react';
import { QueueItem, ActiveJob, QueueStatus } from '../../types/queue';

export const useQueueState = () => {
    const [concurrencyLimit, setConcurrencyLimit] = useState(1);
    const [queueStatus, setQueueStatus] = useState<QueueStatus>({
        activeCount: 0,
        pendingCount: 0,
        isPaused: false,
        activeJobs: [],
        queuedJobs: [],
        concurrencyLimit: 1
    });

    const [resilienceLog, setResilienceLog] = useState<{ timestamp: number, type: 'info' | 'warn' | 'error', message: string }[]>([]);

    const queueRef = useRef<QueueItem[]>([]);
    const activeRequestsRef = useRef<number>(0);
    const activeJobsRef = useRef<ActiveJob[]>([]);
    const isPausedRef = useRef<boolean>(false);
    const consecutiveSuccesses = useRef(0);
    const recoveryIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const checkBackendHealthRef = useRef<(() => Promise<void>) | null>(null);
    const analysisProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const queuedAnalysisIds = useRef<Set<string>>(new Set());
    const queuedGenerationIds = useRef<Set<string>>(new Set());

    // Track completed and retry counts
    const completedCountRef = useRef<number>(0);
    const retryQueueRef = useRef<Map<string, any>>(new Map());  // For retry queue tracking


    const syncQueueStatus = useCallback((retryCount?: number) => {
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
            concurrencyLimit,
            completedCount: completedCountRef.current,
            retryCount: retryCount !== undefined ? retryCount : retryQueueRef.current.size
        });
    }, [concurrencyLimit]);

    return {
        concurrencyLimit, setConcurrencyLimit,
        queueStatus, setQueueStatus,
        queueRef, activeRequestsRef, activeJobsRef, isPausedRef,
        checkBackendHealthRef,
        analysisProgressTimeoutRef, queuedAnalysisIds, queuedGenerationIds,
        syncQueueStatus,
        resilienceLog, setResilienceLog,
        completedCountRef, retryQueueRef
    };
};
