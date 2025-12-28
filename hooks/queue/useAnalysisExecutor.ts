import React, { useCallback } from 'react';
import { analyzeImage } from '../../services/aiService';
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
    return useCallback(async (task: any) => { // task is QueueItem
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
    }, [settings, setStatsHistory, setImages, setSelectedImage, setSimilarImages, updateNotification, setAnalyzingIds, queuedAnalysisIds, setAnalysisProgress, addNotification]);
};
