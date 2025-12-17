import React, { useState, useEffect, useMemo } from 'react';
import { ImageInfo, AspectRatio, AdminSettings, AiProvider, UpscaleSettings, GenerationSettings, AIModelSettings } from '../types';
import { CloseIcon, SparklesIcon, VideoCameraIcon, WandIcon } from './icons';
import EnhancePlayer from './EnhancePlayer';
import AIModelSettingsPanel from './AIModelSettingsPanel';
import AdvancedSettingsPanel from './AdvancedSettingsPanel';
import GenerationPlayer from './GenerationPlayer';
import * as aiService from '../services/aiService';

export interface PromptModalConfig {
    taskType: 'image' | 'video' | 'enhance';
    initialPrompt: string;
    aspectRatio?: AspectRatio;
    image?: ImageInfo;
}

interface PromptSubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (prompt: string, options: {
        aspectRatio?: AspectRatio;
        useSourceImage?: boolean;
        providerId?: AiProvider;
        generationSettings?: GenerationSettings | UpscaleSettings;
    }) => void;
    config: PromptModalConfig | null;
    promptHistory: string[];
    negativePromptHistory?: string[];
    onSaveNegativePrompt?: (prompt: string) => void;
    settings: AdminSettings | null;
    onSaveGeneratedImage?: (dataUrl: string, prompt: string, metadata?: any) => void;
    onAddToGenerationQueue?: (items: import('../types').QueueItem[]) => void;
    queuedGenerationCount?: number;
}

const titles = {
    image: { icon: SparklesIcon, text: "Generate Image with AI" },
    video: { icon: VideoCameraIcon, text: "Generate Video with AI" },
    enhance: { icon: WandIcon, text: "Enhance & Upscale Image" },
}

const PromptSubmissionModal: React.FC<PromptSubmissionModalProps> = ({ isOpen, onClose, onSubmit, config, promptHistory, negativePromptHistory = [], onSaveNegativePrompt, settings, onSaveGeneratedImage, onAddToGenerationQueue, queuedGenerationCount = 0 }) => {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio | undefined>('9:16');
    const [useSourceImage, setUseSourceImage] = useState(true);
    const [selectedProvider, setSelectedProvider] = useState<string>('auto');

    // Player State (Txt2Img)
    const [generatedImage, setGeneratedImage] = useState<{ id: string; url: string } | null>(null);
    const [sessionImages, setSessionImages] = useState<{ id: string; url: string }[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState<number>(-1);

    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [batchCount, setBatchCount] = useState(1);
    const [completedInBatch, setCompletedInBatch] = useState(0);
    const [autoSave, setAutoSave] = useState(true);
    const [autoSeedAdvance, setAutoSeedAdvance] = useState(false);
    const [autoPlay, setAutoPlay] = useState(true);
    const [randomAspectRatio, setRandomAspectRatio] = useState(false);
    // Random Ratio Pool
    const [enabledRandomRatios, setEnabledRandomRatios] = useState<AspectRatio[]>(['1:1', '16:9', '9:16', '4:3', '3:4']);

    // State for Advanced Settings
    const [advancedSettings, setAdvancedSettings] = useState<GenerationSettings | UpscaleSettings | null>(null);
    const [aiModelSettings, setAIModelSettings] = useState<AIModelSettings>({
        model: 'sdxl-realism',
        steps: 30,
        cfg_scale: 6.5,
        denoise_strength: 30,
        enhancement_prompt: 'professional quality, enhanced details, sharp focus',
        negative_prompt: 'blur, noise, artifacts, distortion',
        seed: -1
    });
    useEffect(() => {
        if (config) {
            // Parse Negative Prompt if present
            const fullPrompt = config.initialPrompt;
            if (fullPrompt.includes('| negative:')) {
                const parts = fullPrompt.split('| negative:');
                setPrompt(parts[0].trim());
                setNegativePrompt(parts[1].trim());
            } else {
                setPrompt(fullPrompt);
                setNegativePrompt('');
            }

            setSelectedAspectRatio(config.aspectRatio);
            // Default to using the source image if one is provided, UNLESS it's a video task where explicitly set otherwise.
            // Actually, logic is: video usually behaves better with just prompt unless specified.
            setUseSourceImage(config.taskType === 'video' ? false : !!config.image);
            setSelectedProvider('auto');

            // Initialize advanced settings based on task type
            if (config.taskType === 'enhance') {
                setAdvancedSettings({
                    provider: 'moondream_local', // default
                    model: 'real-esrgan-x4plus',
                    method: 'real-esrgan',
                    targetMegapixels: 16,
                    tiled: true,
                    tile_size: 512,
                    tile_overlap: 32,
                    denoise: 50
                } as UpscaleSettings);
            } else {
                setAdvancedSettings({
                    provider: 'moondream_local',
                    model: 'sdxl-realism',
                    steps: 30,
                    denoise: 75,
                    cfg_scale: 7,
                    seed: -1,
                    ratio: config.aspectRatio || '1:1'
                } as GenerationSettings);
            }
        }
    }, [config]);

    // Derived Logic for Mode
    const isPlayerMode = config?.taskType === 'image' && !config.image;

    // Sync current image view
    useEffect(() => {
        if (currentImageIndex >= 0 && currentImageIndex < sessionImages.length) {
            setGeneratedImage(sessionImages[currentImageIndex]);
        }
    }, [currentImageIndex, sessionImages]);

    // Slideshow / Auto-Play Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;

        // Mode 1: During Generation -> handled by the generation loop (always jumps to latest if autoPlay is on)

        // Mode 2: After Generation (Review) -> Cycle through images
        if (autoPlay && !isGenerating && sessionImages.length > 1) {
            interval = setInterval(() => {
                setCurrentImageIndex(prev => {
                    // Loop back to start
                    if (prev >= sessionImages.length - 1) return 0;
                    return prev + 1;
                });
            }, 3000); // 3s per slide
        }

        return () => clearInterval(interval);
    }, [autoPlay, isGenerating, sessionImages.length]);

    // Handlers for Player
    const handlePlayerGenerate = async () => {
        if (!prompt || isGenerating || !settings) return;

        console.log('[PromptSubmissionModal] handlePlayerGenerate called');
        console.log('[PromptSubmissionModal] onAddToGenerationQueue:', onAddToGenerationQueue);

        // Queue mode is REQUIRED for memory safety
        if (!onAddToGenerationQueue) {
            console.error('[PromptSubmissionModal] ERROR: onAddToGenerationQueue callback is missing!');
            alert('Generation queue is not available. Please refresh the page.');
            return;
        }

        // Create queue items
        const queueItems: import('../types').QueueItem[] = [];
        let currentSeed = (advancedSettings as GenerationSettings)?.seed ?? -1;

        for (let i = 0; i < batchCount; i++) {
            // Determine aspect ratio for this generation
            let currentAspectRatio = selectedAspectRatio || '1:1';
            if (randomAspectRatio) {
                const ratios = enabledRandomRatios.length > 0 ? enabledRandomRatios : ['1:1', '16:9', '9:16', '4:3', '3:4'];
                currentAspectRatio = ratios[Math.floor(Math.random() * ratios.length)];
            }

            // Construct final prompt with negative
            const finalPrompt = negativePrompt.trim() ? `${prompt} | negative: ${negativePrompt}` : prompt;

            // Snapshot of generation settings for this item
            const genSettings: GenerationSettings = {
                provider: (selectedProvider === 'auto' ? 'moondream_local' : selectedProvider) as AiProvider,
                model: (advancedSettings as GenerationSettings)?.model || 'flux-dev',
                steps: (advancedSettings as GenerationSettings)?.steps || 28,
                denoise: (advancedSettings as GenerationSettings)?.denoise || 100,
                cfg_scale: (advancedSettings as GenerationSettings)?.cfg_scale || 7,
                seed: currentSeed
            };

            queueItems.push({
                id: crypto.randomUUID(),
                taskType: 'generate',
                fileName: `${prompt.slice(0, 30)}... [${i + 1}/${batchCount}]`,
                addedAt: Date.now(),
                data: {
                    prompt: finalPrompt,
                    aspectRatio: currentAspectRatio,
                    sourceImage: config?.image,
                    generationSettings: genSettings
                }
            });

            // Auto-advance seed if enabled
            if (autoSeedAdvance && currentSeed !== -1) {
                currentSeed += 1;
            }
        }

        // Save negative prompt to history
        if (negativePrompt.trim() && onSaveNegativePrompt) {
            onSaveNegativePrompt(negativePrompt.trim());
        }

        console.log('[PromptSubmissionModal] Adding', queueItems.length, 'items to queue');

        // Add to queue and close modal
        onAddToGenerationQueue(queueItems);
        onClose();
        return;
    };

    const handlePlayerSave = () => {
        if (generatedImage && onSaveGeneratedImage) {
            const metadata = {
                provider: selectedProvider,
                model: (advancedSettings as GenerationSettings)?.model || 'unknown',
                steps: (advancedSettings as GenerationSettings)?.steps,
                cfg: (advancedSettings as GenerationSettings)?.cfg_scale,
                seed: (advancedSettings as GenerationSettings)?.seed,
                aspectRatio: selectedAspectRatio || '1:1'
            };
            onSaveGeneratedImage(generatedImage.url, prompt, metadata);
        }
    };

    const handlePrev = () => {
        if (currentImageIndex > 0) setCurrentImageIndex(currentImageIndex - 1);
    };

    const handleNext = () => {
        if (currentImageIndex < sessionImages.length - 1) setCurrentImageIndex(currentImageIndex + 1);
    };

    const availableModels = useMemo(() => {
        if (!settings || !config) return [];
        const models: { id: AiProvider; name: string; model?: string | null }[] = [];

        const { providers } = settings;

        if (config.taskType === 'image') {
            if (providers.gemini.apiKey) models.push({ id: 'gemini', name: 'Google Gemini', model: providers.gemini.generationModel });
            if (providers.openai.apiKey) models.push({ id: 'openai', name: 'OpenAI DALL-E', model: providers.openai.generationModel });
            if (providers.grok.apiKey) models.push({ id: 'grok', name: 'xAI Grok', model: providers.grok.generationModel });
            if (providers.comfyui.endpoint) models.push({ id: 'comfyui', name: 'ComfyUI (Local)', model: 'Workflow' });
            if (providers.moondream_local.endpoint) {
                models.push({ id: 'moondream_local', name: 'Moondream Local', model: providers.moondream_local.model });
            }
        } else if (config.taskType === 'video') {
            if (providers.gemini.apiKey) models.push({ id: 'gemini', name: 'Google Veo', model: providers.gemini.veoModel });
        } else if (config.taskType === 'enhance') {
            // Enhance capabilities
            if (providers.gemini.apiKey) models.push({ id: 'gemini', name: 'Google Gemini', model: 'Imagen' });
            if (providers.comfyui.endpoint) models.push({ id: 'comfyui', name: 'ComfyUI', model: 'Upscale' });
            models.push({ id: 'moondream_local', name: 'Moondream Station', model: 'Standard' });
        }

        return models;
    }, [settings, config]);

    // Dynamic Model Options Logic
    const currentModelOptions = useMemo(() => {
        if (!selectedProvider || selectedProvider === 'auto' || !settings) return [];

        // Moondream Local specific options
        if (selectedProvider === 'moondream_local') {
            return [
                { value: 'sdxl-realism', label: 'SDXL Realism (Lightning)' },
                { value: 'sdxl-anime', label: 'SDXL Anime (Pony)' },
                { value: 'sdxl-surreal', label: 'SDXL Surreal (DreamShaper)' }
            ];
        }

        // Gemini
        if (selectedProvider === 'gemini') {
            return [
                { value: 'imagen-3.0-generate-001', label: 'Imagen 3' },
                { value: 'imagen-3.0-fast-generate-001', label: 'Imagen 3 Fast' }
            ];
        }

        // OpenAI
        if (selectedProvider === 'openai') {
            return [
                { value: 'dall-e-3', label: 'DALL-E 3' },
                { value: 'dall-e-2', label: 'DALL-E 2' }
            ];
        }

        // Grok
        if (selectedProvider === 'grok') {
            return [
                { value: 'grok-2-vision-1212', label: 'Grok 2 Vision' }
            ];
        }

        // Fallback or use configured model
        const configuredModel = availableModels.find(m => m.id === selectedProvider)?.model;
        if (configuredModel) {
            return [{ value: configuredModel, label: configuredModel }];
        }

        return [];
    }, [selectedProvider, settings, availableModels]);

    if (!isOpen || !config) return null;

    const handleSubmit = () => {
        // TODO: Pass advancedSettings/aiModelSettings to onSubmit when backend/App supports it
        onSubmit(prompt, {
            aspectRatio: selectedAspectRatio,
            useSourceImage: useSourceImage,
            providerId: selectedProvider === 'auto' ? undefined : selectedProvider,
            generationSettings: advancedSettings || undefined
        });
    };

    const handleHistoryClick = (p: string) => {
        setPrompt(p);
    }

    const { taskType, image } = config;
    const TitleIcon = titles[taskType].icon;
    const canShowSourceImageToggle = taskType === 'video' && !!image;

    const isEnhanceMode = taskType === 'enhance';

    const renderEnhanceMode = () => {
        if (!image) return null;
        return (
            <div className="flex-grow flex flex-col h-full overflow-hidden bg-black">
                <EnhancePlayer
                    sourceImage={image}
                    upscaleSettings={advancedSettings as UpscaleSettings}
                    aiSettings={aiModelSettings}
                    onAiSettingsChange={setAIModelSettings}
                    onPreviewGenerate={async (aiSettings) => {
                        console.log('Generate preview with:', aiSettings);
                        if (!settings) return null;

                        // Deep clone to safely modify for this request
                        const tempSettings = JSON.parse(JSON.stringify(settings));
                        const providerId = aiSettings.provider || 'moondream_local';

                        if (!tempSettings.providers[providerId]) tempSettings.providers[providerId] = {};

                        // Update Model
                        if (aiSettings.model) tempSettings.providers[providerId].model = aiSettings.model;

                        // Update Args (Steps, CFG) - Ensure args object exists
                        if (!tempSettings.providers[providerId].args) tempSettings.providers[providerId].args = {};
                        if (aiSettings.steps) tempSettings.providers[providerId].args.steps = aiSettings.steps;
                        if (aiSettings.cfg_scale) tempSettings.providers[providerId].args.guidance_scale = aiSettings.cfg_scale;

                        try {
                            const result = await aiService.editImage(
                                image,
                                aiSettings.enhancement_prompt || "Professional quality, high resolution, sharp focus", // Default prompt if empty
                                tempSettings,
                                aiSettings.denoise_strength ? aiSettings.denoise_strength / 100 : 0.3
                            );
                            if (result && result.image) return result.image;
                            return null;
                        } catch (e) {
                            console.error("Preview Generation Failed:", e);
                            return null;
                        }
                    }}
                    hasNext={false}
                    hasPrev={false}

                    availableProviders={availableModels.map(m => ({ id: m.id, name: m.name }))}
                />
            </div>
        );
    };

    const renderPlayerMode = () => {
        if (!advancedSettings) return <div className="flex-grow flex items-center justify-center text-gray-500">Initializing...</div>;
        return (
            <div className="flex-grow flex flex-col h-full overflow-hidden bg-black">
                <GenerationPlayer
                    prompt={prompt}
                    onPromptChange={setPrompt}
                    negativePrompt={negativePrompt}
                    onNegativePromptChange={setNegativePrompt}

                    settings={advancedSettings as GenerationSettings}
                    onSettingsChange={(s) => setAdvancedSettings(s)}

                    availableProviders={availableModels.map(m => ({ id: m.id, name: m.name }))}
                    selectedProvider={selectedProvider}
                    onProviderChange={setSelectedProvider}

                    aspectRatio={selectedAspectRatio || '1:1'}
                    onAspectRatioChange={setSelectedAspectRatio}

                    generatedImage={generatedImage}
                    isGenerating={isGenerating}
                    progress={progress}

                    onGenerate={handlePlayerGenerate}
                    onSave={handlePlayerSave}
                    onClose={onClose}

                    modelOptions={currentModelOptions}

                    batchCount={batchCount}
                    onBatchCountChange={setBatchCount}
                    autoSave={autoSave}
                    onAutoSaveChange={setAutoSave}
                    autoSeedAdvance={autoSeedAdvance}
                    onAutoSeedAdvanceChange={setAutoSeedAdvance}

                    sessionImages={sessionImages}
                    currentImageIndex={currentImageIndex}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    batchProgress={{ current: completedInBatch, total: batchCount }}
                    autoPlay={autoPlay}
                    onAutoPlayChange={setAutoPlay}
                    randomAspectRatio={randomAspectRatio}
                    onRandomAspectRatioChange={setRandomAspectRatio}
                    enabledRandomRatios={enabledRandomRatios}
                    onEnabledRandomRatiosChange={setEnabledRandomRatios}

                    negativePromptHistory={negativePromptHistory}
                />
            </div>
        );
    };

    const renderStandardMode = () => (
        <div className={`flex-grow p-6 grid grid-cols-1 ${image ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-6 overflow-y-auto`}>
            {/* Left Side: Prompt & Options */}
            <div className={`${image ? 'md:col-span-2' : ''} flex flex-col gap-4`}>

                {availableModels.length > 0 && (
                    <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-300 mb-2">AI Provider / Model</label>
                        <select
                            value={selectedProvider === 'auto' ? 'auto' : selectedProvider + (advancedSettings?.model ? `:${advancedSettings.model}` : '')}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'auto') {
                                    setSelectedProvider('auto');
                                } else {
                                    // Split logic if we combined them, but for now just taking provider is enough if we rely on Advanced Settings to refine model.
                                    // Actually, let's just keep it simple: Select Provider, then refine Model in Advanced Settings.
                                    // But to support picking "SDXL Anime" from top, we need to handle it.
                                    // Simplified: Just selecting provider here for now.
                                    // FIX: The value in options below uses `m.id` (providerId). 
                                    // If we have multiple entries with same `m.id`, the select box will act weirdly (select first match).
                                    // We should make values unique? 
                                    // Correction: Let's stick to Provider selection here to avoid complexity?
                                    // But the user wants to see models. 
                                    // Let's pass `m.id` as provider. If user invokes 'sdxl-anime', they need to select it in Advanced Settings OR we handle it here.
                                    // For this edit, I will revert to just updating provider, but I will ensure the list covers the providers.
                                    // For moondream_local, all 3 entries have id 'moondream_local'.
                                    // So selecting any of them selects 'moondream_local'.
                                    // To fix this UI properly, we'd need unique values.
                                    // Let's rely on Advanced Settings for Model selection, but show the Providers here.
                                    // Wait, if I simply add distinct options, I can parse them.
                                    // Let's assume standard behavior: update provider.
                                    setSelectedProvider(val as AiProvider | 'auto');
                                }
                            }}
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="auto">Auto (Use Default Routing)</option>
                            {/* Filter duplicates so we only show one entry per Provider in this dropdown */}
                            {availableModels.filter((m, index, self) =>
                                index === self.findIndex((t) => t.id === m.id)
                            ).map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex-shrink-0">
                    <label htmlFor="prompt-textarea" className="block text-sm font-medium text-gray-300 mb-2">
                        {taskType === 'video' ? 'Motion Prompt' : 'Generation Prompt'}
                    </label>
                    <textarea
                        id="prompt-textarea"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={taskType === 'image' ? 6 : 4}
                        className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={taskType === 'video' ? 'Describe the motion you want to see...' : 'Describe the image you want to create...'}
                    />
                </div>

                {(taskType === 'image' || taskType === 'video') && (
                    <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                        <div className="flex flex-wrap gap-2">
                            {(['16:9', '9:16', '1:1', '4:3', '3:4'] as AspectRatio[]).map(ar => (
                                <button
                                    key={ar}
                                    onClick={() => setSelectedAspectRatio(ar)}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${selectedAspectRatio === ar ? 'bg-indigo-600 text-white font-semibold' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    {ar}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {canShowSourceImageToggle && (
                    <div className="flex-shrink-0 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                        <label htmlFor="use-source-image" className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="use-source-image"
                                checked={useSourceImage}
                                onChange={(e) => setUseSourceImage(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="ml-3 text-sm text-gray-300">Use source image as inspiration</span>
                        </label>
                        <p className="text-xs text-gray-500 ml-7 mt-1">Uncheck to generate video from only the text prompt.</p>
                    </div>
                )}

                <div className="flex-grow flex flex-col min-h-0">
                    <h3 className="text-sm font-medium text-gray-300 mb-2 flex-shrink-0">Prompt History</h3>
                    <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-700/50 overflow-y-auto flex-grow max-h-48">
                        {promptHistory.length > 0 ? (
                            <ul className="space-y-1">
                                {promptHistory.map((p, i) => (
                                    <li key={i}>
                                        <button
                                            onClick={() => handleHistoryClick(p)}
                                            className="w-full text-left p-2 text-sm text-gray-300 rounded hover:bg-gray-600/50 transition-colors truncate"
                                            title={p}
                                        >
                                            {p}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 text-center p-4">Your prompt history is empty.</p>
                        )}
                    </div>
                </div>

                {/* Advanced Settings (General) */}
                <div className="flex-shrink-0">
                    <AdvancedSettingsPanel
                        taskType={taskType === 'image' ? (config.image ? 'img2img' : 'txt2img') : 'img2img'}
                        provider={selectedProvider}
                        settings={advancedSettings}
                        onSettingsChange={setAdvancedSettings}
                        availableModels={availableModels.map(m => m.model || m.id).filter(Boolean) as string[]}
                    />
                </div>

            </div>

            {/* Right Side: Image Preview OR AI Settings */}
            {image && (
                taskType === 'image' && config.image ? (
                    <div className="md:col-span-1 h-full overflow-y-auto">
                        <AIModelSettingsPanel
                            settings={aiModelSettings}
                            onChange={setAIModelSettings}
                        />
                    </div>
                ) : (
                    <div className="md:col-span-1 flex flex-col items-center justify-center bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 h-fit">
                        <p className="text-sm font-medium text-gray-400 mb-2">Source Image</p>
                        <img
                            src={image.dataUrl}
                            alt="Source for generation"
                            className={`max-w-full max-h-64 object-contain rounded-md transition-opacity duration-300 ${!useSourceImage && canShowSourceImageToggle ? 'opacity-30' : 'opacity-100'}`}
                        />
                    </div>
                )
            )}
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`bg-gray-800 rounded-lg shadow-xl w-full ${isEnhanceMode || isPlayerMode ? 'w-[95vw] h-[95vh] max-w-none' : 'max-w-4xl max-h-[90vh]'} m-4 border border-gray-700 relative animate-fade-in flex flex-col transition-all duration-300`}
                onClick={(e) => e.stopPropagation()}
            >
                {!(isEnhanceMode || isPlayerMode) && (
                    <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <TitleIcon className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-xl font-bold text-white">{titles[taskType].text}</h2>
                            {queuedGenerationCount > 0 && (
                                <div className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                                    {queuedGenerationCount} in queue
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </header>
                )}

                {/* Conditional Main Content */}
                {isEnhanceMode ? renderEnhanceMode() : isPlayerMode ? renderPlayerMode() : renderStandardMode()}

                {!(isEnhanceMode || isPlayerMode) && (
                    <footer className="p-4 border-t border-gray-700 flex justify-end flex-shrink-0">
                        <button
                            onClick={handleSubmit}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!prompt && !isEnhanceMode} // Enhance mode doesn't strictly need a prompt typed in textarea
                        >
                            {taskType === 'image' && 'Generate Image'}
                            {taskType === 'video' && 'Generate Video'}
                            {taskType === 'enhance' && 'Enhance'}
                        </button>
                    </footer>
                )}
            </div>
            <style>{`
                  @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                  }
                  .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                  }
              `}</style>
        </div>
    );
};

export default PromptSubmissionModal;