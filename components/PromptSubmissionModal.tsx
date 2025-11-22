import React, { useState, useEffect } from 'react';
import { ImageInfo, AspectRatio } from '../types';
import { CloseIcon, SparklesIcon, VideoCameraIcon, WandIcon } from './icons';

export interface PromptModalConfig {
    taskType: 'image' | 'video' | 'enhance';
    initialPrompt: string;
    aspectRatio?: AspectRatio;
    image?: ImageInfo;
}

interface PromptSubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (prompt: string, options: { aspectRatio?: AspectRatio; useSourceImage?: boolean; }) => void;
    config: PromptModalConfig | null;
    promptHistory: string[];
}

const titles = {
    image: { icon: SparklesIcon, text: "Generate Image with AI" },
    video: { icon: VideoCameraIcon, text: "Generate Video with AI" },
    enhance: { icon: WandIcon, text: "Enhance & Upscale Image" },
}

const PromptSubmissionModal: React.FC<PromptSubmissionModalProps> = ({ isOpen, onClose, onSubmit, config, promptHistory }) => {
    const [prompt, setPrompt] = useState('');
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio | undefined>(undefined);
    const [useSourceImage, setUseSourceImage] = useState(true);
    
    useEffect(() => {
        if (config) {
            setPrompt(config.initialPrompt);
            setSelectedAspectRatio(config.aspectRatio);
            // Default to using the source image if one is provided, UNLESS it's a video task.
            setUseSourceImage(config.taskType === 'video' ? false : !!config.image);
        }
    }, [config]);

    if (!isOpen || !config) return null;

    const handleSubmit = () => {
        onSubmit(prompt, { 
            aspectRatio: selectedAspectRatio,
            useSourceImage: useSourceImage 
        });
    };

    const handleHistoryClick = (p: string) => {
        setPrompt(p);
    }
    
    const { taskType, image } = config;
    const TitleIcon = titles[taskType].icon;
    const canShowSourceImageToggle = taskType === 'video' && !!image;


    return (
        <div 
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl m-4 border border-gray-700 relative animate-fade-in flex flex-col max-h-[90vh]"
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
                
                <main className={`flex-grow p-6 grid grid-cols-1 ${image ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-6 overflow-y-auto`}>
                    {/* Left Side: Prompt & Options */}
                    <div className={`${image ? 'md:col-span-2' : ''} flex flex-col gap-4`}>
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

                        { (taskType === 'image' || taskType === 'video') && (
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
                            <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-700/50 overflow-y-auto flex-grow">
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

                    </div>
                    
                    {/* Right Side: Image Preview */}
                    {image && (
                        <div className="md:col-span-1 flex flex-col items-center justify-center bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                            <p className="text-sm font-medium text-gray-400 mb-2">Source Image</p>
                            <img 
                                src={image.dataUrl} 
                                alt="Source for generation"
                                className={`max-w-full max-h-full object-contain rounded-md transition-opacity duration-300 ${!useSourceImage && canShowSourceImageToggle ? 'opacity-30' : 'opacity-100'}`}
                            />
                        </div>
                    )}
                </main>
                
                <footer className="p-4 border-t border-gray-700 flex justify-end flex-shrink-0">
                    <button
                        onClick={handleSubmit}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!prompt}
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