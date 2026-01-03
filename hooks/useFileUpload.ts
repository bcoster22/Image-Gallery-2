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
    onUploadSuccess?: () => void;
}

export const useFileUpload = ({
    currentUser,
    settings,
    setImages,
    addNotification,
    runImageAnalysis,
    onUploadSuccess
}: UseFileUploadProps) => {
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    const uploadAbortRef = useRef<boolean>(false);

    const processFiles = useCallback(async (incomingFiles: FileList | File[]) => {
        if (!currentUser) {
            addNotification({ status: 'error', message: 'Please sign in.' });
            return;
        }
        if (!settings) {
            addNotification({ status: 'error', message: 'Configure settings.' });
            return;
        }

        const filesArray = Array.from(incomingFiles);
        if (!filesArray.length) return;
        const imageFiles: File[] = filesArray.filter((f: any) => f.type && f.type.startsWith('image/')) as File[];

        if (imageFiles.length === 0) return;

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
                    ...(aiData?.originalMetadataPrompt ? { originalMetadataPrompt: aiData.originalMetadataPrompt } : {}),
                    ...(aiData?.resourceUsage ? { resourceUsage: aiData.resourceUsage } : {})
                };
                newImages.push(newImg);
            } catch (e) {
                console.error('Error processing file:', file.name, e);
            }
        }

        setImages(prev => [...newImages, ...prev]);
        newImages.forEach(img => saveImage(img));
        setUploadProgress(null);
        runImageAnalysis(newImages.filter(img => !img.recreationPrompt));
        if (onUploadSuccess) onUploadSuccess();
    }, [currentUser, settings, addNotification, setImages, runImageAnalysis, onUploadSuccess]);

    const handleFilesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) processFiles(event.target.files);
    }, [processFiles]);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            processFiles(event.dataTransfer.files);
        }
    }, [processFiles]);

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);

    const cancelUpload = useCallback(() => {
        uploadAbortRef.current = true;
    }, []);

    return {
        uploadProgress,
        handleFilesChange,
        handleDrop,
        handleDragOver,
        cancelUpload
    };
};
