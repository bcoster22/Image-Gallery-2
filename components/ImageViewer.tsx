
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ImageInfo, AdminSettings, User, AspectRatio } from '../types';
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon, CopyIcon, SparklesIcon, VideoCameraIcon, DownloadIcon, WandIcon, WarningIcon, RefreshIcon } from './icons';
import Spinner from './Spinner';
import { isAnyProviderConfiguredFor, generateKeywordsForPrompt, enhancePromptWithKeywords } from '../services/aiService';
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
}

interface ActionButtonsProps {
  image: ImageInfo;
  onRecreate: (aspectRatio: AspectRatio) => void;
  onAnimate: (aspectRatio: AspectRatio) => void;
  onEnhance: () => void;
  onRegenerateCaption?: () => void;
  isPreparingAnimation: boolean;
  settings: AdminSettings | null;
  currentUser: User | null;
  isFloating: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ image, onRecreate, onAnimate, onEnhance, onRegenerateCaption, isPreparingAnimation, settings, currentUser, isFloating }) => {
  const supportedAR = image.aspectRatio ? getClosestSupportedAspectRatio(image.aspectRatio) : '1:1';
  const reversedAR = reverseAspectRatio(supportedAR) as AspectRatio;

  const canGenerate = isAnyProviderConfiguredFor(settings, 'generation');
  const canAnimate = isAnyProviderConfiguredFor(settings, 'animation');
  const canEnhance = isAnyProviderConfiguredFor(settings, 'editing');
  const canAnalyze = isAnyProviderConfiguredFor(settings, 'vision');

  const getGenerationTooltip = (ar: string) => {
    if (!currentUser) return "Sign in to generate images with AI.";
    if (!canGenerate) return `No provider is configured for image generation. Please check settings.`;
    return `Recreate with AI (${ar})`;
  }

  const getAnimationTooltip = () => {
    if (isPreparingAnimation) return "Preparing animation prompt...";
    if (!currentUser) return "Sign in to animate images with AI.";
    if (!canAnimate) return `No provider is configured for video animation. Please check settings.`;
    if (image.isVideo && !image.videoUrl) return "Cannot animate an offline video.";
    return `Animate with AI`;
  }

  const getEnhanceTooltip = () => {
    if (!currentUser) return "Sign in to enhance images with AI.";
    if (!canEnhance) return `No provider is configured for image editing. Please check settings.`;
    if (image.isVideo && !image.videoUrl) return "Cannot enhance an offline video.";
    return `Enhance & Upscale`;
  }

  const getRegenerateTooltip = () => {
    if (!currentUser) return "Sign in to regenerate caption.";
    if (!canAnalyze) return "No provider configured for vision analysis.";
    return "Regenerate Caption";
  }

  const isOfflineVideo = image.isVideo && !image.videoUrl;

  const buttonClass = isFloating
    ? "p-3 text-white rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    : "p-1.5 text-gray-300 hover:text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const iconClass = isFloating ? "w-6 h-6" : "w-5 h-5";

  return (
    <div className={isFloating ? "absolute bottom-6 right-6 z-20 flex flex-col gap-3 animate-fade-in-up" : "flex items-center space-x-2"}>
      <div title={getEnhanceTooltip()}>
        <button
          onClick={onEnhance}
          className={`${buttonClass} bg-purple-600/80 hover:bg-purple-600`}
          disabled={!canEnhance || isPreparingAnimation || !currentUser || isOfflineVideo}
        >
          <WandIcon className={iconClass} />
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
          onClick={() => onAnimate(supportedAR)}
          className={`${buttonClass} bg-green-600/80 hover:bg-green-600 flex items-center justify-center`}
          disabled={!canAnimate || isPreparingAnimation || !currentUser || isOfflineVideo}
        >
          {isPreparingAnimation ? <Spinner className={iconClass} /> : <VideoCameraIcon className={iconClass} />}
        </button>
      </div>
      <div title={getGenerationTooltip(supportedAR)}>
        <button
          onClick={() => onRecreate(supportedAR)}
          className={`${buttonClass} bg-indigo-600/80 hover:bg-indigo-600`}
          disabled={!canGenerate || isPreparingAnimation || !currentUser}
        >
          <SparklesIcon className={iconClass} />
        </button>
      </div>
      {!isFloating && supportedAR !== '1:1' && (
        <div title={getGenerationTooltip(reversedAR)}>
          <button
            onClick={() => onRecreate(reversedAR)}
            className={`${buttonClass} bg-indigo-600/80 hover:bg-indigo-600`}
            disabled={!canGenerate || isPreparingAnimation || !currentUser}
          >
            <SparklesIcon className={`${iconClass} transform rotate-90`} />
          </button>
        </div>
      )}
    </div>
  )
}


interface MetadataPanelProps {
  image: ImageInfo;
  onRecreate: (aspectRatio: AspectRatio) => void;
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
  // Slideshow props
  isSlideshowActive: boolean;
  onToggleSlideshow: () => void;
  slideshowDelay: number;
  onSlideshowDelayChange: (delay: number) => void;
  hasMultipleImages: boolean;
}

const MetadataPanel: React.FC<MetadataPanelProps> = ({
  image, onRecreate, isPreparingAnimation, onAnimate, onEnhance, onKeywordClick,
  settings, currentUser, onTogglePublicStatus, onCopyPrompt, isCopied, isVisible,
  onRetryAnalysis, onRegenerateCaption,
  isSlideshowActive, onToggleSlideshow, slideshowDelay, onSlideshowDelayChange, hasMultipleImages
}) => {

  const handleDownload = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image.isVideo && image.videoUrl ? image.videoUrl : image.dataUrl;
    link.download = image.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isOwner = currentUser && image.ownerId === currentUser.id;

  return (
    <div
      className={`absolute bottom-4 left-4 right-4 z-10 p-4 bg-black/60 backdrop-blur-md rounded-lg text-white max-w-3xl mx-auto transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-start mb-3 gap-4">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            {image.width && image.height && image.aspectRatio && (
              <>
                <h3 className="text-xs font-semibold uppercase text-gray-400 mb-1">Image Details</h3>
                <div className="flex flex-wrap gap-2">
                  <p className="text-sm text-gray-300 bg-gray-900/50 py-1 px-2 rounded-md inline-block">
                    {image.width} &times; {image.height} <span className="text-gray-400">({image.aspectRatio})</span>
                  </p>
                  {image.smartCrop && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-300 bg-gray-900/50 py-1 px-2 rounded-md" title="Smart Crop Center">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span>{image.smartCrop.x.toFixed(0)}%, {image.smartCrop.y.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            {isOwner && (
              <>
                <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Sharing Status</h3>
                <label htmlFor="is-public-toggle" className="flex items-center cursor-pointer w-fit">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="is-public-toggle"
                      className="sr-only peer"
                      checked={!!image.isPublic}
                      onChange={() => onTogglePublicStatus(image.id)}
                    />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-gray-900/50 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-300">{image.isPublic ? 'Public' : 'Private'}</span>
                </label>
              </>
            )}
          </div>

          {hasMultipleImages && (
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Slideshow</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={onToggleSlideshow}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${isSlideshowActive ? 'bg-indigo-600' : 'bg-gray-600'}`}
                  title={isSlideshowActive ? "Pause Slideshow" : "Start Slideshow"}
                >
                  <span className={`${isSlideshowActive ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </button>

                {isSlideshowActive && (
                  <div className="flex items-center gap-2 bg-gray-900/50 px-2 py-1 rounded-md">
                    <span className="text-xs text-gray-300 w-8 text-right">{slideshowDelay / 1000}s</span>
                    <input
                      type="range"
                      min="2000"
                      max="20000"
                      step="1000"
                      value={slideshowDelay}
                      onChange={(e) => onSlideshowDelayChange(Number(e.target.value))}
                      className="w-20 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 items-end">
          <button
            onClick={handleDownload}
            disabled={image.isVideo && !image.videoUrl}
            className="p-2 text-gray-300 hover:text-white bg-gray-700/80 hover:bg-gray-700 rounded-md transition-colors flex items-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title={image.isVideo && !image.videoUrl ? "Download unavailable for offline video" : "Download"}
          >
            <DownloadIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {image.analysisFailed && onRetryAnalysis && (
        <div className="mb-3 bg-red-900/30 border border-red-800 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-200 text-sm">
            <WarningIcon className="w-4 h-4" />
            <span>AI Analysis Failed</span>
          </div>
          <button
            onClick={() => onRetryAnalysis(image.id)}
            className="px-3 py-1 text-xs font-medium bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {image.keywords && image.keywords.length > 0 && (
        <div className="mb-3">
          <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">AI Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {image.keywords.map((kw, i) => (
              <button
                key={i}
                onClick={() => onKeywordClick(kw)}
                className="px-3 py-1.5 text-base bg-gray-700/80 rounded-full hover:bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}
      {image.recreationPrompt && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className='flex items-center gap-2'>
              <h3 className="text-xs font-semibold uppercase text-gray-400">AI Actions</h3>
              <button
                onClick={onCopyPrompt}
                className="p-1.5 text-gray-300 hover:text-white bg-gray-600/80 hover:bg-gray-600 rounded-md transition-colors"
                title={isCopied ? "Copied!" : "Copy prompt"}
              >
                <CopyIcon className="w-5 h-5" />
              </button>
            </div>
            <ActionButtons {...{ image, onRecreate, onAnimate, onEnhance, onRegenerateCaption: onRegenerateCaption ? () => onRegenerateCaption(image.id) : undefined, isPreparingAnimation, settings, currentUser, isFloating: false }} />
          </div>
          <div className="relative">
            <p className="text-sm text-gray-200 bg-gray-900/50 p-3 rounded-md max-h-24 overflow-y-auto">
              {image.recreationPrompt}
            </p>
          </div>
        </div>
      )}
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
  onRegenerateCaption
}) => {
  // Use contextImages for navigation if available, otherwise fallback to just the initial image
  const navigationImages = useMemo(() => {
    return contextImages && contextImages.length > 0 ? contextImages : [initialImage];
  }, [contextImages, initialImage]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = navigationImages.findIndex(img => img.id === initialImage.id);
    return idx >= 0 ? idx : 0;
  });

  const [isDetailsVisible, setIsDetailsVisible] = useState(true);
  const slideshowTimerRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);
  const isDraggingRef = useRef(false);

  const [isCopied, setIsCopied] = useState(false);

  const [isSlideshowActive, setIsSlideshowActive] = useState(true);
  const [slideshowDelay, setSlideshowDelay] = useState(5000);

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

  const handleRecreate = (aspectRatio: AspectRatio) => {
    if (!currentImage.recreationPrompt || !currentUser) return;
    setPromptModalConfig({
      taskType: 'image',
      initialPrompt: currentImage.recreationPrompt,
      aspectRatio,
      image: currentImage
    });
  };

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
    if (isLoading || isVideo || !isSlideshowActive) return;
    slideshowTimerRef.current = window.setTimeout(startSlideshowLoop, slideshowDelay);
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
      if (!isDetailsVisible) setIsDetailsVisible(true);
    } else {
      setIsDetailsVisible(prev => !prev);
    }

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
        <div
          className="relative w-full h-full flex flex-col items-center justify-center p-4"
          style={{ touchAction: 'none' }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 text-white/70 hover:text-white transition-colors"
          >
            <CloseIcon className="w-8 h-8" />
          </button>

          <div className="relative flex items-center justify-center w-full h-full max-h-[95vh] max-w-[95vw]">
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
                  className={`animate-fade-in block rounded-lg shadow-2xl object-contain ${(currentImage.height || 0) > (currentImage.width || 0)
                    ? 'h-full w-auto max-h-full' // Portrait: prioritize height
                    : 'w-full h-auto max-w-full' // Landscape: prioritize width
                    }`}
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
                isSlideshowActive={isSlideshowActive}
                onToggleSlideshow={() => setIsSlideshowActive(!isSlideshowActive)}
                slideshowDelay={slideshowDelay}
                onSlideshowDelayChange={setSlideshowDelay}
                hasMultipleImages={navigationImages.length > 1}
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
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center space-x-2 z-20">
                {navigationImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${currentIndex === index ? 'bg-white' : 'bg-white/40 hover:bg-white/70'
                      }`}
                  ></button>
                ))}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/60 text-white transition-all z-20"
              >
                <ChevronLeftIcon className="h-7 w-7" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/60 text-white transition-all z-20"
              >
                <ChevronRightIcon className="h-7 w-7" />
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
      `}</style>
      </div>
    </>
  );
};

export default ImageViewer;
