import React, { useState, useEffect, useMemo } from 'react';
import { ImageInfo, AspectRatio, GenerationSettings, AIModelSettings, UpscaleSettings, AiProvider } from '../types';
import { XMarkIcon as CloseIcon, SparklesIcon, VideoCameraIcon, SparklesIcon as WandIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';
import { PromptSubmissionModalProps } from './PromptModal/types';
import { MoondreamLocalProvider, DEFAULT_MOONDREAM_MODELS } from '../services/providers/moondream';

// Modes
import StandardForm from './PromptModal/modes/StandardForm';
import GenerationWrapper from './PromptModal/modes/GenerationWrapper';
import EnhanceWrapper from './PromptModal/modes/EnhanceWrapper';

const titles = {
    image: { icon: SparklesIcon, text: "Generate Image with AI" },
    video: { icon: VideoCameraIcon, text: "Generate Video with AI" },
    enhance: { icon: WandIcon, text: "Enhance & Upscale Image" },
}

const PromptSubmissionModal: React.FC<PromptSubmissionModalProps> = (props) => {
    const {
        isOpen, onClose, onSubmit, config, promptHistory,
        negativePromptHistory = [], onSaveNegativePrompt, settings,
        onSaveGeneratedImage, onAddToGenerationQueue,
        queuedGenerationCount = 0, generationResults = [], onDeleteNegativePrompt
    } = props;

    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio | undefined>('9:16');
    const [selectedProvider, setSelectedProvider] = useState<string>('auto');
    // Only init with GENERATION models for the dropdown to avoid showing vision models in generation tab
    const [moondreamModels, setMoondreamModels] = useState<string[]>(
        DEFAULT_MOONDREAM_MODELS
            .filter(m => m.type === 'generation')
            .map(m => m.id)
    );

    // Advanced Settings
    const [advancedSettings, setAdvancedSettings] = useState<GenerationSettings | UpscaleSettings | null>(null);
    const [aiModelSettings, setAIModelSettings] = useState<AIModelSettings>({
        provider: 'moondream_local',
        model: 'Standard',
        steps: 30,
        cfg_scale: 7,
        denoise_strength: 30
    });

    // Reset State on Open
    useEffect(() => {
        if (isOpen && config) {
            setPrompt(config.initialPrompt || '');
            setSelectedAspectRatio(config.aspectRatio || '9:16');

            // Set default settings based on task type
            if (config.taskType === 'image') {
                setAdvancedSettings({
                    provider: 'moondream_local', // Helper to satisfy type
                    model: 'flux-dev',
                    steps: 28,
                    denoise: 100,
                    cfg_scale: 7,
                    seed: -1,
                    scheduler: 'dpm_pp_2m_karras',
                    ratio: config.aspectRatio || '1:1'
                } as GenerationSettings);
            }
        }
    }, [isOpen, config]);


    // Fetch Moondream Models
    useEffect(() => {
        const fetchMoondreamModels = async () => {
            if (!settings) return;
            // Use centralized provider to fetch models (handles defaults/fallback internally)
            const provider = new MoondreamLocalProvider();
            const models = await provider.getModels(settings);

            // Filter for generation models only
            const genModels = models
                .filter(m => m.type === 'generation')
                .map(m => m.id);
            setMoondreamModels(genModels);
        };

        if (isOpen) {
            fetchMoondreamModels();
        }
    }, [isOpen, settings?.providers.moondream_local.endpoint]);

    // Derived Logic for Mode
    // Is Player Mode if task is Image (Text-to-Image OR Image-to-Image)
    // We want the new Generation Studio for ALL generation tasks
    const isPlayerMode = config?.taskType === 'image';
    const isEnhanceMode = config?.taskType === 'enhance';
    const taskType = config?.taskType || 'image';

    // Available Models Logic
    const availableModels = useMemo(() => {
        if (!settings || !config) return [];
        const models: { id: string; name: string; model?: string | null; models?: string[] }[] = [];
        const { providers } = settings;

        if (config.taskType === 'image') {
            if (providers.gemini.apiKey) models.push({ id: 'gemini', name: 'Google Gemini', model: providers.gemini.generationModel });
            if (providers.openai.apiKey) models.push({ id: 'openai', name: 'OpenAI DALL-E', model: providers.openai.generationModel });
            if (providers.grok.apiKey) models.push({ id: 'grok', name: 'xAI Grok', model: providers.grok.generationModel });
            if (providers.comfyui.endpoint) models.push({ id: 'comfyui', name: 'ComfyUI (Local)', model: 'Workflow' });
            if (providers.moondream_local.endpoint) {
                models.push({
                    id: 'moondream_local',
                    name: 'Moondream Local',
                    model: providers.moondream_local.model,
                    models: moondreamModels
                });
            }
        } else if (config.taskType === 'video') {
            if (providers.gemini.apiKey) models.push({ id: 'gemini', name: 'Google Veo', model: providers.gemini.veoModel });
        } else if (config.taskType === 'enhance') {
            if (providers.gemini.apiKey) models.push({ id: 'gemini', name: 'Google Gemini', model: 'Imagen' });
            if (providers.comfyui.endpoint) models.push({ id: 'comfyui', name: 'ComfyUI', model: 'Upscale' });
            models.push({
                id: 'moondream_local',
                name: 'Moondream Station',
                model: 'Standard',
                models: moondreamModels
            });
        }
        return models;
    }, [settings, config, moondreamModels]);

    const handleSubmit = () => {
        onSubmit(prompt, {
            aspectRatio: selectedAspectRatio,
            providerId: selectedProvider === 'auto' ? undefined : (selectedProvider as AiProvider),
            generationSettings: advancedSettings || undefined,
            autoSaveToGallery: true // Default for modal submisison
        });
    };

    if (!config) return null;

    // Determine panel classes based on mode
    let panelClasses = "bg-gray-800 text-white rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]";
    if (isPlayerMode || isEnhanceMode) {
        // Fixed positioning with proper insets (no w-full to prevent overflow)
        panelClasses = "bg-black text-white rounded-xl shadow-2xl flex flex-col overflow-hidden fixed left-2 right-2 top-2 bottom-2 md:left-4 md:right-4 md:top-4 md:bottom-4 lg:left-8 lg:right-8 lg:top-8 lg:bottom-8 border border-gray-800";
    }

    const dynamicMaxWidth = (isPlayerMode || isEnhanceMode) ? '100%' : '2xl';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth={dynamicMaxWidth}
            panelClassName={panelClasses}
            showCloseButton={false}
        >
            {isEnhanceMode ? (
                <EnhanceWrapper
                    image={config.image!}
                    upscaleSettings={advancedSettings as UpscaleSettings}
                    aiModelSettings={aiModelSettings}
                    onAiSettingsChange={setAIModelSettings}
                    settings={settings}
                    availableProviders={availableModels}
                    batchImages={config.batchImages}
                    onSaveGeneratedImage={onSaveGeneratedImage}
                    promptHistory={promptHistory}
                />
            ) : isPlayerMode ? (
                <GenerationWrapper
                    prompt={prompt}
                    onPromptChange={setPrompt}
                    negativePrompt={negativePrompt}
                    onNegativePromptChange={setNegativePrompt}
                    settings={advancedSettings}
                    onSettingsChange={(s) => setAdvancedSettings(s)}
                    availableProviders={availableModels}
                    selectedProvider={selectedProvider}
                    onProviderChange={setSelectedProvider}
                    currentModelOptions={[]} // Not really used in updated Player?

                    onClose={onClose}
                    onAddToGenerationQueue={onAddToGenerationQueue!}
                    onSaveNegativePrompt={onSaveNegativePrompt}
                    onDeleteNegativePrompt={onDeleteNegativePrompt}
                    generationResults={generationResults}
                    negativePromptHistory={negativePromptHistory}
                    promptHistory={promptHistory || []}
                    configImage={config.image}
                />
            ) : (
                <StandardForm
                    taskType={taskType}
                    prompt={prompt}
                    onPromptChange={setPrompt}

                    selectedProvider={selectedProvider}
                    onProviderChange={setSelectedProvider}
                    availableModels={availableModels}

                    selectedAspectRatio={selectedAspectRatio}
                    onAspectRatioChange={setSelectedAspectRatio}

                    settings={settings}
                    isEnhanceMode={false}
                    handleSubmit={handleSubmit}
                    onClose={onClose}
                    queuedGenerationCount={queuedGenerationCount}
                    titles={titles}
                />
            )}
        </Modal>
    );
};

export default PromptSubmissionModal;