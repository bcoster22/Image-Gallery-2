import React from 'react';
import { SparklesIcon, VideoCameraIcon, SparklesIcon as WandIcon, XMarkIcon as CloseIcon } from '@heroicons/react/24/outline';
import { AspectRatio, AdminSettings, AiProvider } from '../../../types';

interface StandardFormProps {
    taskType: 'image' | 'video' | 'enhance';
    prompt: string;
    onPromptChange: (p: string) => void;
    selectedProvider: string;
    onProviderChange: (p: string) => void;
    availableModels: { id: string; name: string; model?: string | null }[];
    selectedAspectRatio: AspectRatio | undefined;
    onAspectRatioChange: (ar: AspectRatio) => void;
    settings: AdminSettings | null;
    isEnhanceMode: boolean; // Just for button disabled text fallback
    handleSubmit: () => void;
    onClose: () => void;
    queuedGenerationCount: number;
    titles: Record<string, { icon: any, text: string }>;
}

const StandardForm: React.FC<StandardFormProps> = ({
    taskType,
    prompt,
    onPromptChange,
    selectedProvider,
    onProviderChange,
    availableModels,
    selectedAspectRatio,
    onAspectRatioChange,
    settings,
    isEnhanceMode,
    handleSubmit,
    onClose,
    queuedGenerationCount,
    titles
}) => {
    const TitleIcon = titles[taskType].icon;

    return (
        <div className="flex flex-col h-full">
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

            <div className={`flex-grow p-6 grid grid-cols-1 md:grid-cols-1 gap-6 overflow-y-auto`}>
                <div className="flex flex-col gap-4">

                    {availableModels.length > 0 && (
                        <div className="flex-shrink-0">
                            <label className="block text-sm font-medium text-gray-300 mb-2">AI Provider / Model</label>
                            <select
                                value={selectedProvider === 'auto' ? 'auto' : selectedProvider + (settings?.routing?.generation?.[0] ? '' : '')}
                                // Simplified value handling as per original logic's intent
                                onChange={(e) => onProviderChange(e.target.value)}
                                className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="auto">Auto (Use Default Routing)</option>
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
                            onChange={(e) => onPromptChange(e.target.value)}
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
                                        onClick={() => onAspectRatioChange(ar)}
                                        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${selectedAspectRatio === ar ? 'bg-indigo-600 text-white font-semibold' : 'bg-gray-700 hover:bg-gray-600'}`}
                                    >
                                        {ar}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <footer className="p-4 border-t border-gray-700 flex justify-end flex-shrink-0">
                <button
                    onClick={handleSubmit}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!prompt && !isEnhanceMode}
                >
                    {taskType === 'image' && 'Generate Image'}
                    {taskType === 'video' && 'Generate Video'}
                    {taskType === 'enhance' && 'Enhance'}
                </button>
            </footer>
        </div>
    );
};

export default StandardForm;
