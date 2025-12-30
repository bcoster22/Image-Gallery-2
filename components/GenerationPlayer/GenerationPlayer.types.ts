import { GenerationSettings, AspectRatio, AiProvider, ImageInfo } from '../../types';

// UI Representation of a Provider with its available models
export interface UiProvider {
    id: AiProvider;
    name: string;
    models?: string[];
}

export interface GenerationPlayerProps {
    prompt: string;
    onPromptChange: (prompt: string) => void;
    negativePrompt: string;
    onNegativePromptChange: (negativePrompt: string) => void;
    settings: GenerationSettings;
    onSettingsChange: (settings: GenerationSettings) => void;
    availableProviders: UiProvider[];
    selectedProvider: string;
    onProviderChange: (providerId: string) => void;
    generatedImage: string | null;
    isGenerating: boolean;
    progress: number;
    onGenerate: () => void;
    onClose: () => void;
    onSave: () => void;

    // Optional/New Props
    initialImage?: ImageInfo; // For remixing context
    aspectRatio?: AspectRatio;
    onAspectRatioChange?: (ratio: AspectRatio) => void;
    randomAspectRatio?: boolean;
    onRandomAspectRatioChange?: (enabled: boolean) => void;
    batchCount?: number;
    onBatchCountChange?: (count: number) => void;
    autoSeedAdvance?: boolean;
    onAutoSeedAdvanceChange?: (enabled: boolean) => void;

    // Navigation (Optional)
    onPrev?: () => void;
    onNext?: () => void;
    sessionImages?: ImageInfo[]; // For navigation context

    // History
    promptHistory?: string[]; // Added: History for positive prompts
    maxBatchCount?: number;
    onMaxBatchCountChange?: (max: number) => void;
    negativePromptHistory?: string[];
    onDeleteNegativePrompt?: (prompt: string) => void;

    enabledRandomRatios?: AspectRatio[];
    onEnabledRandomRatiosChange?: (ratios: AspectRatio[]) => void;

    slideshowSpeed?: number;
    onSlideshowSpeedChange?: (speed: number) => void;
}

export const AspectRatios: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];
