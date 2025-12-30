import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { GenerationPlayerProps, AspectRatios } from './GenerationPlayer/GenerationPlayer.types';
import { ImageInfo } from '../types';

// New Components
import { GenerationCanvas } from './GenerationPlayer/GenerationCanvas';
import { ConceptStep } from './GenerationPlayer/Steps/ConceptStep';
import { ShapeStep } from './GenerationPlayer/Steps/ShapeStep';
import { StyleStep } from './GenerationPlayer/Steps/StyleStep';
import { TechSpecsStep } from './GenerationPlayer/Steps/TechSpecsStep';
import { ActionStep } from './GenerationPlayer/Steps/ActionStep';

const GenerationPlayer: React.FC<GenerationPlayerProps> = ({
    prompt, onPromptChange,
    negativePrompt, onNegativePromptChange,
    settings, onSettingsChange,
    availableProviders,
    selectedProvider, onProviderChange,
    generatedImage, isGenerating, progress,
    onGenerate, onClose, onSave,

    // Optional
    initialImage,
    aspectRatio = '1:1', onAspectRatioChange = (r) => { },
    randomAspectRatio = false,
    onRandomAspectRatioChange,
    batchCount = 1, onBatchCountChange = (c) => { },
    maxBatchCount = 200, onMaxBatchCountChange = (m) => { }, // Default max 200
    autoSeedAdvance = false, onAutoSeedAdvanceChange,

    // Navigation
    onPrev, onNext, sessionImages,

    // History
    enabledRandomRatios = AspectRatios, onEnabledRandomRatiosChange = (v) => { },
    promptHistory = [], negativePromptHistory = [], onDeleteNegativePrompt, // Added: default empty array for promptHistory

    slideshowSpeed = 3000, onSlideshowSpeedChange = (v) => { }
}) => {
    // --- State ---
    // Canvas state is now inside GenerationCanvas, but we pass displayImage
    // We need to manage what is displayed (generated vs initial vs session)

    // Current Display Image Logic
    // If generatedImage exists, show it.
    // Else if initialImage exists, show it.
    // Else if using sessionImages for navigation, show current one.

    // Actually, original code had complex logic for `displayImage`.
    // It used `sessionImages` for navigation but `generatedImage` took precedence.

    // We'll mimic the original priority: 
    // generatedImage (b64) > navigation override > initialImage

    // Navigation Override State (local to this component to handle Next/Prev)
    const [navIndex, setNavIndex] = useState<number>(-1);

    useEffect(() => {
        if (sessionImages && initialImage) {
            const idx = sessionImages.findIndex(img => img.id === initialImage.id);
            if (idx >= 0) setNavIndex(idx);
        }
    }, [sessionImages, initialImage]);

    const handlePrev = () => {
        if (onPrev) onPrev(); // Determine if parent handles it or we handle local index
        // If parent handles it (classic callback), it usually updates `initialImage` prop?
        // Checking original code: `handlePrev` called `onPrev()` AND set local `navIndex`.
        if (sessionImages && navIndex > 0) {
            setNavIndex(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (onNext) onNext();
        if (sessionImages && navIndex < sessionImages.length - 1) {
            setNavIndex(prev => prev + 1);
        }
    };

    // Construct Display Image Object
    // It needs { id, url }
    let displayImage: ImageInfo | { id: string; url: string } | null = null;

    if (generatedImage) {
        displayImage = { id: 'generated', url: generatedImage }; // Base64
    } else if (sessionImages && navIndex >= 0 && sessionImages[navIndex]) {
        displayImage = sessionImages[navIndex];
    } else if (initialImage) {
        displayImage = initialImage;
    }

    return (
        <div className="flex flex-col h-full bg-black select-none text-sans overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a] z-20 shrink-0 h-14">
                <div className="flex items-center gap-6">
                    <span className="font-bold text-gray-100 tracking-wider text-sm">GENERATION STUDIO</span>
                    <div className="hidden md:block h-4 w-px bg-gray-700 mx-2"></div>
                    <button className="hidden md:block text-xs text-gray-400 hover:text-white uppercase tracking-wide">Gallery</button>
                    <button className="hidden md:block text-xs text-gray-400 hover:text-white uppercase tracking-wide">History</button>
                </div>
                <div className="flex items-center gap-4">
                    {generatedImage && (
                        <button
                            onClick={onSave}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wide rounded transition-colors"
                        >
                            Save / Export
                        </button>
                    )}
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col md:flex-row overflow-hidden relative min-h-0">

                {/* 1. LEFT PANE (Canvas) */}
                <div className="relative flex-grow bg-[#0f0f0f] overflow-hidden flex items-center justify-center
                    h-[40vh] md:h-auto shrink-0 md:shrink border-b md:border-b-0 md:border-r border-[#2a2a2a]
                ">
                    <GenerationCanvas
                        displayImage={displayImage}
                        isGenerating={isGenerating}
                        progress={progress}
                        onPrev={handlePrev}
                        onNext={handleNext}
                        hasSessionImages={!!(sessionImages && sessionImages.length > 0)}
                    />
                </div>

                {/* 2. RIGHT PANE (Control Tower) */}
                <div className="flex flex-col bg-[#141414] 
                    w-full md:w-[400px] md:min-w-[400px] 
                    flex-grow md:flex-grow-0 
                    h-full overflow-hidden min-h-0
                ">
                    {/* Scrollable Steps Area */}
                    <div className="flex-grow overflow-y-auto custom-scrollbar p-0 min-h-0 overscroll-y-contain supports-scrollbars:pr-2">

                        <ConceptStep
                            prompt={prompt}
                            onPromptChange={onPromptChange}
                            promptHistory={promptHistory} // Added: Pass history to child
                            negativePrompt={negativePrompt}
                            onNegativePromptChange={onNegativePromptChange}
                            negativePromptHistory={negativePromptHistory}
                            onGenerate={onGenerate}
                        />

                        <ShapeStep
                            aspectRatio={aspectRatio}
                            onAspectRatioChange={onAspectRatioChange}
                            randomAspectRatio={randomAspectRatio}
                            onRandomAspectRatioChange={onRandomAspectRatioChange}
                            enabledRandomRatios={enabledRandomRatios}
                            onEnabledRandomRatiosChange={onEnabledRandomRatiosChange}
                            settings={settings}
                            onSettingsChange={onSettingsChange}
                        />

                        <StyleStep
                            availableProviders={availableProviders}
                            selectedProvider={selectedProvider}
                            onProviderChange={onProviderChange}
                            settings={settings}
                            onSettingsChange={onSettingsChange}
                            prompt={prompt}
                        />

                        <TechSpecsStep
                            settings={settings}
                            onSettingsChange={onSettingsChange}
                            autoSeedAdvance={autoSeedAdvance}
                            onAutoSeedAdvanceChange={onAutoSeedAdvanceChange}
                        />

                        {/* Action Step (Step 5) - DESKTOP ONLY */}
                        <div className="hidden md:block">
                            <ActionStep
                                batchCount={batchCount}
                                onBatchCountChange={onBatchCountChange}
                                maxBatchCount={maxBatchCount}
                                onMaxBatchCountChange={onMaxBatchCountChange}
                                isGenerating={isGenerating}
                                onGenerate={onGenerate}
                                isValid={prompt.trim().length > 0}
                            />
                        </div>

                        <div className="h-32"></div> {/* Spacer */}
                    </div>

                    {/* Action Step (Step 5) - MOBILE ONLY (Fixed Bottom) */}
                    <div className="md:hidden border-t border-[#2a2a2a] bg-[#141414] p-0 z-10">
                        <ActionStep
                            batchCount={batchCount}
                            onBatchCountChange={onBatchCountChange}
                            isGenerating={isGenerating}
                            onGenerate={onGenerate}
                            isValid={prompt.trim().length > 0}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenerationPlayer;
