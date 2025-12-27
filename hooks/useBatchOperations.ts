import React, { useState } from 'react';
import { ImageInfo, GenerationTask, AdminSettings, User, Notification, AspectRatio } from '../types';
import { analyzeImage, adaptPromptToTheme, generateImageFromPrompt } from '../services/aiService';
import { getClosestSupportedAspectRatio } from '../utils/fileUtils';
import { saveImage } from '../utils/idb';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

type NotificationInput = Omit<Notification, 'id' | 'timestamp'> & { id?: string };

interface UseBatchOperationsProps {
    images: ImageInfo[];
    setImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    selectedIds: Set<string>;
    setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    toggleSelectionMode: (force?: boolean) => void;
    addNotification: (notification: NotificationInput) => void;
    handleRegenerateCaption: (id: string) => Promise<void>;
    settings: AdminSettings | null;
    currentUser: User | null;
    setGenerationTasks: React.Dispatch<React.SetStateAction<GenerationTask[]>>;
    setStatsHistory: React.Dispatch<React.SetStateAction<any[]>>;
    handleSaveGeneratedImage: (dataUrl: string, prompt: string, metadata: any) => Promise<void>;
    handleGenerationSubmit: (
        sourceImage: ImageInfo,
        prompt: string,
        taskType: 'image' | 'enhance',
        aspectRatio: AspectRatio,
        providerOverride?: any,
        generationSettings?: any,
        autoSaveToGallery?: boolean
    ) => Promise<void>;
    handleStartAnimation: (
        sourceImage: ImageInfo | null,
        prompt: string,
        aspectRatio: AspectRatio,
        isRetry?: boolean
    ) => Promise<void>;
}

export const useBatchOperations = ({
    images,
    setImages,
    selectedIds,
    setSelectedIds,
    toggleSelectionMode,
    addNotification,
    handleRegenerateCaption,
    settings,
    currentUser,
    setGenerationTasks,
    setStatsHistory,
    handleSaveGeneratedImage,
    handleGenerationSubmit,
    handleStartAnimation
}: UseBatchOperationsProps) => {
    const [isBatchRemixModalOpen, setIsBatchRemixModalOpen] = useState(false);

    const handleBatchRegenerate = () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        addNotification({ status: 'success', message: `Starting caption regeneration for ${ids.length} images...` });
        toggleSelectionMode(false);
        setSelectedIds(new Set());

        ids.forEach(id => {
            handleRegenerateCaption(id);
        });
    };

    const handleBatchRemixClick = () => {
        if (selectedIds.size === 0) return;
        setIsBatchRemixModalOpen(true);
    };

    const handleBatchEnhance = () => {
        const ids = Array.from(selectedIds);
        const imagesToProcess = images.filter(img => ids.includes(img.id));
        if (imagesToProcess.length === 0) return;

        addNotification({ status: 'success', message: `Queuing upscale for ${imagesToProcess.length} images...` });
        toggleSelectionMode(false);
        setSelectedIds(new Set());

        imagesToProcess.forEach(image => {
            // Default upscale prompt
            const prompt = "Upscale this image to high resolution, enhancing details and clarity.";
            // We pass '1:1' as placeholder aspect ratio for enhancement tasks as usually they respect source AR.
            handleGenerationSubmit(image, prompt, 'enhance', '1:1' as AspectRatio);
        });
    };

    const handleBatchAnimate = () => {
        const ids = Array.from(selectedIds);
        const imagesToProcess = images.filter(img => ids.includes(img.id));
        if (imagesToProcess.length === 0) return;

        addNotification({ status: 'success', message: `Queuing animation for ${imagesToProcess.length} images...` });
        toggleSelectionMode(false);
        setSelectedIds(new Set());

        imagesToProcess.forEach(image => {
            const prompt = image.recreationPrompt || "Animate this image cinematically.";
            // Default to 16:9 for video if source doesn't hint otherwise
            const ar: AspectRatio = image.aspectRatio ? getClosestSupportedAspectRatio(image.aspectRatio) as AspectRatio : '16:9';
            handleStartAnimation(image, prompt, ar);
        });
    };

    const handleConfirmBatchRemix = (theme: string) => {
        if (!settings || !currentUser) return;
        setIsBatchRemixModalOpen(false);

        const ids = Array.from(selectedIds);
        const imagesToRemix = images.filter(img => ids.includes(img.id));

        if (imagesToRemix.length === 0) return;

        addNotification({ status: 'success', message: `Starting remix for ${imagesToRemix.length} images...` });
        toggleSelectionMode(false);
        setSelectedIds(new Set());

        // Iterate and launch tasks
        imagesToRemix.forEach(sourceImage => {
            const taskId = self.crypto.randomUUID();
            const newTask: GenerationTask = {
                id: taskId,
                type: 'image',
                status: 'processing',
                sourceImageId: sourceImage.id,
                sourceImageName: sourceImage.fileName,
                prompt: `Remix: ${theme}`,
            };
            setGenerationTasks(prev => [...prev, newTask]);

            (async () => {
                try {
                    let prompt = sourceImage.recreationPrompt;

                    if (!prompt) {
                        addNotification({ id: `${taskId}-analyze`, status: 'processing', message: `Analyzing ${sourceImage.fileName} for remix...` });
                        const analysis = await analyzeImage(sourceImage, settings);

                        if (analysis.stats) {
                            const newStat = {
                                timestamp: Date.now(),
                                tokensPerSec: analysis.stats.tokensPerSec,
                                device: analysis.stats.device
                            };
                            setStatsHistory(prev => [...prev, newStat]);
                        }

                        prompt = analysis.recreationPrompt;

                        // Save analysis result
                        const updatedImage = { ...sourceImage, ...analysis, analysisFailed: false };
                        setImages(prev => prev.map(img => img.id === sourceImage.id ? updatedImage : img));
                        saveImage(updatedImage);
                    }

                    // Step 1: Adapt prompt
                    const adaptedPrompt = await adaptPromptToTheme(prompt!, theme, settings);

                    // Step 2: Generate Image
                    const aspectRatio = sourceImage.aspectRatio ? getClosestSupportedAspectRatio(sourceImage.aspectRatio) : '1:1';
                    const result = await generateImageFromPrompt(adaptedPrompt, settings, aspectRatio as AspectRatio);

                    if (!result || !result.image) throw new Error("Generation returned no image data");

                    // Step 3: Save
                    await handleSaveGeneratedImage(result.image, adaptedPrompt, { ...result.metadata, source: 'remix', originalId: sourceImage.id });

                    setGenerationTasks(prev => prev.filter(t => t.id !== taskId));
                } catch (error: any) {
                    console.error(`Remix task failed for ${sourceImage.fileName}:`, error);
                    const friendlyMessage = getFriendlyErrorMessage(error);
                    setGenerationTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: friendlyMessage } : t));
                    addNotification({ status: 'error', message: `Remix for "${sourceImage.fileName}" failed.` });
                }
            })();
        });
    };

    return {
        isBatchRemixModalOpen,
        setIsBatchRemixModalOpen,
        handleBatchRegenerate,
        handleBatchRemixClick,
        handleConfirmBatchRemix,
        handleBatchEnhance,
        handleBatchAnimate
    };
};
