import React, { useState, useEffect, useCallback } from 'react';
import { ImageInfo, Notification } from '../types';
import { initDB, getImages, getNegativePrompts, saveNegativePrompt, NegativePrompt } from '../utils/idb';
import { DEFAULT_NEGATIVE_PROMPTS } from '../constants/prompts';

interface UseGalleryDataReturn {
    images: ImageInfo[];
    setImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    negativePromptHistory: NegativePrompt[];
    setNegativePromptHistory: React.Dispatch<React.SetStateAction<NegativePrompt[]>>;
    isDbLoading: boolean;
    refreshData: () => Promise<void>;
}

export const useGalleryData = (addNotification: (notification: Omit<Notification, 'id'> & { id?: string }) => void): UseGalleryDataReturn => {
    const [images, setImages] = useState<ImageInfo[]>([]);
    const [negativePromptHistory, setNegativePromptHistory] = useState<NegativePrompt[]>([]);
    const [isDbLoading, setIsDbLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            setIsDbLoading(true);
            await initDB();

            // 1. Load Images
            const loadedImages = await getImages();
            setImages(loadedImages);

            // 2. Load Negative Prompts
            const loadedPrompts = await getNegativePrompts();

            if (loadedPrompts.length === 0) {
                // Seed defaults
                console.log("Seeding default negative prompts...");
                for (const prompt of DEFAULT_NEGATIVE_PROMPTS) {
                    await saveNegativePrompt(prompt);
                }
                // Reload
                const reloaded = await getNegativePrompts();
                setNegativePromptHistory(reloaded);
            } else {
                setNegativePromptHistory(loadedPrompts);
            }

        } catch (e) {
            console.error("Failed to load data from IndexedDB", e);
            addNotification({ status: 'error', message: 'Could not load your saved gallery data.' });
        } finally {
            setIsDbLoading(false);
        }
    }, [addNotification]);

    // Initial load
    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        images,
        setImages,
        negativePromptHistory,
        setNegativePromptHistory,
        isDbLoading,
        refreshData: loadData
    };
};
