import React, { useState, useCallback, useRef } from 'react';
import { ImageInfo, User, AdminSettings, UploadProgress } from '../types';
import { fileToDataUrl, getImageMetadata, extractAIGenerationMetadata } from '../utils/fileUtils';
import { saveImage } from '../utils/idb';

interface UseFileUploadProps {
    currentUser: User | null;
    settings: AdminSettings | null;
    setImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    addNotification: (notification: any) => void;
    runImageAnalysis: (images: ImageInfo[]) => void;
}

export const useFileUpload = ({
    currentUser,
    settings,
    setImages,
    addNotification,
    runImageAnalysis
}: UseFileUploadProps) => {
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    const uploadAbortRef = useRef<boolean>(false);

    const handleFilesChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!currentUser) {
            addNotification({ status: 'error', message: 'Please sign in.' });
            return;
        }
        if (!settings) {
            addNotification({ status: 'error', message: 'Configure settings.' });
            return;
        }

        const files = event.target.files;
        if (!files?.length) return;
        const imageFiles: File[] = Array.from(files).filter((f: any) => f.type && f.type.startsWith('image/')) as File[];

        setUploadProgress({ current: 0, total: imageFiles.length, eta: -1, speed: 0, fileName: '' });
        uploadAbortRef.current = false;
        const newImages: ImageInfo[] = [];

        for (let i = 0; i < imageFiles.length; i++) {
            if (uploadAbortRef.current) break;
            const file = imageFiles[i];
            try {
                setUploadProgress(prev => ({ ...prev!, current: i + 1, fileName: file.name }));
                const aiData = await extractAIGenerationMetadata(file);
                const dataUrl = await fileToDataUrl(file);
                const meta = await getImageMetadata(dataUrl);
                const newImg: ImageInfo = {
                    id: self.crypto.randomUUID(),
                    file,
                    fileName: file.name,
                    dataUrl,
                    ...meta,
                    ownerId: currentUser.id,
                    isPublic: false,
                    source: 'upload',
                    authorName: currentUser.name,
                    authorAvatarUrl: currentUser.avatarUrl,
                    likes: 0,
                    commentsCount: 0,
                    ...(aiData?.originalMetadataPrompt ? { originalMetadataPrompt: aiData.originalMetadataPrompt } : {})
                };
                newImages.push(newImg);
            } catch (e) {
                console.error('Error processing file:', file.name, e);
            }
        }

        setImages(prev => [...prev, ...newImages]);
        newImages.forEach(img => saveImage(img));
        setUploadProgress(null);
        runImageAnalysis(newImages.filter(img => !img.recreationPrompt));
    }, [currentUser, settings, addNotification, setImages, runImageAnalysis]);

    const cancelUpload = useCallback(() => {
        uploadAbortRef.current = true;
    }, []);

    return {
        uploadProgress,
        handleFilesChange,
        cancelUpload
    };
};
