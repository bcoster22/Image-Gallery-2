import React from 'react';
import EnhancePlayer from '../../EnhancePlayer';
import { ImageInfo, UpscaleSettings, AIModelSettings, AdminSettings } from '../../../types';
import * as aiService from '../../../services/aiService';

interface EnhanceWrapperProps {
    image: ImageInfo;
    upscaleSettings: UpscaleSettings;
    aiModelSettings: AIModelSettings;
    onAiSettingsChange: (s: AIModelSettings) => void;
    settings: AdminSettings | null;
    availableProviders: { id: string; name: string }[];
    batchImages?: ImageInfo[];
    onSaveGeneratedImage?: (dataUrl: string, prompt: string, metadata?: any) => void;
    promptHistory?: string[];
}

const EnhanceWrapper: React.FC<EnhanceWrapperProps> = ({
    image: initialImage,
    upscaleSettings,
    aiModelSettings,
    onAiSettingsChange,
    settings,
    availableProviders,
    batchImages,
    onSaveGeneratedImage,
    promptHistory
}) => {
    // Batch State
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [results, setResults] = React.useState<Record<string, string>>({}); // imageId -> dataUrl

    // Determine current image
    const images = batchImages && batchImages.length > 0 ? batchImages : [initialImage];
    const currentImage = images[currentIndex];
    const resultImage = results[currentImage.id];

    const hasNext = currentIndex < images.length - 1;
    const hasPrev = currentIndex > 0;

    const handleNavigate = (direction: 'next' | 'prev') => {
        if (direction === 'next' && hasNext) setCurrentIndex(prev => prev + 1);
        if (direction === 'prev' && hasPrev) setCurrentIndex(prev => prev - 1);
    };

    const handleGenerate = async (aiSettings: AIModelSettings, autoSave: boolean = false) => {
        console.log('Batch Generate with:', aiSettings, 'Count:', images.length, 'AutoSave:', autoSave);
        if (!settings) return null;

        // Process ALL images if in batch mode (implied by having > 1 image)
        // Or should "Run" just run the current one?
        // User asked: "support batch processing... using settings of first image"
        // This implies hitting run processes the batch.

        let lastResult = null;

        // Iterate through all images
        for (const img of images) {
            // Skip if already processed? Maybe not, allow re-run.

            // Deep clone settings
            const tempSettings = JSON.parse(JSON.stringify(settings));
            const providerId = aiSettings.provider || 'moondream_local';
            if (!tempSettings.providers[providerId]) tempSettings.providers[providerId] = {};
            if (aiSettings.model) tempSettings.providers[providerId].model = aiSettings.model;
            if (!tempSettings.providers[providerId].args) tempSettings.providers[providerId].args = {};
            if (aiSettings.steps) tempSettings.providers[providerId].args.steps = aiSettings.steps;
            if (aiSettings.cfg_scale) tempSettings.providers[providerId].args.guidance_scale = aiSettings.cfg_scale;

            const prompt = aiSettings.enhancement_prompt || "Professional quality, high resolution, sharp focus";

            try {
                const result = await aiService.editImage(
                    img,
                    prompt,
                    tempSettings,
                    aiSettings.denoise_strength ? aiSettings.denoise_strength / 100 : 0.3
                );

                if (result && result.image) {
                    setResults(prev => ({ ...prev, [img.id]: result.image }));
                    lastResult = result.image;

                    if (autoSave && onSaveGeneratedImage) {
                        onSaveGeneratedImage(result.image, prompt, { sourceImageId: img.id, ...aiSettings });
                    }
                }
            } catch (e) {
                console.error(`Generation Failed for ${img.id}:`, e);
            }
        }

        return lastResult; // Return the result of the LAST processed image (or current? logic differs)
        // EnhancePlayer expects the result for the *current context*.
        // But since we process async, the UI might need to update live.
        // We are relying on `results` state to update the UI via prop.
        // Returning null here might be safer to stop Player from auto-setting its own internal state incorrectly?
        // Actually Player syncs with `resultImage` prop now.
        return results[currentImage.id] || lastResult;
    };

    return (
        <div className="flex-grow flex flex-col h-full overflow-hidden bg-black">
            <EnhancePlayer
                sourceImage={currentImage}
                upscaleSettings={upscaleSettings}
                aiSettings={aiModelSettings}
                onAiSettingsChange={onAiSettingsChange}
                onPreviewGenerate={handleGenerate}
                onNavigate={handleNavigate}
                hasNext={hasNext}
                hasPrev={hasPrev}
                availableProviders={availableProviders.map(m => ({ id: m.id, name: m.name }))}
                resultImage={resultImage}
                isBatchProcessing={images.length > 1}
                promptHistory={promptHistory}
            />
        </div>
    );
};

export default EnhanceWrapper;
