import React, { useCallback } from 'react';
import { ImageInfo, User, AdminSettings, AspectRatio, GenerationTask } from '../types';
import type { QueueItem } from '../types/queue';
import { animateImage } from '../services/aiService';
import { getImageMetadata, generateVideoThumbnail, createGenericPlaceholder } from '../utils/fileUtils';
import { saveImage } from '../utils/idb';

interface UseGenerationProps {
    currentUser: User | null;
    settings: AdminSettings | null;
    generationTasks: GenerationTask[];
    setGenerationTasks: React.Dispatch<React.SetStateAction<GenerationTask[]>>;
    setImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    addNotification: (notification: any) => void;
    addPromptToHistory: (prompt: string) => void;
    addToQueue: (items: QueueItem[]) => void;
}

export const useGeneration = ({
    currentUser,
    settings,
    generationTasks,
    setGenerationTasks,
    setImages,
    addNotification,
    addPromptToHistory,
    addToQueue
}: UseGenerationProps) => {

    const handleStartAnimation = useCallback(async (
        sourceImage: ImageInfo | null,
        prompt: string,
        aspectRatio: AspectRatio,
        isRetry: boolean = false
    ) => {
        if (!settings || !currentUser) return;
        if (!isRetry && generationTasks.filter(t => t.type === 'video' && t.status === 'processing').length >= 2) {
            addNotification({ status: 'error', message: 'Too many video tasks.' });
            return;
        }
        addPromptToHistory(prompt);
        const taskId = self.crypto.randomUUID();

        const placeholder: ImageInfo = {
            id: taskId,
            dataUrl: sourceImage?.dataUrl || createGenericPlaceholder(aspectRatio),
            fileName: `Generating video...`,
            file: new File([], ''),
            ownerId: currentUser.id,
            isPublic: false,
            isGenerating: true,
            source: 'video',
            recreationPrompt: prompt,
            width: sourceImage?.width,
            height: sourceImage?.height,
            aspectRatio: sourceImage?.aspectRatio
        };
        setImages(prev => [placeholder, ...prev]);
        setGenerationTasks(prev => [...prev, {
            id: taskId,
            type: 'video',
            status: 'processing',
            sourceImageId: sourceImage?.id,
            sourceImageName: sourceImage?.fileName || '',
            prompt
        }]);

        (async () => {
            try {
                const { uri, apiKey } = await animateImage(sourceImage || placeholder, prompt, aspectRatio, settings);
                const response = await fetch(`${uri}&key=${apiKey}`);
                if (!response.ok) throw new Error("Failed to download video");
                const blob = await response.blob();
                const thumb = await generateVideoThumbnail(blob);
                const meta = await getImageMetadata(thumb);
                const videoUrl = URL.createObjectURL(blob);
                const final: ImageInfo = {
                    ...placeholder,
                    isGenerating: false,
                    isVideo: true,
                    videoUrl,
                    file: new File([blob], 'video.mp4', { type: 'video/mp4' }),
                    dataUrl: thumb,
                    width: meta.width,
                    height: meta.height,
                    aspectRatio: meta.aspectRatio
                };
                setImages(prev => prev.map(img => img.id === taskId ? final : img));
                saveImage(final);
                setGenerationTasks(prev => prev.filter(t => t.id !== taskId));
                addNotification({ status: 'success', message: 'Video saved!' });
            } catch (e: any) {
                setImages(prev => prev.filter(img => img.id === taskId));
                setGenerationTasks(prev => prev.filter(t => t.id !== taskId));
                addNotification({ status: 'error', message: `Animation failed: ${e.message}` });
            }
        })();
    }, [settings, currentUser, generationTasks, addNotification, addPromptToHistory, setImages, setGenerationTasks]);

    const handleGenerationSubmit = useCallback(async (
        sourceImage: ImageInfo,
        prompt: string,
        taskType: 'image' | 'enhance',
        aspectRatio: AspectRatio,
        providerOverride?: any,
        generationSettings?: any,
        autoSaveToGallery?: boolean
    ) => {
        if (!currentUser || !settings) return;
        addPromptToHistory(prompt);
        const taskId = self.crypto.randomUUID();
        const newTask: GenerationTask = {
            id: taskId,
            type: taskType,
            status: 'processing',
            sourceImageId: sourceImage.id,
            sourceImageName: sourceImage.fileName,
            prompt
        };
        setGenerationTasks(prev => [...prev, newTask]);
        addNotification({ status: 'success', message: `Starting ${taskType}...` });

        addToQueue([{
            id: taskId,
            taskType: (taskType === 'image' ? 'generate' : taskType) as any,
            fileName: sourceImage.fileName,
            addedAt: Date.now(),
            data: { image: sourceImage, prompt, aspectRatio, generationSettings, providerOverride, sourceImage }
        }]);
    }, [currentUser, settings, addNotification, addPromptToHistory, addToQueue, setGenerationTasks]);

    return {
        handleStartAnimation,
        handleGenerationSubmit
    };
};
