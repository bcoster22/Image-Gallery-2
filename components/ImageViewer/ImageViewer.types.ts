import { ImageInfo, AdminSettings, User, AspectRatio } from '../../types';
import { PromptModalConfig } from '../PromptModal/types';

export type AnimationState = 'idle' | 'generatingKeywords' | 'selectingKeywords' | 'enhancingPrompt';

export interface ImageViewerProps {
    initialImage: ImageInfo;
    contextImages: ImageInfo[];
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
    settings: AdminSettings | null;
    onKeywordClick: (keyword: string) => void;
    onSaveGeneratedImage: (base64Image: string, isPublic: boolean, prompt: string) => void;
    onSaveEnhancedImage: (base64Image: string, isPublic: boolean, prompt: string) => void;
    onStartAnimation: (image: ImageInfo, prompt: string, aspectRatio: AspectRatio) => void;
    onTogglePublicStatus: (imageId: string) => void;
    currentUser: User | null;
    promptHistory: string[];
    setPromptModalConfig: (config: PromptModalConfig | null) => void;
    addNotification: (notification: { status: 'success' | 'error'; message: string; }) => void;
    onRetryAnalysis?: (imageId: string) => void;
    onRegenerateCaption?: (imageId: string) => void;
    onSmartCrop: (image: ImageInfo) => void;
    processingSmartCropIds?: Set<string>;
    analyzingIds?: Set<string>;
}

export interface ActionButtonsProps {
    image: ImageInfo;
    onRecreate: (aspectRatio: AspectRatio, promptOverride?: string) => void;
    onAnimate: (aspectRatio: AspectRatio) => void;
    onEnhance: () => void;
    onRegenerateCaption?: () => void;
    onSmartCrop: () => void;
    isSmartCropping: boolean;
    isSmartFilled: boolean;
    isPreparingAnimation: boolean;
    settings: AdminSettings | null;
    currentUser: User | null;
    isFloating: boolean;
    onGenerate: (aspectRatio: AspectRatio) => void;
}

export interface MetadataPanelProps {
    image: ImageInfo;
    onRecreate: (aspectRatio: AspectRatio) => void;
    onGenerate: (aspectRatio: AspectRatio) => void;
    isPreparingAnimation: boolean;
    onAnimate: (aspectRatio: AspectRatio) => void;
    onEnhance: () => void;
    onKeywordClick: (keyword: string) => void;
    onTogglePublicStatus: (imageId: string) => void;
    onCopyPrompt: () => void;
    isCopied: boolean;
    settings: AdminSettings | null;
    currentUser: User | null;
    isVisible: boolean;
    onRetryAnalysis?: (imageId: string) => void;

    onRegenerateCaption?: (imageId: string) => void;
    onSmartCrop: () => void;
    isSmartCropping: boolean;
    isSmartFilled: boolean;
    // Slideshow props
    isSlideshowActive: boolean;
    onToggleSlideshow: () => void;
    slideshowDelay: number;
    onSlideshowDelayChange: (delay: number) => void;
    hasMultipleImages: boolean;
    activeContext: 'caption' | 'metadata';
    setActiveContext: (context: 'caption' | 'metadata') => void;
}

export interface ThumbnailStripProps {
    images: ImageInfo[];
    currentIndex: number;
    onSelect: (index: number) => void;
    settings: AdminSettings | null;
    currentUser: User | null;
    isVisible: boolean;
}
