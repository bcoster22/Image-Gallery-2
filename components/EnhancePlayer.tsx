import React, { useState, useEffect, useRef } from 'react';
import { ImageInfo, UpscaleSettings, AIModelSettings } from '../types';
import AIModelSettingsPanel from './AIModelSettingsPanel';

interface ProcessingStage {
    name: string;
    status: 'pending' | 'processing' | 'complete';
    progress: number; // 0-100
    color: string;
}

interface EnhancePlayerProps {
    sourceImage: ImageInfo;
    // We support both simple upscaling settings and advanced generative settings
    upscaleSettings?: UpscaleSettings;
    aiSettings?: AIModelSettings;
    onAiSettingsChange?: (settings: AIModelSettings) => void;

    onNavigate?: (direction: 'next' | 'prev') => void;
    onPreviewGenerate: (settings: AIModelSettings, autoSave?: boolean) => Promise<string | null>;
    hasNext?: boolean;
    hasPrev?: boolean;
    availableProviders?: { id: string; name: string; model?: string | null; models?: string[] }[];
    resultImage?: string | null;
    isBatchProcessing?: boolean;
    promptHistory?: string[];
}

const EnhancePlayer: React.FC<EnhancePlayerProps> = ({
    sourceImage,
    upscaleSettings,
    aiSettings,
    onAiSettingsChange,
    onNavigate,
    onPreviewGenerate,
    hasNext = false,
    hasPrev = false,
    availableProviders,
    resultImage,
    isBatchProcessing = false,
    promptHistory
}) => {
    // Processing State
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(resultImage || null);
    const [activeStageIndex, setActiveStageIndex] = useState<number>(-1);
    const [autoSave, setAutoSave] = useState(true);

    // Sync prop to state
    useEffect(() => {
        if (resultImage !== undefined) setPreviewImage(resultImage);
    }, [resultImage]);

    // View State
    const [viewMode, setViewMode] = useState<'single' | 'sidebyside' | 'split' | 'overlay'>('single');
    const [splitPosition, setSplitPosition] = useState(50);
    const [zoom, setZoom] = useState<number | 'fit'>('fit');
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDraggingSplit, setIsDraggingSplit] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [isPeekingOriginal, setIsPeekingOriginal] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Filters (Local state for toggles that don't belong in AI Settings yet, or derived)
    const [motionDeblur, setMotionDeblur] = useState(false);
    const [grain, setGrain] = useState(false);

    // Initialize/Reset State on image change
    useEffect(() => {
        // Only reset if no resultImage passed
        if (resultImage === undefined) setPreviewImage(null);
        setProcessingStages([]);
        setZoom('fit');
        setPan({ x: 0, y: 0 });
        setIsProcessing(false);
    }, [sourceImage.id]);

    // Construct Pipeline Visualization
    useEffect(() => {
        const stages: ProcessingStage[] = [];
        if (motionDeblur) {
            stages.push({ name: 'Motion Deblur', status: 'pending', progress: 0, color: 'bg-blue-500' });
        }
        // Core Enhancement (always present)
        stages.push({ name: 'Enhancement', status: 'pending', progress: 0, color: 'bg-indigo-500' });

        if (grain) {
            stages.push({ name: 'Grain Removal', status: 'pending', progress: 0, color: 'bg-yellow-500' });
        }
        setProcessingStages(stages);
    }, [motionDeblur, grain]); // 'Enhancement' is implicit

    // Simulation Logic (Replace with real backend events later)
    const simulateProcessing = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setActiveStageIndex(0);

        const currentStages = [...processingStages];

        // Reset all
        currentStages.forEach(s => { s.status = 'pending'; s.progress = 0; });
        setProcessingStages([...currentStages]);

        if (onPreviewGenerate && aiSettings) {
            // Real Processing
            try {
                // Start Fake Progress
                currentStages.forEach(s => { s.status = 'processing'; s.progress = 0; });
                setProcessingStages([...currentStages]);

                const progressInterval = setInterval(() => {
                    setProcessingStages(prev => {
                        const newStages = [...prev];
                        newStages.forEach(s => {
                            if (s.status === 'processing' && s.progress < 90) {
                                s.progress += (90 - s.progress) * 0.1; // Asymptotic approach to 90
                            }
                        });
                        return newStages;
                    });
                }, 500);

                const resultUrl = await onPreviewGenerate(aiSettings, autoSave);

                clearInterval(progressInterval);

                if (resultUrl) {
                    setPreviewImage(resultUrl);
                    // Complete stages
                    currentStages.forEach(s => { s.status = 'complete'; s.progress = 100; });
                    setProcessingStages(currentStages);
                }
            } catch (error) {
                console.error("Generation failed", error);
                currentStages.forEach(s => { s.status = 'error'; });
                setProcessingStages(currentStages);
            }
        } else {
            // Fallback Simulation
            for (let i = 0; i < currentStages.length; i++) {
                setActiveStageIndex(i);
                currentStages[i].status = 'processing';
                setProcessingStages([...currentStages]);

                for (let p = 0; p <= 100; p += 10) {
                    currentStages[i].progress = p;
                    setProcessingStages([...currentStages]);
                    await new Promise(r => setTimeout(r, 50));
                }
                currentStages[i].status = 'complete';
                setProcessingStages([...currentStages]);
            }
            // Set dummy preview if simulation
            if (sourceImage) setPreviewImage(sourceImage.dataUrl);
        }

        setIsProcessing(false);
    };

    const handleProcess = () => {
        simulateProcessing();
    };



    // Zoom & Pan Handlers
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const currentZoom = typeof zoom === 'number' ? zoom : 1;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(Math.max(0.1, currentZoom * delta), 5);
        setZoom(newZoom);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only pan if middle click or spacebar held (video editor style) or just standard drag if fit mode logic requires it
        // For this UI, let's treat left drag as Pan unless interactive split

        // Compare Logic (Click and Hold)
        if (viewMode === 'single' && previewImage) {
            setIsPeekingOriginal(true);
        }

        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        // Use contentRef for split dragging to match the image dimensions
        const targetRef = contentRef.current ? contentRef : containerRef;

        if (isDraggingSplit && targetRef.current) {
            e.preventDefault();
            const rect = targetRef.current.getBoundingClientRect();

            // Calculate relative to the specific container bounds (image for split view)
            const x = e.clientX - rect.left;
            const percentage = (x / rect.width) * 100;

            setSplitPosition(Math.max(0, Math.min(100, percentage)));
            return;
        }

        if (isPanning) {
            setPan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setIsDraggingSplit(false);
        setIsPeekingOriginal(false);
    };

    const isCursorOnSplitter = (e: React.MouseEvent) => {
        return false; // Deprecated
    };

    // Helper to render the image content based on mode
    const renderViewport = () => {
        const isFit = zoom === 'fit';
        const viewportStyle = isFit ? {} : {
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
            transformOrigin: 'center',
            cursor: isPanning ? 'grabbing' : 'grab'
        };

        const fitClass = isFit
            ? "max-w-full max-h-full object-contain pointer-events-none select-none shadow-xl"
            : "max-w-none pointer-events-none select-none shadow-xl";

        if (viewMode === 'single') {
            const showOriginal = !previewImage || isPeekingOriginal;
            const imgToShow = showOriginal ? sourceImage.dataUrl : previewImage;
            return <img src={imgToShow} alt="View" className={fitClass} style={viewportStyle} />;
        }

        if (viewMode === 'sidebyside') {
            return (
                <div className="flex gap-4 items-center justify-center h-full w-full" style={isFit ? {} : { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
                    <img src={sourceImage.dataUrl} alt="Original" className={isFit ? "max-w-[45%] max-h-full object-contain pointer-events-none select-none shadow-lg border border-gray-700" : "max-w-none pointer-events-none select-none shadow-lg border border-gray-700"} />
                    {previewImage ? (
                        <img src={previewImage} alt="Enhanced" className={isFit ? "max-w-[45%] max-h-full object-contain pointer-events-none select-none shadow-lg border border-gray-700" : "max-w-none pointer-events-none select-none shadow-lg border border-gray-700"} />
                    ) : (
                        <div className="w-[45%] h-64 border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500">
                            Waiting for process...
                        </div>
                    )}
                </div>
            );
        }

        if (viewMode === 'split' && previewImage) {
            return (
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Split View Container - Applies Zoom/Pan */}
                    <div
                        ref={contentRef}
                        className="relative inline-block"
                        style={isFit ? { height: '100%' } : { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center' }}
                    >

                        {/* 1. Underlying: Enhanced Image (Sets Dimensions) */}
                        <img
                            src={previewImage}
                            alt="Enhanced"
                            className={isFit ? "h-full object-contain block select-none pointer-events-none" : "block select-none pointer-events-none"}
                        />

                        {/* 2. Overlay: Original Image (Scaled to match Enhanced) */}
                        <img
                            src={sourceImage.dataUrl}
                            alt="Original"
                            className={isFit ? "absolute top-0 left-0 h-full w-full object-contain block select-none pointer-events-none" : "absolute top-0 left-0 w-full h-full block select-none pointer-events-none"}
                            style={{
                                clipPath: `inset(0 ${100 - splitPosition}% 0 0)`
                            }}
                        />

                        {/* 3. Drag Handle */}
                        <div
                            className="absolute top-0 bottom-0 w-4 cursor-col-resize z-20 hover:bg-white/10 group flex items-center justify-center"
                            style={{ left: `${splitPosition}%`, transform: 'translateX(-50%)' }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setIsDraggingSplit(true);
                            }}
                        >
                            {/* Visual Line */}
                            <div className="w-0.5 h-full bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
                            {/* Handle Icon */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center text-black">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)" /></svg>
                            </div>
                        </div>

                    </div>
                </div>
            );
        }

        return <img src={sourceImage.dataUrl} alt="Original" className={fitClass} style={viewportStyle} />;
    };


    // View Controls Overlay (Left Vertical Floating Bar matching User Screenshot)
    const renderViewControls = () => (
        <div className="absolute top-1/2 left-4 transform -translate-y-1/2 flex flex-col gap-3 bg-[#0a0a0a] p-2 rounded-2xl border border-gray-800 shadow-2xl z-30"
            onMouseDown={(e) => e.stopPropagation()}>
            {/* Square (Single View - Fit) */}
            <button
                onClick={() => { setViewMode('single'); setZoom('fit'); setPan({ x: 0, y: 0 }); }}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${viewMode === 'single' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-400 hover:bg-white/10'}`}
                title="Single View (Fit)"
            >
                <div className="w-5 h-5 border-2 border-current rounded-sm"></div>
            </button>

            {/* Compare (Eye) */}
            <button
                onMouseDown={() => setIsPeekingOriginal(true)}
                onMouseUp={() => setIsPeekingOriginal(false)}
                onMouseLeave={() => setIsPeekingOriginal(false)}
                disabled={!previewImage}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isPeekingOriginal ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-white/10 disabled:opacity-30'}`}
                title="Hold to Compare"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            </button>

            {/* Split (Vertical/Pause look) */}
            <button
                onClick={() => { setViewMode('sidebyside'); setZoom('fit'); setPan({ x: 0, y: 0 }); }}
                disabled={!previewImage}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${viewMode === 'sidebyside' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-400 hover:bg-white/10 disabled:opacity-30'}`}
                title="Side by Side"
            >
                <div className="flex gap-1">
                    <div className="w-2 h-5 border-2 border-current rounded-sm"></div>
                    <div className="w-2 h-5 border-2 border-current rounded-sm"></div>
                </div>
            </button>

            {/* Split (Overlay/Slider) */}
            <button
                onClick={() => { setViewMode('split'); setZoom('fit'); setPan({ x: 0, y: 0 }); }}
                disabled={!previewImage}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${viewMode === 'split' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-400 hover:bg-white/10 disabled:opacity-30'}`}
                title="Slider Compare"
            >
                <div className="relative w-5 h-5 border-2 border-current rounded-sm">
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-current -ml-px"></div>
                </div>
            </button>

            <div className="h-px w-6 bg-gray-700 mx-auto my-1"></div>

            {/* Four Arrows (Fit/Reset) */}
            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setZoom(z => typeof z === 'number' ? Math.max(0.1, z * 0.8) : 0.8)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                    title="Zoom Out"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>
                <div className="w-px h-4 bg-gray-700"></div>
                <button
                    onClick={() => setZoom(z => typeof z === 'number' ? Math.min(5, z * 1.25) : 1.25)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                    title="Zoom In"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            <button
                onClick={() => { setZoom('fit'); setPan({ x: 0, y: 0 }); }}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${zoom === 'fit' ? 'text-indigo-400' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                title="Reset Fit"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
            </button>
        </div>
    );

    // Dimensions State
    const [previewDimensions, setPreviewDimensions] = useState<{ width: number, height: number } | null>(null);

    // Reset dimensions when image changes
    useEffect(() => {
        setPreviewDimensions(null);

        // Pre-calculate expected dimensions based on settings if available
        if (sourceImage && (aiSettings?.target_megapixels || upscaleSettings?.targetMegapixels)) {
            const targetMp = aiSettings?.target_megapixels || upscaleSettings?.targetMegapixels;
            if (targetMp) {
                const sourceMp = (sourceImage.width || 0) * (sourceImage.height || 0) / 1000000;
                if (sourceMp > 0) {
                    const scaleFactor = Math.sqrt(targetMp / sourceMp);
                    setPreviewDimensions({
                        width: Math.round((sourceImage.width || 0) * scaleFactor),
                        height: Math.round((sourceImage.height || 0) * scaleFactor)
                    });
                }
            }
        }
    }, [sourceImage.id, previewImage, aiSettings?.target_megapixels, upscaleSettings?.targetMegapixels]); // Update when settings change

    return (
        <div className="flex flex-col h-full bg-black select-none text-sans">
            {/* Top Menu Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a] z-20">
                <div className="flex items-center gap-6">
                    <span className="font-bold text-gray-100 tracking-wider text-sm">ENHANCE STUDIO</span>
                    <div className="h-4 w-px bg-gray-700 mx-2"></div>
                    <button className="text-xs text-gray-400 hover:text-white uppercase tracking-wide">View</button>
                    <button className="text-xs text-gray-400 hover:text-white uppercase tracking-wide">Export</button>
                    {isBatchProcessing && <span className="text-xs text-purple-400 font-bold animate-pulse">BATCH MODE</span>}
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
                    <span>{sourceImage.width}x{sourceImage.height}</span>
                    <span className="text-gray-600">→</span>
                    <span className={previewDimensions ? "text-indigo-400" : "text-gray-600"}>
                        {previewDimensions ? `${previewDimensions.width}x${previewDimensions.height}` : '???'}
                    </span>
                    <span className="text-indigo-400">{zoom === 'fit' ? 'FIT' : Math.round(zoom * 100) + '%'}</span>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-grow flex relative overflow-hidden bg-[#0f0f0f]">

                {/* Viewport (Center Stage) */}
                <div
                    ref={containerRef}
                    className="flex-grow relative overflow-hidden flex items-center justify-center cursor-default"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Grid Pattern Background */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{
                            backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
                            backgroundSize: '20px 20px'
                        }}
                    />

                    {renderViewport()}
                    {renderViewControls()}

                    {/* Processing Overlay */}
                    {isProcessing && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
                            <div className="bg-black/80 backdrop-blur-xl border border-white/20 p-6 rounded-2xl flex flex-col items-center shadow-2xl">
                                <span className="animate-spin text-indigo-500 mb-3">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                </span>
                                <span className="text-white font-medium text-sm tracking-wide">
                                    {processingStages.find(s => s.status === 'processing')?.name || 'Processing...'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Hidden Measure Image */}
                {previewImage && !previewDimensions && (
                    <img
                        src={previewImage}
                        alt="Measure"
                        className="absolute top-0 left-0 opacity-0 pointer-events-none -z-50"
                        style={{ width: '1px', height: '1px' }}
                        onLoad={(e) => {
                            const img = e.currentTarget;
                            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                                setPreviewDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                            }
                        }}
                    />
                )}

                {/* Right Sidebar (Control Panel) */}
                <div className="w-80 bg-[#141414] border-l border-[#2a2a2a] flex flex-col z-20 overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-[#2a2a2a]">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Enhancement Suite</h3>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
                        {/* Filters */}
                        <div className="mb-4">
                            <div className="text-xs font-semibold text-gray-300 mb-2 px-2 uppercase">Post-Processing</div>
                            <div className="space-y-1">
                                <label className="flex items-center justify-between p-2.5 rounded hover:bg-white/5 cursor-pointer transition-colors group">
                                    <span className="text-sm text-gray-400 group-hover:text-gray-200">Motion Deblur</span>
                                    <input type="checkbox" checked={motionDeblur} onChange={e => setMotionDeblur(e.target.checked)} className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-offset-gray-900" />
                                </label>
                                <label className="flex items-center justify-between p-2.5 rounded hover:bg-white/5 cursor-pointer transition-colors group">
                                    <span className="text-sm text-gray-400 group-hover:text-gray-200">Grain Removal</span>
                                    <input type="checkbox" checked={grain} onChange={e => setGrain(e.target.checked)} className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-offset-gray-900" />
                                </label>
                            </div>
                        </div>

                        {/* AI Settings Injection */}
                        <div className="border-t border-[#2a2a2a] pt-4 px-2">
                            {aiSettings && onAiSettingsChange ? (
                                <AIModelSettingsPanel
                                    settings={aiSettings}
                                    onChange={onAiSettingsChange}
                                    preset="standard"
                                    availableProviders={availableProviders}
                                    promptHistory={promptHistory}
                                    autoSave={autoSave}
                                    onAutoSaveChange={setAutoSave}
                                />
                            ) : (
                                <div className="text-center text-gray-500 text-sm py-4">No AI Settings Available</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar (Timeline & Transport) */}
            <div className="bg-[#141414] border-t border-[#2a2a2a] px-4 py-2 z-20 flex flex-col gap-2">
                {/* Timeline Visualization */}
                <div className="w-full flex h-8 items-stretch bg-black rounded-md overflow-hidden border border-gray-800 relative">
                    {processingStages.length > 0 ? processingStages.map((stage, idx) => (
                        <div key={idx} className="flex-1 border-r border-gray-900 bg-[#111] relative group flex items-center justify-center">
                            {/* Progress Fill */}
                            <div
                                className={`absolute top-0 bottom-0 left-0 transition-all duration-200 opacity-20 ${stage.color}`}
                                style={{ width: `${stage.progress}%` }}
                            />
                            {/* Active Highlight */}
                            <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${stage.status === 'processing' ? 'bg-white animate-pulse' : stage.status === 'complete' ? stage.color : 'bg-transparent'}`} />

                            <span className={`relative text-[10px] uppercase font-bold tracking-wider ${stage.status === 'pending' ? 'text-gray-600' : 'text-gray-300'}`}>
                                {stage.name}
                            </span>
                        </div>
                    )) : (
                        <div className="w-full flex items-center justify-center text-xs text-gray-600">Timeline Empty - Add Filters or Settings</div>
                    )}
                </div>

                {/* Transport Controls */}
                <div className="flex items-center justify-between">
                    {/* Left - Time/Status */}
                    <div className="w-1/3 text-xs text-gray-500 font-mono flex items-center gap-2">
                        <span>{isProcessing ? `PROCESSING > STAGE ${activeStageIndex + 1}/${processingStages.length}` : 'IDLE'}</span>
                    </div>

                    {/* Center - Buttons */}
                    <div className="flex items-center justify-center gap-1">
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Jump to Start">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                        </button>
                        <button
                            onClick={() => onNavigate && onNavigate('prev')}
                            disabled={!hasPrev}
                            className={`p-2 rounded transition-colors ${hasPrev ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-700 cursor-not-allowed'}`}
                            title="Step Back"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11 19V5l-7 7 7 7zm1-14v14l7-7-7-7z" /></svg>
                        </button>

                        <div className="flex flex-col items-center">
                            <button
                                onClick={simulateProcessing}
                                className={`mx-2 w-10 h-10 flex items-center justify-center rounded-full transition-all shadow-lg ${isProcessing ? 'bg-red-900/50 text-red-500 border border-red-500/50' : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105'}`}
                            >
                                {isProcessing ? (
                                    <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                )}
                            </button>
                        </div>

                        <button
                            onClick={() => onNavigate && onNavigate('next')}
                            disabled={!hasNext}
                            className={`p-2 rounded transition-colors ${hasNext ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-700 cursor-not-allowed'}`}
                            title="Step Forward"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 19l7-7-7-7v14zm9-14v14l7-7-7-7z" /></svg>
                        </button>
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Jump to End">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                        </button>
                    </div>

                    {/* Right - Meta */}
                    <div className="w-1/3 flex justify-end text-xs text-gray-500 items-center gap-4">

                        <span>{activeStageIndex > -1 ? Math.round(processingStages[activeStageIndex]?.progress || 0) + '%' : 'READY'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default EnhancePlayer;
