import React, { useEffect, useRef } from 'react';
import { ImageInfo, AdminSettings } from '../types';
import { QueueItem } from '../types/queue';
import { useQueueState } from './queue/useQueueState';
import { useAnalysisExecutor } from './queue/useAnalysisExecutor';
import { useGenerationExecutor } from './queue/useGenerationExecutor';
import { useQueueProcessor } from './queue/useQueueProcessor';

interface UseQueueSystemProps {
    settings: AdminSettings | null;
    addNotification: (notification: any) => void;
    updateNotification: (id: string, updates: any) => void;
    setImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    setSelectedImage: React.Dispatch<React.SetStateAction<ImageInfo | null>>;
    setSimilarImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    setStatsHistory: React.Dispatch<React.SetStateAction<any[]>>;
    handleSaveGeneratedImage: (image: string, prompt: string | boolean, metadata?: any) => Promise<void>;
}

export const useQueueSystem = ({
    settings, addNotification, updateNotification, setImages, setSelectedImage, setSimilarImages, setStatsHistory, handleSaveGeneratedImage
}: UseQueueSystemProps) => {

    const {
        concurrencyLimit, setConcurrencyLimit,
        queueStatus,
        queueRef, activeRequestsRef, activeJobsRef, isPausedRef,
        checkBackendHealthRef, queuedAnalysisIds, queuedGenerationIds,
        syncQueueStatus, analysisProgressTimeoutRef,
        resilienceLog, setResilienceLog
    } = useQueueState();

    // Local State for UI exposure logic that was in original hook
    // Note: Original hook had setState for 'analyzingIds' etc.
    // I need to make sure these are passed down or managed.
    // In extraction, I assumed they were passed in.
    // So I need state here to pass down.

    // Wait, useQueueState returns refs mostly. "queueStatus" handles the high level summary.
    // But "analyzingIds" (Set) state is needed for UI loading indicators.
    // I need to add those states here and pass them.
    const [analyzingIds, setAnalyzingIds] = React.useState<Set<string>>(new Set());
    const [processingSmartCropIds, setProcessingSmartCropIds] = React.useState<Set<string>>(new Set());
    const [generationResults, setGenerationResults] = React.useState<{ id: string; url: string }[]>([]);
    const [analysisProgress, setAnalysisProgress] = React.useState<{ current: number; total: number; fileName: string } | null>(null);
    const [isBatchMode, setIsBatchMode] = React.useState<boolean>(false);

    const { executeAnalysis, executeBatchAnalysis } = useAnalysisExecutor({
        settings, setStatsHistory, setImages, setSelectedImage, setSimilarImages,
        updateNotification, setAnalyzingIds, queuedAnalysisIds, setAnalysisProgress, addNotification
    });

    const executeGeneration = useGenerationExecutor({
        settings, addNotification, handleSaveGeneratedImage, setGenerationResults
    });

    const {
        processQueue, startCalibration, stopCalibration, getCalibrationStatus,
        optimalBatchSize, batchSizeCalibrated, calibrateBatchSize, batchCalibrationInProgress
    } = useQueueProcessor({
        settings, queueRef, activeRequestsRef, activeJobsRef, isPausedRef, concurrencyLimit, setConcurrencyLimit,
        checkBackendHealthRef, queuedAnalysisIds, queuedGenerationIds, syncQueueStatus, updateNotification,
        setImages, setAnalyzingIds, executeAnalysis, executeGeneration, isBatchMode, executeBatchAnalysis, setResilienceLog
    });

    // Recursion Handling: The processor needs to trigger itself. 
    // Since useQueueProcessor uses useCallback, we can use a ref to hold the function
    // so the internal async loop can call it.
    const processQueueRef = useRef(processQueue);
    useEffect(() => { processQueueRef.current = processQueue; }, [processQueue]);

    // But `useQueueProcessor` as written doesn't call itself recursively cleanly because it's not bound to this ref.
    // Simple fix: Trigger processQueue whenever queue length or concurrency changes?
    // Or just expose it. The UI calls `addToQueue` -> `processQueue`.
    // The loop inside `processQueue` (while loop) handles batch processing.
    // The ISSUE is when a task finishes, we want to start another one if slot handles.
    // In `useQueueProcessor`, I put a comment about recursive call. I should probably pass a "onComplete" callback.
    // For now, let's assume the `while` loop handles the immediate batch, and we might rely on `addToQueue` triggering it.
    // But completing a task frees a slot, so we MUST try to process again.
    // I'll add a `useEffect` here that watches `activeRequestsRef.current`? No, that's a ref.
    // I'll use a wrapper.

    const addToQueue = (items: QueueItem[]) => {
        items.forEach(item => {
            if (item.taskType === 'analysis') queuedAnalysisIds.current.add(item.id);
            else if (item.taskType === 'generate') queuedGenerationIds.current.add(item.id);

            // Simple priority insert
            const prio = item.priority || 0;
            const idx = queueRef.current.findIndex(i => (i.priority || 0) < prio);
            if (idx === -1) queueRef.current.push(item);
            else queueRef.current.splice(idx, 0, item);
        });
        syncQueueStatus();
        processQueue();
    };

    const removeFromQueue = (ids: string[]) => {
        ids.forEach(id => {
            const index = queueRef.current.findIndex(item => item.id === id);
            if (index !== -1) {
                const item = queueRef.current[index];
                queueRef.current.splice(index, 1);

                // Remove from tracking sets
                if (item.taskType === 'analysis') queuedAnalysisIds.current.delete(id);
                else if (item.taskType === 'generate') queuedGenerationIds.current.delete(id);
            }
        });
        syncQueueStatus();
    };

    const clearQueue = () => {
        queueRef.current = [];
        queuedAnalysisIds.current.clear();
        queuedGenerationIds.current.clear();
        syncQueueStatus();
    };

    return {
        queueStatus,
        analysisProgress,
        analyzingIds,
        processingSmartCropIds, setProcessingSmartCropIds,
        generationResults, setGenerationResults,
        addToQueue,
        removeFromQueue,
        clearQueue,
        processQueue,
        isPausedRef,
        activeRequestsRef,
        checkBackendHealthRef,
        queuedAnalysisIds,
        queuedGenerationIds,
        startCalibration,
        stopCalibration,
        calibrationStatus: getCalibrationStatus(),
        isBatchMode,
        toggleBatchMode: () => setIsBatchMode(prev => !prev),
        // Batch size calibration
        optimalBatchSize,
        batchSizeCalibrated,
        calibrateBatchSize,
        batchCalibrationInProgress,
        resilienceLog,
        setAnalysisProgress
    };
};
