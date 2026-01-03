import React, { useState, useEffect, useRef } from 'react';
import {
    ClipboardIcon as CopyIcon,
    ArrowDownTrayIcon as DownloadIcon,
} from '@heroicons/react/24/outline';
import { ActionButtons } from './ActionButtons';
import { MetadataPanelProps } from './ImageViewer.types';
import {
    SCROLL_START_DELAY_MS,
    SCROLL_INTERVAL_MS,
    SCROLL_PAUSE_AT_BOTTOM_MS,
    KEYWORDS_SCROLL_INTERVAL_MS,
} from '../../constants/timings';

export const MetadataPanel: React.FC<MetadataPanelProps> = ({
    image, onRecreate, onGenerate, isPreparingAnimation, onAnimate, onEnhance, onKeywordClick,
    settings, currentUser, onTogglePublicStatus, onCopyPrompt, isCopied, isVisible,
    onRetryAnalysis, onRegenerateCaption, onSmartCrop, isSmartCropping, isSmartFilled,
    isSlideshowActive, onToggleSlideshow, slideshowDelay, onSlideshowDelayChange, hasMultipleImages,
    activeContext, setActiveContext
}) => {

    const promptScrollRef = useRef<HTMLDivElement>(null);
    const keywordsScrollRef = useRef<HTMLDivElement>(null);
    const [isHoveringPrompt, setIsHoveringPrompt] = useState(false);
    const [isHoveringKeywords, setIsHoveringKeywords] = useState(false);

    // Derived active text
    const hasMetadata = !!image.originalMetadataPrompt;
    const activeText = activeContext === 'caption' ? image.recreationPrompt : image.originalMetadataPrompt;

    const promptScrollTimersRef = useRef<{
        start: NodeJS.Timeout | null;
        interval: NodeJS.Timeout | null;
        return: NodeJS.Timeout | null;
    }>({ start: null, interval: null, return: null });

    // Auto-scroll logic
    useEffect(() => {
        const el = promptScrollRef.current;
        if (!el || !activeText || isHoveringPrompt) return;

        // Initial delay before starting
        promptScrollTimersRef.current.start = setTimeout(() => {
            let state: 'scroll' | 'wait' | 'return' | 'stop' = 'scroll';

            promptScrollTimersRef.current.interval = setInterval(() => {
                if (!el || isHoveringPrompt) return;

                if (state === 'scroll') {
                    if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
                        state = 'wait';
                        promptScrollTimersRef.current.return = setTimeout(() => {
                            state = 'return';
                        }, SCROLL_PAUSE_AT_BOTTOM_MS);
                    } else {
                        el.scrollTop += 1;
                    }
                } else if (state === 'return') {
                    el.scrollTo({ top: 0, behavior: 'smooth' });
                    state = 'stop';
                    if (promptScrollTimersRef.current.interval) {
                        clearInterval(promptScrollTimersRef.current.interval);
                        promptScrollTimersRef.current.interval = null;
                    }
                }
            }, SCROLL_INTERVAL_MS);
        }, SCROLL_START_DELAY_MS);

        return () => {
            if (promptScrollTimersRef.current.start) {
                clearTimeout(promptScrollTimersRef.current.start);
                promptScrollTimersRef.current.start = null;
            }
            if (promptScrollTimersRef.current.interval) {
                clearInterval(promptScrollTimersRef.current.interval);
                promptScrollTimersRef.current.interval = null;
            }
            if (promptScrollTimersRef.current.return) {
                clearTimeout(promptScrollTimersRef.current.return);
                promptScrollTimersRef.current.return = null;
            }
        };
    }, [activeText, isHoveringPrompt, isVisible, activeContext]);

    // Auto-scroll keywords
    useEffect(() => {
        const el = keywordsScrollRef.current;
        if (!el || !image?.keywords || isHoveringKeywords) return;
        const startTimeout = setTimeout(() => {
            let scrollInterval: NodeJS.Timeout;
            const scroll = () => {
                if (!el || isHoveringKeywords) return;
                if (el.scrollLeft + el.clientWidth >= el.scrollWidth) return;
                el.scrollLeft += 1;
            };
            scrollInterval = setInterval(scroll, KEYWORDS_SCROLL_INTERVAL_MS);
            return () => clearInterval(scrollInterval);
        }, 2000);
        return () => clearTimeout(startTimeout);
    }, [image?.keywords, isHoveringKeywords, isVisible]);

    const handleKeywordsWheel = (e: React.WheelEvent) => {
        if (keywordsScrollRef.current) {
            e.stopPropagation();
            if (e.deltaY !== 0) {
                keywordsScrollRef.current.scrollLeft += e.deltaY;
            } else if (e.deltaX !== 0) {
                keywordsScrollRef.current.scrollLeft += e.deltaX;
            }
        }
    };

    const handleDownload = async () => {
        if (!image) return;
        try {
            let downloadUrl = '';
            let shouldRevoke = false;
            let mimeType = '';

            if (image.file instanceof Blob) {
                const blob = new Blob([image.file], { type: image.file.type });
                downloadUrl = URL.createObjectURL(blob);
                mimeType = image.file.type;
                shouldRevoke = true;
            }
            else if (image.dataUrl && image.dataUrl.startsWith('data:')) {
                const blob = await fetch(image.dataUrl).then(res => res.blob());
                mimeType = blob.type;
                downloadUrl = URL.createObjectURL(blob);
                shouldRevoke = true;
            }
            else if (image.videoUrl) {
                downloadUrl = image.videoUrl;
                mimeType = 'video/mp4';
            }

            if (!downloadUrl) return;

            let originalName = image.displayName || image.fileName || 'image';
            originalName = originalName.replace(/\.[^/.]+$/, "").replace(/[<>:"/\\|?*]/g, '');


            let ext = '.png';
            if (mimeType.includes('video') || image.isVideo) ext = '.mp4';
            else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
            else if (mimeType.includes('gif')) ext = '.gif';
            let safeFileName = originalName + ext;

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = safeFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (shouldRevoke) setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        } catch (e) {
            console.error("Download failed:", e);
        }
    };

    const isOwner = currentUser && image.ownerId === currentUser.id;

    return (
        <div
            className={`
        z-50 bg-black/40 backdrop-blur-xl border-t lg:border border-white/10 shadow-2xl text-white transition-all duration-300 ease-out transform
        fixed bottom-16 lg:bottom-6 left-0 right-0 rounded-t-2xl rounded-b-none max-h-[60vh] flex flex-col
        lg:absolute lg:left-6 lg:right-6 lg:rounded-2xl lg:max-h-none lg:max-w-7xl lg:mx-auto lg:block
        ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-full lg:translate-y-8 lg:scale-95 pointer-events-none'}
      `}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className="flex-1 overflow-y-auto lg:overflow-visible p-3 lg:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-2 lg:gap-8 items-start">

                    {/* Column 1: Image & System Metadata */}
                    <div className="flex flex-row overflow-x-auto items-center gap-3 scrollbar-none lg:flex-col lg:items-start lg:gap-0 lg:space-y-4 lg:overflow-visible whitespace-nowrap max-w-full lg:max-w-none">
                        {image.width && image.height && image.aspectRatio && (
                            <div className="flex flex-col gap-1">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Image Specs</h3>
                                <div className="flex flex-wrap gap-2 items-center">
                                    <div className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs font-medium text-white/80 font-mono">
                                        {image.width} &times; {image.height} <span className="opacity-50">|</span> {image.aspectRatio}
                                    </div>
                                    {image.smartCrop && (
                                        <div className="flex items-center justify-center w-6 h-6 bg-indigo-500/10 border border-indigo-500/20 rounded-md" title={`Smart Crop Active (${image.smartCrop.x.toFixed(0)}%, ${image.smartCrop.y.toFixed(0)}%)`}>
                                            <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_5px_rgba(129,140,248,0.5)]"></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {isOwner && (
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Visibility</h3>
                                <label htmlFor="is-public-toggle" className="flex items-center cursor-pointer group w-fit">
                                    <div className="relative">
                                        <input type="checkbox" id="is-public-toggle" className="sr-only peer" checked={!!image.isPublic} onChange={() => onTogglePublicStatus(image.id)} />
                                        <div className="w-9 h-5 bg-white/10 rounded-full peer peer-focus:ring-2 peer-focus:indigo-500 peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full transition-colors"></div>
                                    </div>
                                    <span className="ml-3 text-sm text-white/70 group-hover:text-white transition-colors">{image.isPublic ? 'Public' : 'Private'}</span>
                                </label>
                            </div>
                        )}

                        {hasMultipleImages && (
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Slideshow</h3>
                                <div className="flex items-center gap-3">
                                    <label htmlFor="slideshow-toggle" className="flex items-center cursor-pointer group w-fit">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                id="slideshow-toggle"
                                                className="sr-only peer"
                                                checked={isSlideshowActive}
                                                onChange={onToggleSlideshow}
                                            />
                                            <div className="w-11 h-6 bg-white/10 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500 peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full transition-colors"></div>
                                        </div>
                                        <span className="ml-2 text-xs text-white/70 group-hover:text-white transition-colors">{isSlideshowActive ? 'On' : 'Off'}</span>
                                    </label>
                                    {isSlideshowActive && (
                                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-2 pl-3 py-1 rounded-full">
                                            <input type="range" min="2000" max="20000" step="1000" value={slideshowDelay} onChange={(e) => onSlideshowDelayChange(Number(e.target.value))} className="w-16 h-1 bg-white/20 rounded-lg accent-indigo-500" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Column 2: Content (Prompt & Keywords) */}
                    <div className="flex flex-col gap-4 min-w-0">
                        <div className="flex items-center justify-between">
                            {/* TABS for Context */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setActiveContext('caption')}
                                    className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${activeContext === 'caption' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <span className={`w-1 h-1 rounded-full ${activeContext === 'caption' ? 'bg-purple-400' : 'bg-gray-600'}`}></span>
                                    AI Context
                                </button>

                                {hasMetadata && (
                                    <>
                                        <div className="h-3 w-px bg-white/10"></div>
                                        <button
                                            onClick={() => setActiveContext('metadata')}
                                            className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${activeContext === 'metadata' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                                        >
                                            <span className={`w-1 h-1 rounded-full ${activeContext === 'metadata' ? 'bg-blue-400' : 'bg-gray-600'}`}></span>
                                            Generation Data
                                        </button>
                                    </>
                                )}
                            </div>

                            {activeText && (
                                <button
                                    onClick={onCopyPrompt}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wide text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    {isCopied ? <span className="text-green-400">Copied</span> : <span>Copy Prompt</span>}
                                    <CopyIcon className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        <div className="relative group/prompt">
                            {activeText ? (
                                <div
                                    ref={promptScrollRef}
                                    onMouseEnter={() => setIsHoveringPrompt(true)}
                                    onMouseLeave={() => setIsHoveringPrompt(false)}
                                    onTouchStart={() => setIsHoveringPrompt(true)}
                                    className="text-sm leading-relaxed text-white/90 font-light bg-black/20 p-4 rounded-xl border border-white/5 max-h-[120px] overflow-y-auto scrollbar-none hover:scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 transition-all"
                                    style={{ scrollBehavior: 'auto' }}
                                >
                                    {activeText}
                                </div>
                            ) : (
                                <div className="text-sm text-white/40 italic bg-black/20 p-4 rounded-xl border border-white/5 border-dashed">
                                    {activeContext === 'caption' ? 'No AI description available.' : 'No generation data found.'}
                                </div>
                            )}

                            {activeContext === 'caption' && image.analysisFailed && onRetryAnalysis && (
                                <div className="mt-3 flex items-center justify-between p-2 pl-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <span className="text-xs text-red-300 font-medium flex items-center gap-2">Analysis Failed</span>
                                    <button onClick={() => onRetryAnalysis(image.id)} className="px-2 py-1 bg-red-500/20 text-red-200 text-[10px] uppercase font-bold rounded">Retry</button>
                                </div>
                            )}
                        </div>

                        {/* Keywords */}
                        {image.keywords && image.keywords.length > 0 && (
                            <div
                                ref={keywordsScrollRef}
                                onWheel={handleKeywordsWheel}
                                onMouseEnter={() => setIsHoveringKeywords(true)}
                                onMouseLeave={() => setIsHoveringKeywords(false)}
                                className="flex flex-nowrap overflow-x-auto scrollbar-none gap-1.5 py-1"
                            >
                                {image.keywords.filter(k => k.startsWith('rating:')).map((kw, i) => {
                                    const rating = kw.replace('rating:', '');
                                    let colorClass = 'bg-gray-500/20 text-gray-200 border-gray-500/30';
                                    if (rating === 'PG') colorClass = 'bg-green-500/20 text-green-200 border-green-500/30';
                                    if (rating === 'PG-13') colorClass = 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30';
                                    if (rating === 'R') colorClass = 'bg-orange-500/20 text-orange-200 border-orange-500/30';
                                    if (rating === 'X') colorClass = 'bg-red-500/20 text-red-200 border-red-500/30';
                                    if (rating === 'XXX') colorClass = 'bg-red-900/40 text-red-300 border-red-700/50';

                                    return (
                                        <div key={`rating-${i}`} className={`px-2.5 py-1 text-xs font-bold border rounded-full whitespace-nowrap ${colorClass}`}>
                                            {rating}
                                        </div>
                                    );
                                })}

                                {image.keywords.filter(k => k.startsWith('score:')).map((kw, i) => {
                                    const parts = kw.split(':');
                                    if (parts.length === 3) {
                                        const category = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
                                        const percent = Math.round(parseFloat(parts[2]) * 100);
                                        const isSafety = ['Explicit', 'Sensitive', 'Questionable'].includes(category);
                                        const colorClass = isSafety ? 'text-pink-300 bg-pink-500/10 border-pink-500/20' : 'text-blue-300 bg-blue-500/10 border-blue-500/20';

                                        return (
                                            <div key={`score-${i}`} className={`px-2.5 py-1 text-[10px] font-mono border rounded-full whitespace-nowrap ${colorClass}`}>
                                                {category}: {percent}%
                                            </div>
                                        );
                                    }
                                    return null;
                                })}

                                {image.resourceUsage?.modelName && (
                                    <div key="res-model" className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-purple-500/20 text-purple-200 border border-purple-500/30 rounded-full whitespace-nowrap">
                                        <span className="text-[10px] uppercase opacity-60 tracking-wider">Model:</span>
                                        {image.resourceUsage.modelName}
                                    </div>
                                )}
                                {image.resourceUsage?.loraNames && image.resourceUsage.loraNames.map((lora, i) => (
                                    <div key={`res-lora-${i}`} className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-teal-500/20 text-teal-200 border border-teal-500/30 rounded-full whitespace-nowrap">
                                        <span className="text-[10px] uppercase opacity-60 tracking-wider">LoRA:</span>
                                        {lora}
                                    </div>
                                ))}

                                {image.keywords
                                    .filter(k => !k.startsWith('rating:') && !k.startsWith('score:'))
                                    .map((kw, i) => (
                                        <button key={i} onClick={() => onKeywordClick(kw)} className="px-2.5 py-1 text-xs bg-white/5 border border-white/5 rounded-full text-white/70 whitespace-nowrap hover:bg-white/10 hover:text-white transition-colors">#{kw}</button>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Column 3: Actions */}
                    <div className="hidden lg:flex flex-col items-end gap-3 border-l border-white/10 pl-6 h-full">
                        <div className="w-full">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3 text-right">Actions</h3>
                            <div className="flex flex-col gap-2 justify-end w-full">
                                <ActionButtons
                                    image={image}
                                    onRecreate={onRecreate}
                                    onGenerate={onGenerate}
                                    onAnimate={onAnimate}
                                    onEnhance={onEnhance}
                                    onRegenerateCaption={onRegenerateCaption ? () => onRegenerateCaption(image.id) : undefined}
                                    onSmartCrop={onSmartCrop}
                                    isSmartCropping={isSmartCropping}
                                    isSmartFilled={isSmartFilled}
                                    isPreparingAnimation={isPreparingAnimation}
                                    settings={settings}
                                    currentUser={currentUser}
                                    isFloating={false}
                                />
                                <div className="h-px w-full bg-white/10 my-2"></div>
                                <button onClick={handleDownload} disabled={image.isVideo && !image.videoUrl} className="p-3 text-white/70 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center group">
                                    <DownloadIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Mobile Footer */}
            <div className={`lg:hidden p-3 border-t border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0 ${isVisible ? 'block' : 'hidden'}`}>
                <ActionButtons
                    image={image}
                    onRecreate={onRecreate}
                    onGenerate={onGenerate}
                    onAnimate={onAnimate}
                    onEnhance={onEnhance}
                    onRegenerateCaption={onRegenerateCaption ? () => onRegenerateCaption(image.id) : undefined}
                    onSmartCrop={onSmartCrop}
                    isSmartCropping={isSmartCropping}
                    isSmartFilled={isSmartFilled}
                    isPreparingAnimation={isPreparingAnimation}
                    settings={settings}
                    currentUser={currentUser}
                    isFloating={false}
                />
                <div className="w-px h-8 bg-white/10"></div>
                <button onClick={handleDownload} className="p-3 text-white bg-white/10 rounded-xl"><DownloadIcon className="w-5 h-5" /></button>
            </div>
        </div>
    );
}
