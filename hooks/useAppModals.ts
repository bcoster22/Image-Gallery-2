import { useState, useEffect } from 'react';
import { ImageInfo, AspectRatio } from '../types';
import { PromptModalConfig } from '../components/PromptModal/types';

interface UseAppModalsProps {
    selectedImage: ImageInfo | null;
    isSelectionMode: boolean;
    selectedIds: Set<string>;
    clearSelection: () => void;
    toggleSelectionMode: () => void;
}

export const useAppModals = ({
    selectedImage,
    isSelectionMode,
    selectedIds,
    clearSelection,
    toggleSelectionMode
}: UseAppModalsProps) => {
    // All modal states owned by this hook
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBatchRemixModalOpen, setIsBatchRemixModalOpen] = useState(false);
    const [promptModalConfig, setPromptModalConfig] = useState<PromptModalConfig | null>(null);
    const [veoRetryState, setVeoRetryState] = useState<{ sourceImage: ImageInfo | null, prompt: string, aspectRatio: AspectRatio } | null>(null);

    // Full screen overlays
    const [showSystemLogs, setShowSystemLogs] = useState(false);
    const [showDuplicates, setShowDuplicates] = useState(false);
    const [showHealthDashboard, setShowHealthDashboard] = useState(false);
    const [showPerformanceOverview, setShowPerformanceOverview] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if input/textarea is focused to prevent closing while typing
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === 'Escape') {
                // Priority 1: High-level modals
                if (veoRetryState) { setVeoRetryState(null); return; }
                if (isLoginModalOpen) { setIsLoginModalOpen(false); return; }
                if (promptModalConfig) { setPromptModalConfig(null); return; }
                if (isBatchRemixModalOpen) { setIsBatchRemixModalOpen(false); return; }
                if (isDeleteModalOpen) { setIsDeleteModalOpen(false); return; }

                // Priority 2: Full-screen overlays
                if (showSystemLogs) { setShowSystemLogs(false); return; }
                if (showDuplicates) { setShowDuplicates(false); return; }
                if (showHealthDashboard) { setShowHealthDashboard(false); return; }
                if (showPerformanceOverview) { setShowPerformanceOverview(false); return; }

                // Priority 3: Selection Mode (only if no ImageViewer or PerformanceOverview)
                const isImageViewerOpen = !!selectedImage;
                const isPerformanceOpen = showPerformanceOverview;

                if (!isImageViewerOpen && !isPerformanceOpen) {
                    if (isSelectionMode) {
                        if (selectedIds.size > 0) clearSelection();
                        else toggleSelectionMode();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        veoRetryState, isLoginModalOpen, promptModalConfig, isBatchRemixModalOpen, isDeleteModalOpen,
        showSystemLogs, showDuplicates, showHealthDashboard, showPerformanceOverview,
        selectedImage, isSelectionMode, selectedIds,
        clearSelection, toggleSelectionMode
    ]);

    return {
        isLoginModalOpen,
        setIsLoginModalOpen,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        isBatchRemixModalOpen,
        setIsBatchRemixModalOpen,
        promptModalConfig,
        setPromptModalConfig,
        veoRetryState,
        setVeoRetryState,
        showSystemLogs,
        setShowSystemLogs,
        showDuplicates,
        setShowDuplicates,
        showHealthDashboard,
        setShowHealthDashboard,
        showPerformanceOverview,
        setShowPerformanceOverview
    };
};
