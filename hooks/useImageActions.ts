
import React, { useState, useCallback } from 'react';
import { ImageInfo, User, Notification } from '../types';
import { saveImage, deleteImages } from '../utils/idb';

interface UseImageActionsProps {
    images: ImageInfo[];
    setImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    selectedIds: Set<string>;
    setSelectedIds: (ids: Set<string>) => void;
    currentUser: User | null;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
    toggleSelectionMode: () => void;
    setSelectedImage: React.Dispatch<React.SetStateAction<ImageInfo | null>>;
    setSimilarImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
}

export const useImageActions = ({
    images,
    setImages,
    selectedIds,
    setSelectedIds,
    currentUser,
    addNotification,
    toggleSelectionMode,
    setSelectedImage,
    setSimilarImages
}: UseImageActionsProps) => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleDeleteSelected = useCallback(() => {
        if (selectedIds.size === 0) return;

        const ownedIds = Array.from(selectedIds).filter(id => {
            const img = images.find(i => i.id === id);
            return img && img.ownerId === currentUser?.id;
        });

        if (ownedIds.length === 0) {
            addNotification({ status: 'error', message: "You can only delete images you own." });
            return;
        }

        if (ownedIds.length < selectedIds.size) {
            // We are only deleting a subset
            setSelectedIds(new Set(ownedIds));
        }

        setIsDeleteModalOpen(true);
    }, [selectedIds, images, currentUser, addNotification, setSelectedIds]);

    const handleConfirmDelete = useCallback(() => {
        const idsToDelete = Array.from(selectedIds);

        // Optimistic UI Update
        setImages(prev => {
            const imagesToDeleteSet = new Set(idsToDelete);
            // Revoke any existing blob URLs to prevent memory leaks
            prev.forEach(img => {
                if (imagesToDeleteSet.has(img.id) && img.videoUrl) {
                    URL.revokeObjectURL(img.videoUrl);
                }
            });
            return prev.filter(img => !imagesToDeleteSet.has(img.id));
        });

        // DB Operation
        deleteImages(idsToDelete as string[]).catch(e => {
            console.error("Failed to delete images from DB", e);
            addNotification({ status: 'error', message: 'Failed to delete some items.' });
        });

        setIsDeleteModalOpen(false);
        toggleSelectionMode(); // Exit selection mode
        setSelectedIds(new Set());
    }, [selectedIds, setImages, addNotification, toggleSelectionMode, setSelectedIds]);

    const handleCancelDelete = useCallback(() => {
        setIsDeleteModalOpen(false);
    }, []);

    const handleToggleImagePublicStatus = useCallback((imageId: string) => {
        // Find the image from the master list to determine its new status
        const originalImage = images.find(img => img.id === imageId);
        if (!originalImage) {
            console.warn(`Could not find image with id ${imageId} to toggle public status.`);
            return;
        };

        const updatedImage = { ...originalImage, isPublic: !originalImage.isPublic };

        // Save the change to the database
        saveImage(updatedImage).catch(e => console.error(`Failed to update public status for ${imageId} in DB`, e));

        // Update all relevant state variables to ensure the UI updates instantly
        setImages(prev => prev.map(img => (img.id === imageId ? updatedImage : img)));
        setSelectedImage(prev => (prev && prev.id === imageId ? updatedImage : prev));
        setSimilarImages(prev => prev.map(img => (img.id === imageId ? updatedImage : img)));
    }, [images, setImages, setSelectedImage, setSimilarImages]);

    const handleBatchMakePublic = useCallback(() => {
        const ids = Array.from(selectedIds);
        const ownedIds = ids.filter(id => {
            const img = images.find(i => i.id === id);
            return img && img.ownerId === currentUser?.id;
        });

        if (ownedIds.length === 0) {
            addNotification({ status: 'error', message: "You can only change visibility of images you own." });
            return;
        }

        // Calculate updates
        const updatedImages = images.map(img => {
            if (ownedIds.includes(img.id)) {
                return { ...img, isPublic: true };
            }
            return img;
        });

        setImages(updatedImages);

        // Batch save logic ideal, but iterative for now
        ownedIds.forEach(id => {
            const img = updatedImages.find(i => i.id === id);
            if (img) saveImage(img);
        });

        addNotification({ status: 'success', message: `${ownedIds.length} images made public.` });
        toggleSelectionMode(); // Exit selection mode
        setSelectedIds(new Set());
    }, [selectedIds, images, currentUser, addNotification, setImages, toggleSelectionMode, setSelectedIds]);

    const handleBatchMakePrivate = useCallback(() => {
        const ids = Array.from(selectedIds);
        const ownedIds = ids.filter(id => {
            const img = images.find(i => i.id === id);
            return img && img.ownerId === currentUser?.id;
        });

        if (ownedIds.length === 0) {
            addNotification({ status: 'error', message: "You can only change visibility of images you own." });
            return;
        }

        const updatedImages = images.map(img => {
            if (ownedIds.includes(img.id)) {
                return { ...img, isPublic: false };
            }
            return img;
        });

        setImages(updatedImages);
        ownedIds.forEach(id => {
            const img = updatedImages.find(i => i.id === id);
            if (img) saveImage(img);
        });

        addNotification({ status: 'success', message: `${ownedIds.length} images made private.` });
        toggleSelectionMode(); // Exit selection mode
        setSelectedIds(new Set());
    }, [selectedIds, images, currentUser, addNotification, setImages, toggleSelectionMode, setSelectedIds]);

    return {
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        handleDeleteSelected,
        handleConfirmDelete,
        handleCancelDelete,
        handleToggleImagePublicStatus,
        handleBatchMakePublic,
        handleBatchMakePrivate
    };
};
