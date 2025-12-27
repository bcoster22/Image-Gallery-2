import React, { useState, useEffect, useRef } from 'react';
import { ImageInfo, AspectRatio, GenerationSettings, AiProvider } from '../../../types';
import GenerationPlayer from '../../GenerationPlayer';
import { PromptSubmissionModalProps } from '../types';

interface GenerationWrapperProps {
    prompt: string;
    onPromptChange: (p: string) => void;
    negativePrompt: string;
    onNegativePromptChange: (np: string) => void;
    settings: GenerationSettings | null;
    onSettingsChange: (s: GenerationSettings) => void;
    availableProviders: { id: string; name: string }[];
    selectedProvider: string;
    onProviderChange: (p: string) => void;
    currentModelOptions: { value: string; label: string }[];

    // Parent callbacks
    onClose: () => void;
    onAddToGenerationQueue: Required<PromptSubmissionModalProps>['onAddToGenerationQueue'];
    onSaveNegativePrompt: PromptSubmissionModalProps['onSaveNegativePrompt'];
    onDeleteNegativePrompt: PromptSubmissionModalProps['onDeleteNegativePrompt'];
    generationResults: PromptSubmissionModalProps['generationResults'];

    // History
    negativePromptHistory: string[];

    // Config
    configImage?: ImageInfo;
}

const GenerationWrapper: React.FC<GenerationWrapperProps> = ({
    prompt, onPromptChange,
    negativePrompt, onNegativePromptChange,
    settings, onSettingsChange,
    availableProviders,
    selectedProvider, onProviderChange,
    currentModelOptions,
    onClose,
    onAddToGenerationQueue,
    onSaveNegativePrompt,
    onDeleteNegativePrompt,
    generationResults,
    negativePromptHistory,
    configImage
}) => {
    // Local State specific to Generation Logic
    const [batchCount, setBatchCount] = useState(1);
    const [autoSave, setAutoSave] = useState(true);
    const [autoSeedAdvance, setAutoSeedAdvance] = useState(true);

    const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('1:1');
    const [randomAspectRatio, setRandomAspectRatio] = useState(false);
    const [enabledRandomRatios, setEnabledRandomRatios] = useState<AspectRatio[]>(['16:9', '9:16', '1:1', '4:3', '3:4']);

    // Session State
    const [generatedImage, setGeneratedImage] = useState<{ id: string; url: string } | null>(null);
    const [sessionImages, setSessionImages] = useState<{ id: string; url: string }[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState<number>(-1);

    // Playback State
    const [autoPlay, setAutoPlay] = useState(false);
    const [slideshowSpeed, setSlideshowSpeed] = useState(3000);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Sync generationResults to sessionImages
    useEffect(() => {
        if (generationResults && generationResults.length > 0) {
            setSessionImages(prev => {
                const existingIds = new Set(prev.map(img => img.id));
                const newImages = generationResults.filter(img => !existingIds.has(img.id));

                // If we found new images
                if (newImages.length > 0) {
                    const updated = [...prev, ...newImages];

                    // If we were at the end (or viewing the previously latest), jump to the new latest?
                    // Or if autoPlay is on, it will pick it up.
                    // Default behavior: Jump to latest if this is a fresh generation batch
                    if (!autoPlay) {
                        // We can't easily detect "fresh batch" here without more state, 
                        // but setting index to end is usually what users want when new stuff arrives.
                        setTimeout(() => setCurrentImageIndex(updated.length - 1), 0);
                    }

                    return updated;
                }
                return prev;
            });
        }
    }, [generationResults, autoPlay]);

    // Derived Image View
    useEffect(() => {
        if (currentImageIndex >= 0 && currentImageIndex < sessionImages.length) {
            setGeneratedImage(sessionImages[currentImageIndex]);
        }
    }, [currentImageIndex, sessionImages]);

    // Slideshow Logic
    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (autoPlay && sessionImages.length > 1) {
            intervalRef.current = setInterval(() => {
                setCurrentImageIndex(prev => {
                    if (prev >= sessionImages.length - 1) return 0;
                    return prev + 1;
                });
            }, slideshowSpeed);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [autoPlay, sessionImages.length, slideshowSpeed]);

    // Handlers
    const handlePrev = () => {
        if (currentImageIndex > 0) setCurrentImageIndex(prev => prev - 1);
    };

    const handleNext = () => {
        if (currentImageIndex < sessionImages.length - 1) setCurrentImageIndex(prev => prev + 1);
    };

    const handlePlayerGenerate = async () => {
        if (!prompt || !settings) return;

        // Create queue items
        const queueItems: import('../../../types').QueueItem[] = [];
        let currentSeed = settings.seed ?? -1;

        for (let i = 0; i < batchCount; i++) {
            let currentAspectRatio = selectedAspectRatio || '1:1';
            if (randomAspectRatio) {
                const ratios = enabledRandomRatios.length > 0 ? enabledRandomRatios : ['1:1', '16:9', '9:16', '4:3', '3:4'];
                currentAspectRatio = ratios[Math.floor(Math.random() * ratios.length)];
            }

            const finalPrompt = negativePrompt.trim() ? `${prompt} | negative: ${negativePrompt}` : prompt;

            const genSettings: GenerationSettings = {
                provider: (selectedProvider === 'auto' ? 'moondream_local' : selectedProvider) as AiProvider,
                model: settings.model || 'flux-dev',
                steps: settings.steps || 28,
                denoise: settings.denoise || 100,
                cfg_scale: settings.cfg_scale || 7,
                seed: currentSeed
            };

            queueItems.push({
                id: crypto.randomUUID(),
                taskType: 'generate',
                fileName: `${prompt.slice(0, 30)}... [${i + 1}/${batchCount}]`,
                addedAt: Date.now(),
                priority: 2,
                data: {
                    prompt: finalPrompt,
                    aspectRatio: currentAspectRatio,
                    sourceImage: configImage,
                    generationSettings: genSettings
                }
            });

            if (autoSeedAdvance && currentSeed !== -1) {
                currentSeed += 1;
            }
        }

        if (negativePrompt.trim() && onSaveNegativePrompt) {
            onSaveNegativePrompt(negativePrompt.trim());
        }

        onAddToGenerationQueue(queueItems);

        // If we are starting a generation, we might want to auto-enable slideshow or something?
        // Original code didn't do explicitly here, but kept modal open.
    };

    const handlePlayerSave = () => {
        // This is technically usually "Save to Gallery" but `onSaveGeneratedImage` prop 
        // was passed to PromptSubmissionModal. 
        // But in GenerationPlayer mode, we depend on "autoSave" usually?
        // Or the user clicks "Save/Export" in the Player UI.
        console.log("Save triggered from Player - functionality to be wired if needed distinct from Auto-Save");
    };

    // Calculate progress (This is a simplified progress, 
    // real progress comes from the App via generationResults arriving)
    // We can infer progress by how many items we expected vs how many arrived.
    // But for now, we leave progress as 0 or handle it via a new prop if needed.
    // The original code tracked `progress` locally but it was mocked/simulated.
    const isGenerating = false; // We don't strictly know if it's generating without checking the queue status passed in.
    // For now, we will assume 'isGenerating' is handled by the Queue visible elsewhere or we can pass `queuedGenerationCount` in.

    // Wait, the orchestrator needs to know if it's generating to show the spinner.
    // We can use `queuedGenerationCount` from props if we pass it down.

    return (
        <div className="flex-grow flex flex-col h-full overflow-hidden bg-black">
            <GenerationPlayer
                prompt={prompt}
                onPromptChange={onPromptChange}
                negativePrompt={negativePrompt}
                onNegativePromptChange={onNegativePromptChange}

                settings={settings}
                onSettingsChange={onSettingsChange}

                availableProviders={availableProviders.map(p => ({ id: p.id as AiProvider, name: p.name }))}
                selectedProvider={selectedProvider}
                onProviderChange={onProviderChange}

                aspectRatio={selectedAspectRatio}
                onAspectRatioChange={setSelectedAspectRatio}

                generatedImage={generatedImage?.url || null}
                isGenerating={isGenerating} // TODO: hook up to real queue status
                progress={0}

                onGenerate={handlePlayerGenerate}
                onSave={handlePlayerSave}
                onClose={onClose}

                // modelOptions={currentModelOptions} // Passed in Player? No, Player uses Providers + Settings.

                batchCount={batchCount}
                onBatchCountChange={setBatchCount}
                // autoSave={autoSave}
                // onAutoSaveChange={setAutoSave}
                autoSeedAdvance={autoSeedAdvance}
                onAutoSeedAdvanceChange={setAutoSeedAdvance}

                sessionImages={sessionImages}
                // currentImageIndex={currentImageIndex} // Player handles its own index or uses displayImage? 
                // Using new GenerationPlayer props:
                initialImage={configImage} // Fallback
                onPrev={handlePrev}
                onNext={handleNext}

                // batchProgress={{ current: completedInBatch, total: batchCount }}

                // autoPlay={autoPlay} 
                // onAutoPlayChange={setAutoPlay} // Not in new Player props? 
                // New Player has `slideshowSpeed` but logic is inside wrapper here? 
                // New GenerationPlayer DOES NOT HAVE autoPlay props in the signature I saw earlier.
                // It has `slideshowSpeed` prop.

                randomAspectRatio={randomAspectRatio}
                onRandomAspectRatioChange={setRandomAspectRatio}
                enabledRandomRatios={enabledRandomRatios}
                onEnabledRandomRatiosChange={setEnabledRandomRatios}

                negativePromptHistory={negativePromptHistory}
                onDeleteNegativePrompt={onDeleteNegativePrompt}
                slideshowSpeed={slideshowSpeed}
                onSlideshowSpeedChange={setSlideshowSpeed}
            />
        </div>
    );
};

export default GenerationWrapper;
