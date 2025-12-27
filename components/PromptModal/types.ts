import { ImageInfo, AspectRatio, AdminSettings, AiProvider, UpscaleSettings, GenerationSettings } from '../../types';

export interface PromptModalConfig {
    taskType: 'image' | 'video' | 'enhance';
    initialPrompt: string;
    aspectRatio?: AspectRatio;
    image?: ImageInfo;
    batchImages?: ImageInfo[];
}

export interface PromptSubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (prompt: string, options: {
        aspectRatio?: AspectRatio;
        useSourceImage?: boolean;
        providerId?: AiProvider;
        generationSettings?: GenerationSettings | UpscaleSettings;
        autoSaveToGallery?: boolean;
    }) => void;
    config: PromptModalConfig | null;
    promptHistory: string[];
    negativePromptHistory?: string[];
    onSaveNegativePrompt?: (prompt: string) => void;
    settings: AdminSettings | null;
    onSaveGeneratedImage?: (dataUrl: string, prompt: string, metadata?: any) => void;
    onAddToGenerationQueue?: (items: import('../../types').QueueItem[]) => void;
    queuedGenerationCount?: number;
    generationResults?: { id: string; url: string }[]; // Completed images from queue
    onDeleteNegativePrompt?: (prompt: string) => void;
}
