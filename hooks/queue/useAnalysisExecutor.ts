import React, { useCallback } from 'react';
import { analyzeImage, batchTagImages } from '../../services/aiService';
import { logger } from '../../services/loggingService';
import { resizeImage, extractAIGenerationMetadata } from '../../utils/fileUtils';
import { saveImage } from '../../utils/idb';
import { ImageInfo, AdminSettings } from '../../types';

interface UseAnalysisExecutorProps {
    settings: AdminSettings | null;
    setStatsHistory: React.Dispatch<React.SetStateAction<any[]>>;
    setImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    setSelectedImage: React.Dispatch<React.SetStateAction<ImageInfo | null>>;
    setSimilarImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    updateNotification: (id: string, updates: any) => void;
    setAnalyzingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    queuedAnalysisIds: React.MutableRefObject<Set<string>>;
    setAnalysisProgress: React.Dispatch<React.SetStateAction<any>>;
    addNotification: (n: any) => void;
}

export const useAnalysisExecutor = ({ settings, setStatsHistory, setImages, setSelectedImage, setSimilarImages, updateNotification, setAnalyzingIds, queuedAnalysisIds, setAnalysisProgress, addNotification }: UseAnalysisExecutorProps) => {

    const executeAnalysis = useCallback(async (task: any) => { // task is QueueItem
        const img = task.data.image!;

        try {
            // Update progress (Init if null, else keep total)
            setAnalysisProgress((p: any) => p
                ? { ...p, fileName: img.fileName }
                : { current: 0, total: 1, fileName: img.fileName }
            );
            addNotification({ id: img.id, status: 'processing', message: `Analyzing ${img.fileName}...` });

            // Attempt to recover metadata from file if missing (e.g. was uploaded before support added)
            let recoveredMetadata = {};
            if (!img.originalMetadataPrompt || !img.resourceUsage) {
                try {
                    const fileMeta = await extractAIGenerationMetadata(img.file);
                    if (fileMeta) {
                        recoveredMetadata = fileMeta;
                        // Add to notification so user knows we found something
                        if (fileMeta.originalMetadataPrompt) {
                            updateNotification(img.id, { message: `Found hidden metadata in ${img.fileName}...` });
                        }
                    }
                } catch (e) {
                    console.warn("Metadata recovery failed:", e);
                }
            }

            let imageForAnalysis = { ...img };
            if (settings?.performance?.downscaleImages) {
                imageForAnalysis.dataUrl = await resizeImage(img.dataUrl, { maxDimension: settings.performance.maxAnalysisDimension });
            }

            const metadata = await analyzeImage(imageForAnalysis, settings!, undefined, (msg) => updateNotification(img.id, { message: msg }));
            if (metadata.stats) setStatsHistory(p => [...p, { timestamp: Date.now(), tokensPerSec: metadata.stats!.tokensPerSec, device: metadata.stats!.device }]);

            const updated = { ...img, ...recoveredMetadata, ...metadata, analysisFailed: false };
            setImages(p => p.map(i => i.id === img.id ? updated : i));
            setSelectedImage(p => (p?.id === img.id ? updated : p));
            setSimilarImages(p => p.map(i => i.id === img.id ? updated : i));
            saveImage(updated);
            updateNotification(img.id, { status: 'success', message: `Analyzed ${img.fileName}.` });

            // Cleanup & Increment Progress
            setAnalyzingIds(p => { const s = new Set(p); s.delete(img.id); return s; });
            queuedAnalysisIds.current.delete(img.id);

            setAnalysisProgress((p: any) => {
                if (!p) return null;
                // If queue is empty and this was the last one (total == current + 1), clear it
                // Or if we just check queue size directly.
                // We'll optimistically increment.
                const nextCurrent = p.current + 1;
                // If we reached total, or queue is truly empty (excluding this one which we just deleted), clear.
                if (nextCurrent >= p.total || queuedAnalysisIds.current.size === 0) return null;
                return { ...p, current: nextCurrent };
            });

            return metadata.stats?.devicePerformance;
        } catch (e: any) {
            console.error(`[Single Analysis] Failed to analyze ${img.fileName}:`, e);

            // Mark image as failed and save
            const failed = { ...img, analysisFailed: true };
            setImages(p => p.map(i => i.id === img.id ? failed : i));
            saveImage(failed);

            // Clean up state
            setAnalyzingIds(p => { const s = new Set(p); s.delete(img.id); return s; });
            queuedAnalysisIds.current.delete(img.id);

            setAnalysisProgress((p: any) => {
                if (!p) return null;
                // Increment even on failure to advance bar
                const nextCurrent = p.current + 1;
                if (nextCurrent >= p.total || queuedAnalysisIds.current.size === 0) return null;
                return { ...p, current: nextCurrent };
            });

            // Update notification
            updateNotification(img.id, { status: 'error', message: e.message || `Failed: ${img.fileName}` });

            // Re-throw so queue processor can handle it
            throw e;
        }
    }, [settings, setStatsHistory, setImages, setSelectedImage, setSimilarImages, updateNotification, setAnalyzingIds, queuedAnalysisIds, setAnalysisProgress, addNotification]);

    const executeBatchAnalysis = useCallback(async (tasks: any[]) => {
        if (!settings) return;
        const imagesToProcess = tasks.map(t => t.data.image!);

        // Notify start
        const names = imagesToProcess.map(i => i.fileName).join(', ');
        tasks.forEach(t => updateNotification(t.id, { status: 'processing', message: 'Batch tagging...' }));

        try {
            // Resize all if needed
            const resizedImages = [];
            for (const img of imagesToProcess) {
                let imageForAnalysis = { ...img };
                if (settings?.performance?.downscaleImages) {
                    imageForAnalysis.dataUrl = await resizeImage(img.dataUrl, { maxDimension: settings.performance.maxAnalysisDimension });
                }
                resizedImages.push(imageForAnalysis);
            }

            // Execute Batch
            const results = await batchTagImages(resizedImages, settings);

            // Handle Results
            results.forEach(res => {
                const original = imagesToProcess.find(i => i.id === res.imageId);
                if (original) {
                    const updated = { ...original, keywords: res.tags, analysisFailed: false };
                    setImages(p => p.map(i => i.id === original.id ? updated : i));

                    // Log for verification
                    logger.info(`[Batch Tagging] Image: ${original.fileName} | Tags: ${res.tags.join(', ')}`, 'BatchProcessor');

                    // Note: We don't have recreatingPrompt in WD14 batch mode usually
                    saveImage(updated);
                    updateNotification(original.id, { status: 'success', message: 'Tagged.' });
                }
            });

            // Cleanup ids
            tasks.forEach(t => {
                const id = t.data.image.id;
                setAnalyzingIds(p => { const s = new Set(p); s.delete(id); return s; });
                queuedAnalysisIds.current.delete(id);
            });
            setAnalysisProgress(null);

        } catch (e: any) {
            console.error("[Batch Analysis] Batch failed:", e);
            // Clean up state for all tasks
            tasks.forEach(t => {
                const id = t.data.image.id;
                setAnalyzingIds(p => { const s = new Set(p); s.delete(id); return s; });
                queuedAnalysisIds.current.delete(id);
                updateNotification(t.id, { status: 'error', message: e.message || 'Batch analysis failed' });
            });
            // Clear progress indicator to prevent stuck "Analyzing Images..." modal
            setAnalysisProgress(null);
            // Re-throw so queue processor knows batch failed
            throw e;
        }
    }, [settings, setImages, updateNotification, setAnalyzingIds, queuedAnalysisIds]);

    return { executeAnalysis, executeBatchAnalysis };
};
