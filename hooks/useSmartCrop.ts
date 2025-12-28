import React, { useRef, useCallback, useEffect } from 'react';
import { ImageInfo, AdminSettings, User } from '../types';
import { QueueStatus } from '../types/queue';
import { detectSubject } from '../services/aiService';
import { updateImage } from '../utils/idb';

interface UseSmartCropProps {
    settings: AdminSettings | null;
    currentUser: User | null;
    images: ImageInfo[];
    setImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    addNotification: (notification: any) => void;
    processingSmartCropIds: Set<string>;
    setProcessingSmartCropIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    activeRequestsRef: React.MutableRefObject<number>;
    syncQueueStatus: () => void;
}

export const useSmartCrop = ({
    settings,
    currentUser,
    images,
    setImages,
    addNotification,
    processingSmartCropIds,
    setProcessingSmartCropIds,
    activeRequestsRef,
    syncQueueStatus
}: UseSmartCropProps) => {

    const performSmartCrop = useCallback(async (image: ImageInfo, isBackground: boolean = false) => {
        if (!settings) return;

        setProcessingSmartCropIds(prev => new Set(prev).add(image.id));
        activeRequestsRef.current++; // Increment global active request counter for queue management
        syncQueueStatus();

        try {
            if (!isBackground && !currentUser?.disableSmartCropNotifications) {
                addNotification({ status: 'info', message: 'Smart Cropping ' + image.fileName + '...' });
            }

            const crop = await detectSubject(image, settings);
            if (crop) {
                await updateImage(image.id, { smartCrop: crop });
                setImages(prev => prev.map(img => img.id === image.id ? { ...img, smartCrop: crop } : img));
                if (!isBackground && !currentUser?.disableSmartCropNotifications) {
                    addNotification({ status: 'success', message: 'Smart Crop complete.' });
                }
            }
        } catch (e) {
            console.error('Smart crop failed for ' + image.id, e);
            if (!isBackground && !currentUser?.disableSmartCropNotifications) {
                addNotification({ status: 'error', message: 'Failed to crop ' + image.fileName });
            }
        } finally {
            activeRequestsRef.current--;
            syncQueueStatus();
            setProcessingSmartCropIds(prev => {
                const next = new Set(prev);
                next.delete(image.id);
                return next;
            });
        }
    }, [settings, currentUser, setImages, addNotification, setProcessingSmartCropIds, activeRequestsRef, syncQueueStatus]);

    const handleSmartCrop = useCallback(async (selectedIds: Set<string>, toggleSelectionMode: (enabled: boolean) => void, setSelectedIds: (ids: Set<string>) => void) => {
        const idsToProcess = Array.from(selectedIds);
        const pendingIds = idsToProcess.filter(id => {
            const img = images.find(i => i.id === id);
            return img && !img.smartCrop;
        });

        if (pendingIds.length === 0) {
            addNotification({ status: 'info', message: "All selected images already have Smart Crop." });
            toggleSelectionMode(false);
            setSelectedIds(new Set());
            return;
        }

        addNotification({ status: 'info', message: 'Smart Cropping ' + pendingIds.length + ' images...' });

        for (const id of pendingIds) {
            const image = images.find(img => img.id === id);
            if (image) {
                await performSmartCrop(image, false);
            }
        }

        toggleSelectionMode(false);
        setSelectedIds(new Set());
    }, [images, performSmartCrop, addNotification]);

    return { performSmartCrop, handleSmartCrop };
};
