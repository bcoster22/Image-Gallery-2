import React, { useCallback } from 'react';
import { analyzeImage, batchTagImages } from '../../services/aiService';
import { logger } from '../../services/loggingService';
import { resizeImage } from '../../utils/fileUtils';
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
        setAnalysisProgress((p: any) => p ? { ...p, fileName: img.fileName } : { current: 0, total: 1, fileName: img.fileName });
        addNotification({ id: img.id, status: 'processing', message: `Analyzing ${img.fileName}...` });

        let imageForAnalysis = { ...img };
        if (settings?.performance?.downscaleImages) {
            imageForAnalysis.dataUrl = await resizeImage(img.dataUrl, { maxDimension: settings.performance.maxAnalysisDimension });
        }

        const metadata = await analyzeImage(imageForAnalysis, settings!, undefined, (msg) => updateNotification(img.id, { message: msg }));
        if (metadata.stats) setStatsHistory(p => [...p, { timestamp: Date.now(), tokensPerSec: metadata.stats!.tokensPerSec, device: metadata.stats!.device }]);

        const updated = { ...img, ...metadata, analysisFailed: false };
        setImages(p => p.map(i => i.id === img.id ? updated : i));
        setSelectedImage(p => (p?.id === img.id ? updated : p));
        setSimilarImages(p => p.map(i => i.id === img.id ? updated : i));
        saveImage(updated);
        updateNotification(img.id, { status: 'success', message: `Analyzed ${img.fileName}.` });

        setAnalyzingIds(p => { const s = new Set(p); s.delete(img.id); return s; });
        queuedAnalysisIds.current.delete(img.id);

        return metadata.stats?.devicePerformance;
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
