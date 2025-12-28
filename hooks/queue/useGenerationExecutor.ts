import React, { useCallback } from 'react';
import { generateImageFromPrompt } from '../../services/aiService';
import { AdminSettings } from '../../types';

interface UseGenerationExecutorProps {
    settings: AdminSettings | null;
    addNotification: (n: any) => void;
    handleSaveGeneratedImage: (img: string, p: string | boolean, m?: any) => Promise<void>;
    setGenerationResults: React.Dispatch<React.SetStateAction<{ id: string; url: string }[]>>;
}

export const useGenerationExecutor = ({ settings, addNotification, handleSaveGeneratedImage, setGenerationResults }: UseGenerationExecutorProps) => {
    return useCallback(async (task: any) => { // task is QueueItem
        addNotification({ id: task.id, status: 'processing', message: `Generating: ${task.fileName}...` });

        const result = await generateImageFromPrompt(
            task.data.prompt!,
            settings!,
            task.data.aspectRatio!,
            task.data.sourceImage,
            task.data.generationSettings
        );

        if (result.image) {
            const providerKey = settings!.routing.generation[0];
            const providerConfig = settings!.providers[providerKey];
            const hasApiKey = providerConfig && 'apiKey' in providerConfig && (providerConfig as any).apiKey;

            const meta = {
                ...task.data.generationSettings,
                aspectRatio: task.data.aspectRatio,
                provider: hasApiKey ? providerKey : 'unknown'
            };

            await handleSaveGeneratedImage(result.image, task.data.prompt!, meta);
            setGenerationResults(prev => [...prev, { id: task.id, url: result.image }]);
            addNotification({ id: task.id, status: 'success', message: `Generated: ${task.fileName}` });
        } else {
            throw new Error("No image data returned.");
        }
    }, [settings, addNotification, handleSaveGeneratedImage, setGenerationResults]);
};
