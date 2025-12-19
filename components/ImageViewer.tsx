
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ImageInfo, AdminSettings, User, AspectRatio } from '../types';
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon, CopyIcon, SparklesIcon, VideoCameraIcon, DownloadIcon, WandIcon, WarningIcon, RefreshIcon, CropIcon, PlayIcon, StopIcon, ArrowLeftRightIcon, UpscaleIcon } from './icons';
import Spinner from './Spinner';
import { isAnyProviderConfiguredFor, generateKeywordsForPrompt, enhancePromptWithKeywords } from '../services/aiService';
import { logger } from '../services/loggingService';
import { getClosestSupportedAspectRatio, reverseAspectRatio } from '../utils/fileUtils';
import { PromptModalConfig } from './PromptSubmissionModal';
import KeywordSelectionModal from './KeywordSelectionModal';

interface ImageViewerProps {
  initialImage: ImageInfo;
  contextImages: ImageInfo[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  settings: AdminSettings | null;
  onKeywordClick: (keyword: string) => void;
  onSaveGeneratedImage: (base64Image: string, isPublic: boolean, prompt: string) => void;
  onSaveEnhancedImage: (base64Image: string, isPublic: boolean, prompt: string) => void;
  onStartAnimation: (image: ImageInfo, prompt: string, aspectRatio: AspectRatio) => void;
  onTogglePublicStatus: (imageId: string) => void;
  currentUser: User | null;
  promptHistory: string[];
  setPromptModalConfig: (config: PromptModalConfig | null) => void;
  // FIX: Changed prop name from 'type' to 'status' to match the Notification type definition.
  addNotification: (notification: { status: 'success' | 'error'; message: string; }) => void;
  onRetryAnalysis?: (imageId: string) => void;
  onRegenerateCaption?: (imageId: string) => void;
  onSmartCrop: (image: ImageInfo) => void;
  processingSmartCropIds?: Set<string>;
}

interface ActionButtonsProps {
  image: ImageInfo;
  onRecreate: (aspectRatio: AspectRatio, promptOverride?: string) => void;
  onAnimate: (aspectRatio: AspectRatio) => void; // Animation usually needs dedicated prompt or uses active
  onEnhance: () => void;
  onRegenerateCaption?: () => void;
  onSmartCrop: () => void;
  isSmartCropping: boolean;
  isSmartFilled: boolean;
  isPreparingAnimation: boolean;
  settings: AdminSettings | null;
  currentUser: User | null;
  isFloating: boolean;
  onGenerate: (aspectRatio: AspectRatio) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ image, onRecreate, onGenerate, onAnimate, onEnhance, onRegenerateCaption, onSmartCrop, isSmartCropping, isSmartFilled, isPreparingAnimation, settings, currentUser, isFloating }) => {
  const supportedAR = image.aspectRatio ? getClosestSupportedAspectRatio(image.aspectRatio) : '1:1';
  const reversedAR = reverseAspectRatio(supportedAR) as AspectRatio;

  const canGenerate = isAnyProviderConfiguredFor(settings, 'generation');
  const canAnimate = isAnyProviderConfiguredFor(settings, 'animation');
  const canEnhance = isAnyProviderConfiguredFor(settings, 'editing');
  const canAnalyze = isAnyProviderConfiguredFor(settings, 'vision');

  const getSmartCropTooltip = () => {
    if (isSmartCropping) return "Calculating best crop...";
    if (isSmartFilled) return "Reset View";
    return "Smart Fit to Screen";
  }

  const getGenerationTooltip = (ar: string) => {
    if (!currentUser) return "Sign in to generate images with AI.";
    if (!canGenerate) return `No provider is configured for image generation. Please check settings.`;
    return `Remix (Image to Image) ${ar}`;
  }

  const getTxt2ImgTooltip = () => {
    if (!currentUser) return "Sign in to generate images with AI.";
    if (!canGenerate) return "No provider configured for generation.";
    return "Generate (Text to Image)";
  }

  const getAnimationTooltip = () => {
    if (isPreparingAnimation) return "Preparing animation prompt...";
    if (!currentUser) return "Sign in to animate images with AI.";
    if (!canAnimate) return `No provider is configured for video animation. Please check settings.`;
    if (image.isVideo && !image.videoUrl) return "Cannot animate an offline video.";
    return `Animate with AI`;
  }

  const getEnhanceTooltip = () => {
    if (!currentUser) return "Sign in to upscale images with AI.";
    if (!canEnhance) return `No provider is configured for image editing. Please check settings.`;
    if (image.isVideo && !image.videoUrl) return "Cannot upscale an offline video.";
    return `Upscale`;
  }

  const getRegenerateTooltip = () => {
    if (!currentUser) return "Sign in to regenerate caption.";
    if (!canAnalyze) return "No provider configured for vision analysis.";
    return "Regenerate Caption";
  }

  const isOfflineVideo = image.isVideo && !image.videoUrl;

  /* 
    Responsive Button Styling:
    - Mobile (Default): Large, colorful, rounded-xl (Matches floating style for visibility/touch)
    - Desktop (lg): Compact, subtle, rounded-md (Matches minimal style) IF NOT floating.
    - Floating: Always large/colorful.
  */
  const buttonClass = isFloating
    ? "p-3 text-white rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    : "p-3 text-white rounded-xl shadow-sm lg:shadow-none lg:text-gray-300 lg:hover:text-white lg:p-1.5 lg:rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  const iconClass = isFloating ? "w-6 h-6" : "w-5 h-5 lg:w-4 lg:h-4";

  return (
    <div className={isFloating
      ? "absolute bottom-6 right-6 z-20 flex flex-col gap-3 animate-fade-in-up"
      : "flex flex-wrap items-center justify-center gap-2 lg:space-x-2 lg:gap-0 lg:flex-nowrap"
    }>
      <div title={getSmartCropTooltip()}>
        <button
          onClick={onSmartCrop}
          className={`${buttonClass} ${isSmartFilled ? 'bg-indigo-500 text-white' : 'bg-gray-600/80 hover:bg-gray-600'}`}
          disabled={isSmartCropping}
        >
          {isSmartCropping ? <Spinner className={iconClass} /> : <CropIcon className={iconClass} />}
        </button>
      </div>
      <div title={getEnhanceTooltip()}>
        <button
          onClick={() => {
            logger.track('User Action: Upscale', { imageId: image.id });
            onEnhance();
          }}
          className={`${buttonClass} bg-purple-600/80 hover:bg-purple-600`}
          disabled={!canEnhance || isPreparingAnimation || !currentUser || isOfflineVideo}
        >
          <UpscaleIcon className={iconClass} />
        </button>
      </div>
      {onRegenerateCaption && (
        <div title={getRegenerateTooltip()}>
          <button
            onClick={onRegenerateCaption}
            className={`${buttonClass} bg-blue-600/80 hover:bg-blue-600`}
            disabled={!canAnalyze || isPreparingAnimation || !currentUser}
          >
            <RefreshIcon className={iconClass} />
          </button>
        </div>
      )}
      <div title={getAnimationTooltip()}>
        <button
          onClick={() => {
            logger.track('User Action: Animate', { imageId: image.id, aspectRatio: supportedAR });
            onAnimate(supportedAR);
          }}
          className={`${buttonClass} bg-green-600/80 hover:bg-green-600 flex items-center justify-center`}
          disabled={!canAnimate || isPreparingAnimation || !currentUser || isOfflineVideo}
        >
          {isPreparingAnimation ? <Spinner className={iconClass} /> : <VideoCameraIcon className={iconClass} />}
        </button>
      </div>
      <div title={getTxt2ImgTooltip()}>
        <button
          onClick={() => onGenerate(supportedAR)}
          className={`${buttonClass} bg-pink-600/80 hover:bg-pink-600`}
          disabled={!canGenerate || isPreparingAnimation || !currentUser}
        >
          <SparklesIcon className={iconClass} />
        </button>
      </div>
      <div title={getGenerationTooltip(supportedAR)}>
        <button
          onClick={() => onRecreate(supportedAR)}
          className={`${buttonClass} bg-indigo-600/80 hover:bg-indigo-600`}
          disabled={!canGenerate || isPreparingAnimation || !currentUser}
        >
          <ArrowLeftRightIcon className={iconClass} />
        </button>
      </div>
    </div>
  )
}


interface MetadataPanelProps {
  image: ImageInfo;
  onRecreate: (aspectRatio: AspectRatio) => void;
  onGenerate: (aspectRatio: AspectRatio) => void;
  isPreparingAnimation: boolean;
  onAnimate: (aspectRatio: AspectRatio) => void;
  onEnhance: () => void;
  onKeywordClick: (keyword: string) => void;
  onTogglePublicStatus: (imageId: string) => void;
  onCopyPrompt: () => void;
  isCopied: boolean;
  settings: AdminSettings | null;
  currentUser: User | null;
  isVisible: boolean;
  onRetryAnalysis?: (imageId: string) => void;

  onRegenerateCaption?: (imageId: string) => void;
  onSmartCrop: () => void;
  isSmartCropping: boolean;
  isSmartFilled: boolean;
  // Slideshow props
  isSlideshowActive: boolean;
  onToggleSlideshow: () => void;
  slideshowDelay: number;
  onSlideshowDelayChange: (delay: number) => void;
  hasMultipleImages: boolean;
  activeContext: 'caption' | 'metadata';
  setActiveContext: (context: 'caption' | 'metadata') => void;
}

const MetadataPanel: React.FC<MetadataPanelProps> = ({
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

  // Refactored Auto-scroll Logic
  // "Scroll once at 50% human readable speed and then scroll back to the top and stop."
  useEffect(() => {
    const el = promptScrollRef.current;
    if (!el || !activeText || isHoveringPrompt) return;

    let scrollInterval: NodeJS.Timeout;
    let returnTimeout: NodeJS.Timeout;

    // Initial delay before starting
    const startTimeout = setTimeout(() => {
      let state: 'scroll' | 'wait' | 'return' | 'stop' = 'scroll';

      scrollInterval = setInterval(() => {
        if (!el || isHoveringPrompt) return;

        if (state === 'scroll') {
          // Scroll Down
          // previous speed was 50ms. "50% human readable speed" -> slower. 
          // 100ms interval = 50% speed of 50ms interval (assuming visual steps are same).
          if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
            state = 'wait';
            // Pause at bottom
            returnTimeout = setTimeout(() => {
              state = 'return';
            }, 2000);
          } else {
            el.scrollTop += 1;
          }
        } else if (state === 'return') {
          // Scroll Back to Top
          el.scrollTo({ top: 0, behavior: 'smooth' });
          state = 'stop';
          clearInterval(scrollInterval); // Stop
        }
      }, 100); // 100ms = Slower pace
    }, 2000);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(scrollInterval);
      clearTimeout(returnTimeout);
    };
  }, [activeText, isHoveringPrompt, isVisible, activeContext]); // Re-run when text changes

  // Auto-scroll keywords (Existing logic preserved)
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
      scrollInterval = setInterval(scroll, 50);
      return () => clearInterval(scrollInterval);
    }, 2000);
    return () => clearTimeout(startTimeout);
  }, [image?.keywords, isHoveringKeywords, isVisible]);

  const handleKeywordsWheel = (e: React.WheelEvent) => {
    if (keywordsScrollRef.current && e.deltaY !== 0) {
      // e.preventDefault(); // Removed to fix passive listener error
      keywordsScrollRef.current.scrollLeft += e.deltaY;
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
                  {/* Toggle UI preserved but condensed */}
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
                  {/* On/Off Slider Toggle */}
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

          {/* Column 2: Content (Prompt & Keywords) - UPDATED */}
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
                      Metadata
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
                  {activeContext === 'caption' ? 'No AI description available.' : 'No original prompt metadata found.'}
                </div>
              )}

              {/* Retry only for analysis failures when viewing caption */}
              {activeContext === 'caption' && image.analysisFailed && onRetryAnalysis && (
                <div className="mt-3 flex items-center justify-between p-2 pl-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-xs text-red-300 font-medium flex items-center gap-2">Analysis Failed</span>
                  <button onClick={() => onRetryAnalysis(image.id)} className="px-2 py-1 bg-red-500/20 text-red-200 text-[10px] uppercase font-bold rounded">Retry</button>
                </div>
              )}
            </div>

            {/* Keywords & Ratings */}
            {image.keywords && image.keywords.length > 0 && (
              <div
                ref={keywordsScrollRef}
                onWheel={handleKeywordsWheel}
                onMouseEnter={() => setIsHoveringKeywords(true)}
                onMouseLeave={() => setIsHoveringKeywords(false)}
                className="flex flex-nowrap overflow-x-auto scrollbar-none gap-1.5 py-1"
              >
                {/* Render Ratings First */}
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

                {/* Render Score Tags (Debug/Safety Info) */}
                {image.keywords.filter(k => k.startsWith('score:')).map((kw, i) => {
                  // Format: score:category:0.xx
                  const parts = kw.split(':');
                  if (parts.length === 3) {
                    const category = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
                    const percent = Math.round(parseFloat(parts[2]) * 100);
                    // Only show significant scores or explicit/sensitive ones to avoid clutter?
                    // User asked to "Show the tags", so let's show them all or at least the relevant ones for safety.
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

                {/* Render Detected Resources (Resource Detective) */}
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

                {/* Render Normal Keywords (excluding score tags and ratings) */}
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
};


const ImageViewer: React.FC<ImageViewerProps> = ({
  initialImage,
  contextImages,
  isLoading,
  error,
  onClose,
  settings,
  onKeywordClick,
  onSaveGeneratedImage,
  onSaveEnhancedImage,
  onStartAnimation,
  onTogglePublicStatus,
  currentUser,
  promptHistory,
  setPromptModalConfig,
  addNotification,
  onRetryAnalysis,

  onRegenerateCaption,
  onSmartCrop,
  processingSmartCropIds
}) => {
  // Use contextImages for navigation if available, otherwise fallback to just the initial image
  const navigationImages = useMemo(() => {
    return contextImages && contextImages.length > 0 ? contextImages : [initialImage];
  }, [contextImages, initialImage]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = navigationImages.findIndex(img => img.id === initialImage.id);
    return idx >= 0 ? idx : 0;
  });

  const [isSmartFilled, setIsSmartFilled] = useState(false);

  const [viewMode, setViewMode] = useState<'details' | 'carousel' | 'fullscreen'>('details');

  const isDetailsVisible = viewMode === 'details';
  const isCarouselVisible = viewMode === 'carousel';
  const isFullscreen = viewMode === 'fullscreen';
  const slideshowTimerRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current && currentIndex >= 0) {
      const container = thumbnailContainerRef.current;
      const activeThumb = container.children[currentIndex] as HTMLElement;

      if (activeThumb) {
        const containerLeft = container.getBoundingClientRect().left;
        const activeLeft = activeThumb.getBoundingClientRect().left;
        const scrollOffset = activeLeft - containerLeft - (container.clientWidth / 2) + (activeThumb.clientWidth / 2);

        container.scrollBy({ left: scrollOffset, behavior: 'smooth' });
      }
    }
  }, [currentIndex, isDetailsVisible]); // Re-run when index changes or viewer visibility toggles

  const handleThumbnailWheel = useCallback((e: React.WheelEvent) => {
    if (thumbnailContainerRef.current) {
      e.stopPropagation(); // Prevent zooming the main image or other interactions
      // Translate vertical scroll (wheel) to horizontal scroll
      thumbnailContainerRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  const [isCopied, setIsCopied] = useState(false);

  const [isSlideshowActive, setIsSlideshowActive] = useState(true);
  const [slideshowDelay, setSlideshowDelay] = useState(5000);
  const isFirstSlideshowActivationRef = useRef(true); // Track first activation for initial delay


  // State for the new multi-step animation flow
  type AnimationState = 'idle' | 'generatingKeywords' | 'selectingKeywords' | 'enhancingPrompt';
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [animationData, setAnimationData] = useState<{
    originalPrompt: string;
    generatedKeywords: string[];
    aspectRatio: AspectRatio;
  } | null>(null);

  const isPreparingAnimation = animationState === 'generatingKeywords' || animationState === 'enhancingPrompt';

  const currentImage = navigationImages[currentIndex];
  const isVideo = currentImage.isVideo;
  const isOfflineVideo = currentImage.isVideo && !currentImage.videoUrl;

  const handleCopyPrompt = useCallback(() => {
    if (currentImage?.recreationPrompt) {
      navigator.clipboard.writeText(currentImage.recreationPrompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [currentImage]);

  // Ensure smart crop is calculated if we navigate to an image while Smart Fit is active
  useEffect(() => {
    if (isSmartFilled && !currentImage.smartCrop &&
      !processingSmartCropIds?.has(currentImage.id) &&
      !currentImage.isVideo) {
      onSmartCrop(currentImage);
    }
  }, [currentIndex, isSmartFilled, currentImage?.smartCrop, currentImage?.id]);



  const handleSmartCropClick = () => {
    // Just toggle. If turning ON and crop is missing, the useEffect above will trigger calculation.
    // Or we can trigger it here immediately for better feedback.
    if (!isSmartFilled && !currentImage.smartCrop) {
      onSmartCrop(currentImage);
    }
    setIsSmartFilled(prev => !prev);
  };

  // Watch for smart crop arrival affecting view state?
  useEffect(() => {
    if (currentImage?.smartCrop && processingSmartCropIds?.has(currentImage.id)) {
      // If it was processing and now has crop, maybe we want to ensure fill is on?
      // But processingSmartCropIds might update slower.
    }
  }, [currentImage?.smartCrop]);

  const handleEnhance = () => {
    if (!currentUser) return;
    setPromptModalConfig({
      taskType: 'enhance',
      initialPrompt: "Upscale this image to 4K resolution, restoring and enhancing details and quality. Remove any watermarks or text.",
      image: currentImage
    });
  };

  const handleAnimateClick = async (aspectRatio: AspectRatio) => {
    if (!currentUser || !currentImage || !currentImage.recreationPrompt || !settings) return;

    setAnimationState('generatingKeywords');
    try {
      const keywords = await generateKeywordsForPrompt(currentImage.recreationPrompt, settings);
      setAnimationData({
        originalPrompt: currentImage.recreationPrompt,
        generatedKeywords: keywords,
        aspectRatio: aspectRatio
      });
      setAnimationState('selectingKeywords');
    } catch (e: any) {
      // FIX: Changed 'type' to 'status' to align with the updated addNotification prop type.
      addNotification({ status: 'error', message: `Failed to generate keywords: ${e.message}` });
      setAnimationState('idle');
    }
  };

  const handleKeywordSelectionSubmit = async (selectedKeywords: string[]) => {
    if (!animationData || !settings) return;
    setAnimationState('enhancingPrompt');
    try {
      const finalPrompt = await enhancePromptWithKeywords(animationData.originalPrompt, selectedKeywords, settings);
      setPromptModalConfig({
        taskType: 'video',
        initialPrompt: finalPrompt,
        aspectRatio: animationData.aspectRatio,
        image: currentImage,
      });
    } catch (e: any) {
      // FIX: Changed 'type' to 'status' to align with the updated addNotification prop type.
      addNotification({ status: 'error', message: `Failed to enhance prompt: ${e.message}` });
    } finally {
      setAnimationState('idle');
      setAnimationData(null);
    }
  };

  /*
   Animation Flow:
   1. onStartAnimation calls this handler with current image & prompt
   2. We check settings and availability
   3. Trigger onStartAnimation prop which opens the modal/process
*/
  const handleStartAnimation = () => {
    // In current logic, ActionButtons calls onAnimate which is passed from props.
    // But ImageViewer actually defines onStartAnimation in props.
    // Let's find where onAnimate is passed to ActionButtons.
    // It's passed as `() => onStartAnimation(...)`.
    // We should arguably track it there or here.
    // Since ActionButtons is a subcomponent, let's track here if we can wrap it,
    // or track in the parent (App.tsx) which actually implements onStartAnimation.
    // However, App.tsx is huge. Let's do it in the wrapper prop in ImageViewer rendering.
  };

  useEffect(() => {
    // If the navigation list changes significantly, try to keep the current image focused
    // or reset if not found.
    // For now, we rely on the initial state unless contextImages changes drastically.
    // If contextImages changes (e.g. filter update), we should try to find the current image ID.
    const idx = navigationImages.findIndex(img => img.id === currentImage?.id);
    if (idx !== -1 && idx !== currentIndex) {
      setCurrentIndex(idx);
    } else if (idx === -1) {
      setCurrentIndex(0);
    }
  }, [navigationImages]);

  // Context Toggle State (Lifted from MetadataPanel)
  const [activeContext, setActiveContext] = useState<'caption' | 'metadata'>('caption');

  // Auto-switch to metadata if caption missing (on load)
  useEffect(() => {
    if (!currentImage.recreationPrompt && currentImage.originalMetadataPrompt) {
      setActiveContext('metadata');
    } else if (currentImage.recreationPrompt) {
      setActiveContext('caption'); // Default back to caption when image changes
    }
  }, [currentImage.id, currentImage.recreationPrompt, currentImage.originalMetadataPrompt]);


  // Helper to extract prompt based on context
  const getPromptFromContext = (override?: string) => {
    let promptToUse = override;
    if (!override) {
      promptToUse = activeContext === 'caption' ? currentImage.recreationPrompt : currentImage.originalMetadataPrompt;
    }
    if (!promptToUse) return null;

    let finalPrompt = promptToUse;
    let negativePromptStr = "";

    // Pattern 1: Internal pipe syntax
    if (promptToUse.includes('| negative:')) {
      const parts = promptToUse.split('| negative:');
      finalPrompt = parts[0].trim();
      negativePromptStr = parts[1].trim();
    }
    // Pattern 2/3: Newline + Negative label
    else {
      const negMatch = promptToUse.match(/\n(Negative prompt|Negative):/i);
      if (negMatch && negMatch.index !== undefined) {
        finalPrompt = promptToUse.substring(0, negMatch.index).trim();
        negativePromptStr = promptToUse.substring(negMatch.index + negMatch[0].length).trim();
      }
    }

    return negativePromptStr ? `${finalPrompt} | negative: ${negativePromptStr}` : finalPrompt;
  };

  const handleRecreate = (aspectRatio: AspectRatio, promptOverride?: string) => {
    if (!currentUser) return;
    const combinedPrompt = getPromptFromContext(promptOverride);
    if (!combinedPrompt) return;

    logger.track('User Action: Recreate', { imageId: currentImage.id, aspectRatio });

    setPromptModalConfig({
      taskType: 'image',
      initialPrompt: combinedPrompt,
      aspectRatio,
      image: currentImage
    });
  };

  const handleGenerate = (aspectRatio: AspectRatio) => {
    if (!currentUser) return;
    const combinedPrompt = getPromptFromContext();
    if (!combinedPrompt) return;

    logger.track('User Action: Generate', { imageId: currentImage.id, aspectRatio });

    setPromptModalConfig({
      taskType: 'image',
      initialPrompt: combinedPrompt,
      aspectRatio,
      // image is UNDEFINED to trigger Txt2Img mode
    });
  };

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % navigationImages.length);
  }, [navigationImages.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + navigationImages.length) % navigationImages.length);
  }, [navigationImages.length]);

  const startSlideshowLoop = useCallback(() => {
    if (navigationImages.length <= 1 || isLoading || error || isVideo || !isSlideshowActive) return;
    nextImage();
    // Use fixed delay from state instead of random
    slideshowTimerRef.current = window.setTimeout(startSlideshowLoop, slideshowDelay);
  }, [nextImage, navigationImages.length, isLoading, error, isVideo, isSlideshowActive, slideshowDelay]);

  const resetInactivityTimer = useCallback(() => {
    if (slideshowTimerRef.current) clearTimeout(slideshowTimerRef.current);
    if (isLoading || isVideo || !isSlideshowActive) {
      // Reset first activation flag when slideshow is turned off
      isFirstSlideshowActivationRef.current = true;
      return;
    }
    // Add 2 second initial delay ONLY on first activation
    const initialDelay = isFirstSlideshowActivationRef.current ? 2000 : 0;
    slideshowTimerRef.current = window.setTimeout(startSlideshowLoop, slideshowDelay + initialDelay);
    // Mark that we've had the first activation
    isFirstSlideshowActivationRef.current = false;
  }, [startSlideshowLoop, isLoading, isVideo, isSlideshowActive, slideshowDelay]);

  useEffect(() => {
    resetInactivityTimer();

    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('touchstart', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);

    return () => {
      if (slideshowTimerRef.current) clearTimeout(slideshowTimerRef.current);
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('touchstart', resetInactivityTimer);
      window.removeEventListener('keydown', resetInactivityTimer);
    };
  }, [resetInactivityTimer]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current && isCarouselVisible) {
      const activeBtn = thumbnailContainerRef.current.children[currentIndex] as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex, isDetailsVisible]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (!isVideo) {
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextImage, prevImage, onClose, isVideo]);

  const handleContainerClick = () => {
    if (isDraggingRef.current) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    if (timeSinceLastTap < 300) {
      // Double tap or fast tap logic if needed, but manual says "one more click", implying sequential single clicks.
      // Current manual instruction: "one more click on the image hides the carousel to be full screen... A single click will bring up properties"
      // Let's implement sequential cycle on single click essentially.
      // But existing code handled double tap logic? "if time < 300 setIsDetailsVisible(true)" suggests forcing show on double tap.
      // Let's stick to simple toggle for now as user asked for "click".

      // Actually, the user says "Navigate to carousel -> Navigate to fullscreen -> Navigate to details".
      // Let's just use single click logic effectively. The debounce might interfere if we rely on it for "double tap".
      // Let's treat standard click as the trigger.
    }

    // Cycle modes
    setViewMode(prev => {
      if (prev === 'details') return 'carousel';
      if (prev === 'carousel') return 'fullscreen';
      return 'details';
    });

    lastTapTimeRef.current = now;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isVideo) return;
    isDraggingRef.current = false;
    touchStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isVideo || !touchStartRef.current) return;
    const dx = Math.abs(e.clientX - touchStartRef.current.x);
    if (dx > 10) {
      isDraggingRef.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isVideo) {
      handleContainerClick();
      return;
    }

    if (!touchStartRef.current) {
      return;
    }

    const touchEnd = { x: e.clientX };
    const deltaX = touchEnd.x - touchStartRef.current.x;
    const swipeThreshold = 50;

    const isSwipe = isDraggingRef.current && Math.abs(deltaX) > swipeThreshold;

    if (isSwipe) {
      if (deltaX > 0) {
        prevImage();
      } else {
        nextImage();
      }
    } else {
      isDraggingRef.current = false;
      handleContainerClick();
    }

    touchStartRef.current = null;
    isDraggingRef.current = false;
  };

  const getFriendlyErrorMessage = (error: any): string => {
    const message = (typeof error === 'object' && error !== null && 'message' in error) ? String(error.message) : 'An unknown error occurred.';
    return message;
  };


  return (
    <>
      <div className={`fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm ${isFullscreen ? 'z-[60]' : 'z-50'}`} onClick={onClose}>
        <div
          className={`relative w-full h-full flex flex-col items-center justify-center ${isSmartFilled ? '' : 'p-4'}`}
          style={{ touchAction: 'none' }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >

          {!isFullscreen && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-50 text-white/70 hover:text-white transition-colors"
            >
              <CloseIcon className="w-8 h-8" />
            </button>
          )}

          <div className={`relative flex items-center justify-center w-full h-full ${isSmartFilled ? '' : 'max-h-[95vh] max-w-[95vw]'}`}>
            {isVideo && !isOfflineVideo ? (
              <video
                key={`${currentImage.id}-video`}
                src={currentImage.videoUrl}
                controls
                autoPlay
                loop
                className="animate-fade-in block max-h-full max-w-full object-contain rounded-lg shadow-2xl"
                onClick={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
              />
            ) : (
              currentImage && (
                <img
                  key={currentImage.id}
                  src={currentImage.dataUrl}
                  alt={currentImage.fileName}
                  className={`animate-fade-in block shadow-2xl transition-all duration-300 ${isSmartFilled && currentImage.smartCrop
                    ? 'w-full h-full object-cover rounded-none'
                    : `rounded-lg object-contain ${(currentImage.height || 0) > (currentImage.width || 0)
                      ? 'h-full w-auto max-h-full'
                      : 'w-full h-auto max-w-full'}`
                    }`}
                  style={isSmartFilled && currentImage.smartCrop ? {
                    objectPosition: `${currentImage.smartCrop.x}% ${currentImage.smartCrop.y}%`
                  } : undefined}
                  draggable="false"
                />
              )
            )}

            {isOfflineVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg pointer-events-none">
                <div className="text-center text-white p-4 bg-gray-800/80 rounded-lg">
                  <h3 className="text-lg font-semibold">Video Unavailable</h3>
                  <p className="mt-2 text-sm text-gray-300">Video data is not saved across sessions.</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg">
                <Spinner />
                <p className="mt-4 text-lg text-white">AI is finding similar images...</p>
              </div>
            )}

            {currentImage && (
              <MetadataPanel
                image={currentImage}
                onRecreate={handleRecreate}
                onGenerate={handleGenerate}
                isPreparingAnimation={isPreparingAnimation}
                onAnimate={handleAnimateClick}
                onEnhance={handleEnhance}
                onKeywordClick={onKeywordClick}
                onTogglePublicStatus={onTogglePublicStatus}
                onCopyPrompt={handleCopyPrompt}
                isCopied={isCopied}
                settings={settings}
                currentUser={currentUser}
                isVisible={isDetailsVisible}
                onRetryAnalysis={onRetryAnalysis}
                onRegenerateCaption={onRegenerateCaption}
                onSmartCrop={handleSmartCropClick}
                isSmartCropping={processingSmartCropIds?.has(currentImage.id) ?? false}
                isSmartFilled={isSmartFilled}
                isSlideshowActive={isSlideshowActive}
                onToggleSlideshow={() => setIsSlideshowActive(!isSlideshowActive)}
                slideshowDelay={slideshowDelay}
                onSlideshowDelayChange={setSlideshowDelay}
                hasMultipleImages={navigationImages.length > 1}
                activeContext={activeContext}
                setActiveContext={setActiveContext}
              />
            )}

            {error && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md p-3 bg-red-800/80 text-white rounded-lg text-center text-sm z-20">
                {error}
              </div>
            )}
          </div>

          {!isVideo && navigationImages.length > 1 && !isLoading && (
            <>
              {/* Thumbnail Navigation Strip */}
              {/* Thumbnail Navigation Strip - Only visible in Carousel mode */}
              {isCarouselVisible && (
                <div
                  className="absolute bottom-16 lg:bottom-6 left-0 w-full z-30 animate-fade-in-up mask-image-linear-to-r"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div
                    ref={thumbnailContainerRef}
                    onWheel={handleThumbnailWheel}
                    className="flex gap-2 overflow-x-auto scrollbar-none w-full px-4 transition-all duration-300"
                    style={{
                      scrollBehavior: 'smooth',
                      maxWidth: '100%',
                      '--thumb-hover-scale': currentUser?.thumbnailHoverScale ?? settings?.appearance?.thumbnailHoverScale ?? 1.2
                    } as React.CSSProperties}
                  >
                    {
                      navigationImages.map((img, index) => {
                        const baseSize = currentUser?.thumbnailSize ?? settings?.appearance?.thumbnailSize ?? 40;
                        // Enforce 3:5 aspect ratio
                        const aspectRatio = 3 / 5;

                        const activeHeight = Math.round(baseSize * 1.4);
                        const currentHeight = currentIndex === index ? activeHeight : baseSize;

                        // Calculate width maintaining aspect ratio
                        const currentWidth = Math.round(currentHeight * aspectRatio);

                        return (
                          <button
                            key={img.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentIndex(index);
                            }}
                            style={{ width: `${currentWidth}px`, height: `${currentHeight}px` }}
                            className={`thumbnail-btn relative flex-shrink-0 transition-all duration-300 ease-out focus:outline-none rounded-md overflow-hidden ${currentIndex === index
                              ? 'ring-2 ring-white opacity-100 scale-100'
                              : 'ring-0 opacity-50 hover:opacity-100'
                              }`}
                          >
                            <img
                              src={img.dataUrl}
                              alt={`Thumbnail ${index + 1}`}
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          </button>
                        );
                      })
                    }
                  </div>
                </div>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/60 text-white/70 hover:text-white transition-all z-20 backdrop-blur-sm"
              >
                <ChevronLeftIcon className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/60 text-white/70 hover:text-white transition-all z-20 backdrop-blur-sm"
              >
                <ChevronRightIcon className="h-8 w-8" />
              </button>
            </>
          )}
        </div>

        <KeywordSelectionModal
          isOpen={animationState === 'selectingKeywords'}
          keywords={animationData?.generatedKeywords || []}
          onClose={() => setAnimationState('idle')}
          onSubmit={handleKeywordSelectionSubmit}
        />

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-in-out;
          }
           @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.4s ease-out;
          }
          .thumbnail-btn:hover {
            transform: scale(var(--thumb-hover-scale));
            z-index: 10;
          }
      `}</style>
      </div >
    </>
  );
};

export default ImageViewer;
