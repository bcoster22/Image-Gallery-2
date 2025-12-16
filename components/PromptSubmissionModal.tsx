import React, { useState, useEffect, useMemo } from 'react';
import { ImageInfo, AspectRatio, AdminSettings, AiProvider, UpscaleSettings, GenerationSettings, AIModelSettings } from '../types';
import { CloseIcon, SparklesIcon, VideoCameraIcon, WandIcon } from './icons';
import EnhancePlayer from './EnhancePlayer';
import AIModelSettingsPanel from './AIModelSettingsPanel';
import AdvancedSettingsPanel from './AdvancedSettingsPanel';
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
    onSubmit: (prompt: string, options: { aspectRatio?: AspectRatio; useSourceImage?: boolean; providerId?: AiProvider }) => void;
    config: PromptModalConfig | null;
    promptHistory: string[];
    settings: AdminSettings | null;
}

const titles = {
    image: { icon: SparklesIcon, text: "Generate Image with AI" },
    video: { icon: VideoCameraIcon, text: "Generate Video with AI" },
    enhance: { icon: WandIcon, text: "Enhance & Upscale Image" },
}

const PromptSubmissionModal: React.FC<PromptSubmissionModalProps> = ({ isOpen, onClose, onSubmit, config, promptHistory, settings }) => {
    const [prompt, setPrompt] = useState('');
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio | undefined>(undefined);
    const [useSourceImage, setUseSourceImage] = useState(true);
    const [selectedProvider, setSelectedProvider] = useState<AiProvider | 'auto'>('auto');

    // State for Advanced Settings
    const [advancedSettings, setAdvancedSettings] = useState<GenerationSettings | UpscaleSettings | null>(null);
    const [aiModelSettings, setAIModelSettings] = useState<AIModelSettings>({
        model: 'sdxl',
        steps: 30,
        cfg_scale: 6.5,
        denoise_strength: 30,
        enhancement_prompt: 'professional quality, enhanced details, sharp focus',
        negative_prompt: 'blur, noise, artifacts, distortion',
        seed: -1
    });

    useEffect(() => {
        if (config) {
            setPrompt(config.initialPrompt);
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
                    seed: -1
                } as GenerationSettings);
            }
        }
    }, [config]);

    const availableModels = useMemo(() => {
        if (!settings || !config) return [];
        const models: { id: AiProvider; name: string; model?: string | null }[] = [];

        const { providers } = settings;

        if (config.taskType === 'image') {
            if (providers.gemini.apiKey) models.push({ id: 'gemini', name: 'Google Gemini', model: providers.gemini.generationModel });
            if (providers.openai.apiKey) models.push({ id: 'openai', name: 'OpenAI DALL-E', model: providers.openai.generationModel });
            if (providers.grok.apiKey) models.push({ id: 'grok', name: 'xAI Grok', model: providers.grok.generationModel });
            if (providers.comfyui.endpoint) models.push({ id: 'comfyui', name: 'ComfyUI (Local)', model: 'Workflow' });
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

    if (!isOpen || !config) return null;

    const handleSubmit = () => {
        // TODO: Pass advancedSettings/aiModelSettings to onSubmit when backend/App supports it
        onSubmit(prompt, {
            aspectRatio: selectedAspectRatio,
            useSourceImage: useSourceImage,
            providerId: selectedProvider === 'auto' ? undefined : selectedProvider
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

    const renderStandardMode = () => (
        <div className={`flex-grow p-6 grid grid-cols-1 ${image ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-6 overflow-y-auto`}>
            {/* Left Side: Prompt & Options */}
            <div className={`${image ? 'md:col-span-2' : ''} flex flex-col gap-4`}>

                {availableModels.length > 0 && (
                    <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-300 mb-2">AI Model</label>
                        <select
                            value={selectedProvider}
                            onChange={(e) => setSelectedProvider(e.target.value as AiProvider | 'auto')}
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="auto">Auto (Use Default Routing)</option>
                            {availableModels.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.name} {m.model ? `(${m.model})` : ''}
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
                className={`bg-gray-800 rounded-lg shadow-xl w-full ${isEnhanceMode ? 'w-[95vw] h-[95vh] max-w-none' : 'max-w-4xl max-h-[90vh]'} m-4 border border-gray-700 relative animate-fade-in flex flex-col transition-all duration-300`}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                    <div className="flex items-center">
                        <TitleIcon className="w-6 h-6 mr-3 text-indigo-400" />
                        <h2 className="text-xl font-bold text-white">{titles[taskType].text}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                {/* Conditional Main Content */}
                {isEnhanceMode ? renderEnhanceMode() : renderStandardMode()}

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