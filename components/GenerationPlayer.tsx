import React, { useState, useEffect, useRef } from 'react';
import { ImageInfo, AdminSettings, AspectRatio, AiProvider, GenerationSettings } from '../types';
import ModelRecommendation from './ModelRecommendation';
import PresetSelector from './PresetSelector';
import NegativePromptSelector from './NegativePromptSelector';

interface GenerationPlayerProps {
    // Content state
    prompt: string;
    onPromptChange: (prompt: string) => void;
    negativePrompt: string;
    onNegativePromptChange: (negativePrompt: string) => void;

    // Settings state
    settings: GenerationSettings;
    onSettingsChange: (settings: GenerationSettings) => void;
    availableProviders: { id: string; name: string }[];
    selectedProvider: string;
    onProviderChange: (providerId: string) => void;

    // Image state
    generatedImage: { id: string; url: string } | null;
    isGenerating: boolean;
    progress: number;

    // Actions
    onGenerate: () => void;
    onSave: () => void;
    onClose: () => void;

    // Config
    aspectRatio: AspectRatio;
    onAspectRatioChange: (ar: AspectRatio) => void;

    // Dynamic Model Options
    modelOptions?: { value: string; label: string }[];

    // Batch & Auto-save
    batchCount: number;
    onBatchCountChange: (count: number) => void;
    autoSave: boolean;
    onAutoSaveChange: (enabled: boolean) => void;
    autoSeedAdvance?: boolean;
    onAutoSeedAdvanceChange?: (enabled: boolean) => void;

    // Session / Batch State
    sessionImages?: { id: string; url: string }[];
    currentImageIndex?: number;
    onPrev?: () => void;
    onNext?: () => void;
    batchProgress?: { current: number; total: number };
    autoPlay?: boolean;
    onAutoPlayChange?: (enabled: boolean) => void;
    randomAspectRatio?: boolean;
    onRandomAspectRatioChange?: (enabled: boolean) => void;
    enabledRandomRatios?: AspectRatio[];
    onEnabledRandomRatiosChange?: (ratios: AspectRatio[]) => void;

    // History
    negativePromptHistory?: string[];
    onDeleteNegativePrompt?: (prompt: string) => void;

    // Slideshow
    slideshowSpeed?: number;
    onSlideshowSpeedChange?: (speed: number) => void;
}

const AspectRatios: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];

// ... component definition ...



const GenerationPlayer: React.FC<GenerationPlayerProps> = ({
    prompt, onPromptChange,
    negativePrompt, onNegativePromptChange,
    settings, onSettingsChange,
    availableProviders,
    selectedProvider, onProviderChange,
    generatedImage, isGenerating, progress,
    onGenerate, onSave, onClose,
    aspectRatio, onAspectRatioChange,
    modelOptions = [],
    batchCount, onBatchCountChange,
    autoSave, onAutoSaveChange,
    autoSeedAdvance = false, onAutoSeedAdvanceChange = (v) => { },
    sessionImages = [], currentImageIndex = -1, onPrev, onNext, batchProgress,
    autoPlay = true, onAutoPlayChange = (v) => { },
    randomAspectRatio = false, onRandomAspectRatioChange = (v) => { },
    enabledRandomRatios = AspectRatios, onEnabledRandomRatiosChange = (v) => { },
    negativePromptHistory = [], onDeleteNegativePrompt,
    slideshowSpeed = 3000, onSlideshowSpeedChange = (v) => { }
}) => {
    // View State
    const [zoom, setZoom] = useState<number | 'fit'>('fit');
    // ...

    // Effective Image to display
    // If not in a session (legacy?), use generatedImage. If in session, use index.
    // Effective Image to display
    // If autoPlay is false, we want to show the LATEST image generated, if any.
    // If not in a session (legacy?), use generatedImage. 

    // We need to track the "latest" generated image specifically for non-autoplay mode?
    // Actually, `generatedImage` prop IS the latest single generated image passed from parent usually.
    // `sessionImages` is the collection.
    // If autoPlay is OFF, we should show the `generatedImage` (newest one) instead of following the `currentImageIndex`?
    // Or we should update `currentImageIndex` to point to the newest one only if `autoPlay` is ON?

    // The previous logic was:
    // const displayImage = (sessionImages.length > 0 && currentImageIndex !== -1) ? sessionImages[currentImageIndex] : generatedImage;

    // If autoPlay is OFF, `currentImageIndex` might not be updated to the end.
    // BUT `generatedImage` (prop) updates whenever a new one arrives.
    // So if we prefer `generatedImage` when `autoPlay` is off AND it's fresh...

    // Let's refine based on user request: "if auto-play is deselect... display the current generated image and each image generated after that".
    // This implies that even if we are browsing history (index != end), a NEW generation should forcibly display itself? 
    // Or simply that we shouldn't act as a slideshow?

    // If Auto-Play is OFF:
    // When a new image arrives, does the parent update `currentImageIndex`?
    // If parent updates index, we follow index. 
    // If we want to "stick" to the latest generation, we should look at `generatedImage`.

    // Let's assume if `autoPlay` is false, `currentImageIndex` is NOT auto-advancing in parent? 
    // Actually, logic is likely in parent. WE are just a UI.
    // If this component solely controls view, we select what to show.

    // Let's defer to `generatedImage` if it conflicts with session navigation? 
    // No, that breaks manual navigation.

    // Simple Fix:
    // If we have a `generatedImage`, we should probably show it, unless the user has manually navigated heavily.
    // But `generatedImage` is refreshed on every generation.

    // User request: "display the current genreated image and each image generated after that."
    // This suggests that when a NEW image comes in, we switch to it.
    // This is the default "Auto-Play" behavior usually? 
    // Maybe "Auto-Play" refers to the *Slideshow* feature or the "Auto-Advance" feature?
    // If "Auto-Play Images" toggle is the one in the right sidebar...

    // Let's look at `autoPlay` prop use. It is passed but mostly unused in this file except for rendering the toggle?
    // It seems logic is external or missing.

    // To implement "Show latest generated image always":
    // We need to detect when `generatedImage` changes.
    // We can use a ref or effect to track "latest displayed".
    // But simply:
    // If `autoPlay` is OFF, we might want to ignore the *SlideShow* timer, but typically "Auto-Play" in this context (Gallery) 
    // often means "Auto-Advance to next image".

    // If User means: "When I generate, show me the result immediately even if I was looking at an old one."
    // Then we need to update our internal view state or ensure we render `generatedImage` when it updates.

    // Let's update `displayImage` logic to verify.
    // Currently: 
    // const displayImage = (sessionImages.length > 0 && currentImageIndex !== -1) ? sessionImages[currentImageIndex] : generatedImage;

    // If `sessionImages` has items, we ignore `generatedImage`! This is the bug. 
    // `generatedImage` is likely the "latest result", but `sessionImages` is the history.
    // If we are generating, `generatedImage` updates. `sessionImages` updates too.

    // We need to ensure that when a NEW `generatedImage` arrives, we effectively "jump" to it.
    // We can do this by syncing a local `viewingImage` state.

    // Let's introduce `lastGeneratedId` to detect changes.
    const [lastGenId, setLastGenId] = useState<string>('');
    const [viewingSpecificImage, setViewingSpecificImage] = useState<ImageInfo | null>(null);

    // Sync generatedImage updates
    useEffect(() => {
        if (generatedImage && generatedImage.id !== lastGenId) {
            setLastGenId(generatedImage.id);
            // Always snap to new image when it arrives
            setViewingSpecificImage(null); // Clear manual override to fall back to latest or index logic?
            // Actually, if we want to show it, we can just let existing logic work IF it points to end?
            // But if `currentImageIndex` is stuck at 0...

            // If we are just a dumb UI, we might depend on parent. 
            // BUT: "display the current generated image...".

            // If we simply check: "Is `generatedImage` newer than what's in `sessionImages[currentImageIndex]`?"
            // It's hard to tell without timestamps or ordering.

            // Let's change the display logic:
            // If `generatedImage` changed recently, show it?
        }
    }, [generatedImage, lastGenId]);

    // Refined Logic:
    // If `autoPlay` is OFF (user disabled "Auto-play Images"), we assume they want to see each result as it comes in?
    // Wait, usually "Auto-Play" means "Slideshow". 
    // Maybe "Auto-Play Images" toggle does nothing right now? (onAutoPlayChange exists).

    // Let's assume the user wants:
    // - Enable "Auto-Play": Cycle through images? Or maybe they mean "Auto-Advance seed"?
    // - Disable "Auto-Play": STOP cycling, but still SHOW the result of generation.

    // Current Bug interpretation:
    // If "Auto-Play" is ON, maybe the system IS showing images.
    // If OFF, maybe it's NOT checking for new images?

    // Actually, looking at the code:
    // `displayImage` relies heavily on `sessionImages[currentImageIndex]`.
    // If `currentImageIndex` is not updated by parent when a new image is added, we won't see it.

    // If we want to guarantee visibility of new images:
    // We should allow `generatedImage` to take precedence if it matches the *latest* item in `sessionImages`?
    // Or simpler:
    // If `generatedImage` is present, it IS the result.
    // We should display `generatedImage` unless the user explicitly navigated away?

    // Let's try explicit `overrideImage`:
    const [overrideImage, setOverrideImage] = useState<{ id: string; url: string } | null>(null);

    useEffect(() => {
        if (generatedImage) {
            setOverrideImage(generatedImage);
        }
    }, [generatedImage]);


    // Display Logic
    const displayImage = overrideImage
        ? overrideImage
        : (sessionImages.length > 0 && currentImageIndex !== -1)
            ? sessionImages[currentImageIndex]
            : generatedImage;

    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    // Negative Prompt History Dropdown State
    const [showNegativeHistory, setShowNegativeHistory] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Zoom/Pan Logic
    const handleWheel = (e: React.WheelEvent) => {
        // e.preventDefault() removed for Passive Event Listener compliance
        // e.preventDefault(); 
        const currentZoom = typeof zoom === 'number' ? zoom : 1;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(Math.min(Math.max(0.1, currentZoom * delta), 5));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        }
    };

    const handleMouseUp = () => setIsPanning(false);

    // If user navigates (prev/next), clear override.
    const handlePrev = () => { setOverrideImage(null); onPrev?.(); };
    const handleNext = () => { setOverrideImage(null); onNext?.(); };

    // Update Helpers
    const updateSetting = (key: keyof GenerationSettings, value: any) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    // Aspect Ratio Toggle Logic
    const toggleRatio = (ar: AspectRatio) => {
        if (randomAspectRatio) {
            // Multi-select mode
            let newSet;
            if (enabledRandomRatios.includes(ar)) {
                newSet = enabledRandomRatios.filter(r => r !== ar);
            } else {
                newSet = [...enabledRandomRatios, ar];
            }
            onEnabledRandomRatiosChange(newSet);
        } else {
            // Single select mode
            onAspectRatioChange(ar);
        }
    };

    // Render Helpers
    const renderViewport = () => {
        if (!displayImage) {
            return (
                <div className="text-center p-10 select-none pointer-events-none">
                    <div className="w-32 h-32 mx-auto mb-6 rounded-2xl border-2 border-dashed border-gray-700 flex items-center justify-center">
                        <span className="text-4xl text-gray-700">✨</span>
                    </div>
                    <h3 className="text-xl font-medium text-gray-400 mb-2">Ready to Imagine</h3>
                    <p className="text-gray-600 max-w-sm mx-auto">
                        Enter your prompt below, configure your settings, and press Generate to verify your idea.
                    </p>
                </div>
            );
        }

        const isFit = zoom === 'fit';
        const style = isFit ? {} : {
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: isPanning ? 'grabbing' : 'grab'
        };

        return (
            <img
                key={displayImage.id}
                src={displayImage.url}
                className={(isFit ? "max-w-full max-h-full object-contain shadow-2xl" : "max-w-none shadow-2xl") + " animate-fade-in"}
                style={style}
                draggable={false}
            />
        );
    };

    return (
        <div className="flex flex-col h-full bg-black select-none text-sans">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a] z-20">
                <div className="flex items-center gap-6">
                    <span className="font-bold text-gray-100 tracking-wider text-sm">GENERATION STUDIO</span>
                    <div className="h-4 w-px bg-gray-700 mx-2"></div>
                    <button className="text-xs text-gray-400 hover:text-white uppercase tracking-wide">Gallery</button>
                    <button className="text-xs text-gray-400 hover:text-white uppercase tracking-wide">History</button>
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
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-grow flex relative overflow-hidden">
                {/* Center Canvas */}
                <div
                    ref={containerRef}
                    className="flex-grow bg-[#0f0f0f] relative overflow-hidden flex items-center justify-center"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Grid BG */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                    {renderViewport()}

                    {/* View Controls (Floating) */}
                    <div className="absolute top-1/2 left-4 transform -translate-y-1/2 flex flex-col gap-3 bg-[#0a0a0a] p-2 rounded-2xl border border-gray-800 shadow-2xl z-30">
                        <button onClick={() => { setZoom('fit'); setPan({ x: 0, y: 0 }); }} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${zoom === 'fit' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-white/10'}`} title="Reset Fit">
                            <div className="w-5 h-5 border-2 border-current rounded-sm"></div>
                        </button>
                        <div className="h-px w-6 bg-gray-700 mx-auto my-1"></div>
                        <button onClick={() => setZoom(z => typeof z === 'number' ? z * 1.25 : 1.25)} className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/10" title="Zoom In">+</button>
                        <button onClick={() => setZoom(z => typeof z === 'number' ? z * 0.8 : 0.8)} className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/10" title="Zoom Out">-</button>
                    </div>

                    {isGenerating && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 bg-black/80 backdrop-blur border border-white/20 p-6 rounded-2xl flex flex-col items-center">
                            <div className="animate-spin text-indigo-500 mb-3">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            </div>
                            <span className="text-white font-medium text-sm">Generating... {Math.round(progress)}%</span>
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <div className="w-80 bg-[#141414] border-l border-[#2a2a2a] flex flex-col z-20 overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-[#2a2a2a]"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Configuration</h3></div>
                    <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-6">

                        {/* Provider */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Provider</label>
                            <select value={selectedProvider} onChange={e => onProviderChange(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-indigo-500">
                                {availableProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        {/* God Tier Presets */}
                        <div className="border-t border-gray-700 pt-4">
                            <PresetSelector
                                prompt={prompt}
                                currentPreset={settings.model}  // Track by preset ID
                                onPresetSelect={(presetId, preset) => {
                                    // Apply complete preset configuration
                                    onSettingsChange({
                                        ...settings,
                                        model: preset.model,
                                        scheduler: preset.scheduler,
                                        steps: preset.steps,
                                        cfg_scale: preset.cfg
                                    });
                                }}
                            />
                        </div>

                        {/* Intelligent Model Recommendation */}
                        <div className="border-t border-gray-700 pt-4 mt-4">
                            <ModelRecommendation
                                prompt={prompt}
                                currentModel={settings.model}
                                onModelSelect={(modelId, autoConfig) => {
                                    // Apply auto-configuration
                                    onSettingsChange({
                                        ...settings,
                                        ...autoConfig
                                    });
                                }}
                            />
                        </div>


                        {/* Aspect Ratio */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-gray-400">Aspect Ratio</label>
                                {onRandomAspectRatioChange && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-500">Random Start</span>
                                        <button
                                            onClick={() => onRandomAspectRatioChange(!randomAspectRatio)}
                                            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${randomAspectRatio ? 'bg-indigo-600' : 'bg-gray-700'}`}
                                            title="Apply random aspect ratio for each image in batch. Click buttons below to select allow-list."
                                        >
                                            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${randomAspectRatio ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className={`grid grid-cols-3 gap-2 transition-opacity duration-300`}>
                                {AspectRatios.map(ar => {
                                    // Determine active state
                                    let isActive = false;
                                    if (randomAspectRatio) {
                                        isActive = enabledRandomRatios.includes(ar);
                                    } else {
                                        isActive = aspectRatio === ar;
                                    }

                                    return (
                                        <button
                                            key={ar}
                                            onClick={() => toggleRatio(ar)}
                                            className={`py-2 text-xs rounded border transition-colors ${isActive
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                                }`}
                                        >
                                            {ar}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Parameters */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Steps: <span className="text-indigo-400">{settings.steps}</span></label>
                            <input type="range" min="1" max="50" value={settings.steps} onChange={e => updateSetting('steps', Number(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">CFG Scale: <span className="text-indigo-400">{settings.cfg_scale ? settings.cfg_scale.toFixed(1) : '7.0'}</span></label>
                            <input type="range" min="1" max="20" step="0.5" value={settings.cfg_scale} onChange={e => updateSetting('cfg_scale', Number(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Seed: <span className="text-indigo-400">{settings.seed === -1 ? 'Random' : settings.seed}</span></label>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input type="number" value={settings.seed} onChange={e => updateSetting('seed', Number(e.target.value))} className="flex-grow bg-gray-800 border border-gray-700 rounded p-1 text-xs text-white" />
                                    <button onClick={() => updateSetting('seed', -1)} className="px-2 bg-gray-700 rounded text-xs text-gray-300">🎲</button>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] text-gray-500">Auto-increment Next Seed</span>
                                    <button
                                        onClick={() => onAutoSeedAdvanceChange(!autoSeedAdvance)}
                                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${autoSeedAdvance ? 'bg-indigo-600' : 'bg-gray-700'}`}
                                        title="Automatically increment value for next generation (if not Random)"
                                    >
                                        <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${autoSeedAdvance ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Batch Generation */}
                        <div className="pt-4 border-t border-[#2a2a2a]">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Batch & Save</h4>

                            <div className="mb-4">
                                <label className="block text-xs text-gray-400 mb-1">Batch Count: <span className="text-indigo-400">{batchCount}</span></label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="range"
                                        min="1"
                                        max="200"
                                        value={batchCount}
                                        onChange={e => onBatchCountChange(Number(e.target.value))}
                                        className="flex-grow h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        max="200"
                                        value={batchCount}
                                        onChange={e => onBatchCountChange(Math.max(1, Math.min(200, Number(e.target.value))))}
                                        className="w-12 bg-gray-800 border border-gray-700 rounded p-1 text-xs text-center text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Auto-save to Gallery</span>
                                <button
                                    onClick={() => onAutoSaveChange(!autoSave)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoSave ? 'bg-indigo-600' : 'bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${autoSave ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Auto Play Switch */}
                            <div className="flex items-center justify-between mt-3">
                                <span className="text-xs text-gray-400">Auto-play Images</span>
                                <button
                                    onClick={() => onAutoPlayChange(!autoPlay)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoPlay ? 'bg-indigo-600' : 'bg-gray-700'}`}
                                    title="Automatically show the latest generated image"
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${autoPlay ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Slideshow Speed Slider */}
                            <div className={`transition-all duration-300 overflow-hidden ${autoPlay ? 'max-h-16 opacity-100 mt-3 ' : 'max-h-0 opacity-0'}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-gray-500">Speed</span>
                                    <span className="text-xs text-indigo-400">{(slideshowSpeed / 1000).toFixed(1)}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="1000" max="30000" step="500"
                                    value={slideshowSpeed}
                                    onChange={(e) => onSlideshowSpeedChange(parseInt(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    title="Slideshow interval"
                                />
                            </div>

                            {!autoSave && (
                                <p className="mt-2 text-[10px] text-yellow-500 leading-tight">
                                    ⚠️ Warning: Images will not be saved automatically. They may be lost if you navigate away or generate a new batch.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar (Prompts & Transport) */}
            <div className="bg-[#141414] border-t border-[#2a2a2a] p-4 z-20 flex flex-col gap-4 relative">

                {/* Batch Progress Bar */}
                {batchProgress && batchProgress.total > 1 && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800">
                        <div
                            className={`h-full transition-all duration-300 ${batchProgress.current === batchProgress.total ? 'bg-green-500' : 'bg-indigo-500'}`}
                            style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                        />
                    </div>
                )}

                <div className="flex gap-4 h-24">
                    <div className="flex-grow relative group">
                        <textarea
                            value={prompt}
                            onChange={e => onPromptChange(e.target.value)}
                            onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') onGenerate(); }}
                            placeholder="Describe your imagination..."
                            className="w-full h-full bg-[#0a0a0a] border border-gray-800 group-hover:border-gray-600 rounded-lg p-3 text-sm text-white resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <div className="absolute top-2 right-2 text-[10px] uppercase text-gray-600 font-bold pointer-events-none">Positive</div>
                    </div>
                    <div className="w-1/3 relative group">
                        <textarea
                            value={negativePrompt}
                            onChange={e => onNegativePromptChange(e.target.value)}
                            placeholder="Things to avoid..."
                            className="w-full h-full bg-[#0a0a0a] border border-gray-800 group-hover:border-gray-600 rounded-lg p-3 text-sm text-gray-300 resize-none focus:outline-none focus:border-red-900 transition-colors"
                        />
                        <div className="absolute top-2 right-2 flex items-center gap-2">
                            <div className="text-[10px] uppercase text-gray-600 font-bold pointer-events-none">Negative</div>
                            {negativePromptHistory.length > 0 && (
                                <button
                                    onClick={() => setShowNegativeHistory(!showNegativeHistory)}
                                    className="text-gray-500 hover:text-white pointer-events-auto"
                                    title="Reuse saved negative prompts"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                            )}
                        </div>
                        {showNegativeHistory && (
                            <div className="absolute bottom-full right-0 mb-2 w-72 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 p-1">
                                {negativePromptHistory.map((p, i) => (
                                    <div key={i} className="flex items-center group/item hover:bg-gray-800 rounded border-b border-gray-800 last:border-0">
                                        <button
                                            onClick={() => { onNegativePromptChange(p); setShowNegativeHistory(false); }}
                                            className="flex-grow text-left p-2 text-xs text-gray-300 truncate"
                                            title={p}
                                        >
                                            {p}
                                        </button>
                                        {onDeleteNegativePrompt && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteNegativePrompt(p);
                                                }}
                                                className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                title="Remove from history"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Negative Prompt Templates Section */}
                <div className="mt-4">
                    <NegativePromptSelector
                        currentPrompt={negativePrompt}
                        onSelectTemplate={(template) => onNegativePromptChange(template)}
                        onSaveCustom={(customPrompt) => {
                            // Save to history if handler provided
                            if (onDeleteNegativePrompt) {
                                // This implies we have save functionality
                                const updatedHistory = [...negativePromptHistory, customPrompt];
                                // Trigger save via parent
                            }
                            onNegativePromptChange(customPrompt);
                        }}
                        customTemplates={negativePromptHistory}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 font-mono w-1/3 flex items-center gap-2">
                        {isGenerating ? (
                            <span className="text-indigo-400 animate-pulse">GENERATING BATCH... {batchProgress ? `${batchProgress.current}/${batchProgress.total}` : ''}</span>
                        ) : (
                            <span>READY</span>
                        )}
                        {batchProgress && batchProgress.total > 1 && !isGenerating && batchProgress.current === batchProgress.total && (
                            <span className="text-green-500 font-bold">BATCH COMPLETE</span>
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={handlePrev}
                            disabled={!onPrev || (!sessionImages || sessionImages.length === 0)}
                            className={`text-gray-500 hover:text-white transition-colors ${(!onPrev || sessionImages?.length === 0) ? 'opacity-30 cursor-not-allowed' : ''}`}
                            title="Previous Image"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                        </button>

                        <button
                            onClick={onGenerate}
                            disabled={isGenerating || !prompt.trim()}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${isGenerating ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105'}`}
                        >
                            {isGenerating ? (
                                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            )}
                        </button>

                        <button
                            onClick={handleNext}
                            disabled={!onNext || (!sessionImages || sessionImages.length === 0)}
                            className={`text-gray-500 hover:text-white transition-colors ${(!onNext || sessionImages?.length === 0) ? 'opacity-30 cursor-not-allowed' : ''}`}
                            title="Next Image"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
                        </button>
                    </div>

                    <div className="w-1/3 flex justify-end text-xs text-gray-500 flex-col items-end">
                        <span>{availableProviders.find(p => p.id === selectedProvider)?.name || selectedProvider}</span>
                        {sessionImages && sessionImages.length > 0 && currentImageIndex !== undefined && currentImageIndex !== -1 && (
                            <span className="text-[10px] text-gray-600 font-mono mt-1">
                                VIEWING {currentImageIndex + 1} / {sessionImages.length}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenerationPlayer;
