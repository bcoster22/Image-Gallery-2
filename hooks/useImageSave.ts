import React, { useCallback } from 'react';
import { ImageInfo, User, AdminSettings } from '../types';
import { dataUrlToBlob, getImageMetadata } from '../utils/fileUtils';
import { saveImage } from '../utils/idb';

interface UseImageSaveProps {
    currentUser: User | null;
    settings: AdminSettings | null;
    setImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    addNotification: (notification: any) => void;
    runImageAnalysis: (images: ImageInfo[]) => void;
    addPromptToHistory: (prompt: string) => void;
}

export const useImageSave = ({
    currentUser,
    settings,
    setImages,
    addNotification,
    runImageAnalysis,
    addPromptToHistory
}: UseImageSaveProps) => {

    const saveImageToGallery = useCallback(async (
        dataUrl: string,
        isPublic: boolean,
        prompt?: string,
        source?: ImageInfo['source'],
        savedToGallery?: boolean,
        generationMetadata?: any
    ) => {
        if (!currentUser) {
            addNotification({ status: 'error', message: 'You must be signed in to save an image.' });
            return;
        }
        try {
            const fileName = `${source || 'ai-creation'}-${Date.now()}.png`;
            const blob = await dataUrlToBlob(dataUrl);
            const file = new File([blob], fileName, { type: 'image/png' });
            const metadata = await getImageMetadata(dataUrl);
            const newImage: ImageInfo = {
                id: self.crypto.randomUUID(),
                file,
                fileName,
                dataUrl,
                ...metadata,
                ownerId: currentUser.id,
                isPublic,
                recreationPrompt: prompt,
                source,
                savedToGallery,
                generationMetadata,
                authorName: currentUser.name,
                authorAvatarUrl: currentUser.avatarUrl,
                likes: 0,
                commentsCount: 0,
            };
            setImages(prev => [newImage, ...prev]);
            saveImage(newImage).catch(e => {
                console.error(e);
                addNotification({ status: 'error', message: 'Failed to save image.' });
            });
            addNotification({ status: 'success', message: `New ${source || 'creation'} saved!` });

            if (settings && !prompt) {
                // Run analysis if no prompt (Import/DragNDrop)
                runImageAnalysis([newImage]);
            }
        } catch (e: any) {
            addNotification({ status: 'error', message: `Could not save: ${e.message}` });
        }
    }, [settings, currentUser, addNotification, setImages, runImageAnalysis]);

    const handleSaveGeneratedImage = useCallback(async (
        imageInput: string | any,
        prompt: string | boolean,
        metadata?: any
    ) => {
        let base64Image = '';
        if (typeof imageInput === 'string') base64Image = imageInput;
        else if (imageInput?.image) base64Image = imageInput.image;

        if (!base64Image) return;

        const safePrompt = typeof prompt === 'string' ? prompt : (typeof metadata === 'string' ? metadata : '');
        if (safePrompt) addPromptToHistory(safePrompt);

        const dataUrl = base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`;
        const shouldSaveToGallery = metadata?.autoSaveToGallery ?? currentUser?.autoSaveToGallery;
        await saveImageToGallery(dataUrl, false, safePrompt, 'generated', shouldSaveToGallery, metadata);
    }, [addPromptToHistory, saveImageToGallery, currentUser]);

    const handleSaveEnhancedImage = useCallback(async (
        base64Image: string,
        isPublic: boolean,
        prompt: string
    ) => {
        addPromptToHistory(prompt);
        const dataUrl = base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`;
        saveImageToGallery(dataUrl, isPublic, prompt, 'enhanced', currentUser?.autoSaveToGallery);
    }, [addPromptToHistory, saveImageToGallery, currentUser]);

    return {
        saveImageToGallery,
        handleSaveGeneratedImage,
        handleSaveEnhancedImage
    };
};
