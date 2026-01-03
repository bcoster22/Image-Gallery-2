import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AspectRatio } from '../types';
import { generateKeywordsForPrompt, enhancePromptWithKeywords } from '../services/aiService';
import { logger } from '../services/loggingService';
import { ZoomPanCanvas } from './viewer/ZoomPanCanvas';
import { useSlideshow } from '../hooks/useSlideshow';
import KeywordSelectionModal from './KeywordSelectionModal';

// Imported Types & Components
import { ImageViewerProps, AnimationState } from './ImageViewer/ImageViewer.types';
import { MetadataPanel } from './ImageViewer/MetadataPanel';
import { ThumbnailStrip } from './ImageViewer/ThumbnailStrip';

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
  processingSmartCropIds,
  analyzingIds
}) => {
  // Navigation State
  const navigationImages = useMemo(() => {
    return contextImages && contextImages.length > 0 ? contextImages : [initialImage];
  }, [contextImages, initialImage]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = navigationImages.findIndex(img => img.id === initialImage.id);
    return idx >= 0 ? idx : 0;
  });

  const currentImage = navigationImages[currentIndex];
  // Safety check: if current image is missing (e.g. deleted), fallback to first or null
  const safeImage = currentImage || navigationImages[0];
  const isVideo = safeImage?.isVideo;
  const isOfflineVideo = safeImage?.isVideo && !safeImage?.videoUrl;

  // View State
  const [isSmartFilled, setIsSmartFilled] = useState(false);
  const [viewMode, setViewMode] = useState<'details' | 'carousel' | 'fullscreen'>('details');
  const isDetailsVisible = viewMode === 'details';
  const isCarouselVisible = viewMode === 'carousel';
  const isFullscreen = viewMode === 'fullscreen';

  // Slideshow State
  const [isSlideshowActive, setIsSlideshowActive] = useState(true);
  const [slideshowDelay, setSlideshowDelay] = useState(5000);

  // Other UI State
  const [isCopied, setIsCopied] = useState(false);
  const [activeContext, setActiveContext] = useState<'caption' | 'metadata'>('caption');

  // Animation Flow State
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [animationData, setAnimationData] = useState<{
    originalPrompt: string;
    generatedKeywords: string[];
    aspectRatio: AspectRatio;
  } | null>(null);

  const isPreparingAnimation = animationState === 'generatingKeywords' || animationState === 'enhancingPrompt';

  // --- Effects ---

  // Reset index if images change dramatically
  useEffect(() => {
    if (!currentImage && navigationImages.length > 0) {
      setCurrentIndex(0);
    }
  }, [navigationImages, currentImage]);

  // Determine active context based on available data
  useEffect(() => {
    if (safeImage && !safeImage.recreationPrompt && safeImage.originalMetadataPrompt) {
      setActiveContext('metadata');
    } else if (safeImage?.recreationPrompt) {
      setActiveContext('caption');
    }
  }, [safeImage?.id, safeImage?.recreationPrompt, safeImage?.originalMetadataPrompt]);

  // Smart Crop Auto-trigger
  useEffect(() => {
    if (isSmartFilled && safeImage && !safeImage.smartCrop &&
      !processingSmartCropIds?.has(safeImage.id) &&
      !safeImage.isVideo) {
      onSmartCrop(safeImage);
    }
  }, [currentIndex, isSmartFilled, safeImage?.smartCrop, safeImage?.id]);

  // Proactive Analysis in Slideshow
  useEffect(() => {
    if (isSlideshowActive && safeImage && !safeImage.recreationPrompt &&
      !safeImage.analysisFailed && !safeImage.isVideo &&
      onRetryAnalysis && (!analyzingIds || !analyzingIds.has(safeImage.id))) {
      onRetryAnalysis(safeImage.id);
    }
  }, [isSlideshowActive, safeImage, analyzingIds, onRetryAnalysis]);

  // --- Handlers ---

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % navigationImages.length);
  }, [navigationImages.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + navigationImages.length) % navigationImages.length);
  }, [navigationImages.length]);

  // Slideshow Hook
  const { resetInactivityTimer } = useSlideshow(
    nextImage,
    isSlideshowActive,
    slideshowDelay,
    isLoading,
    !!isVideo,
    navigationImages.length
  );

  const handleContainerClick = () => {
    setViewMode(prev => {
      if (prev === 'details') return 'carousel';
      if (prev === 'carousel') return 'fullscreen';
      return 'details';
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (!isVideo) {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextImage, prevImage, onClose, isVideo]);

  const handleCopyPrompt = useCallback(() => {
    if (safeImage?.recreationPrompt) {
      navigator.clipboard.writeText(safeImage.recreationPrompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [safeImage]);

  const handleSmartCropClick = () => {
    if (!isSmartFilled && safeImage && !safeImage.smartCrop) {
      onSmartCrop(safeImage);
    }
    setIsSmartFilled(prev => !prev);
  };

  const handleEnhance = () => {
    if (!currentUser || !safeImage) return;
    setPromptModalConfig({
      taskType: 'enhance',
      initialPrompt: "Upscale this image to 4K resolution, restoring and enhancing details and quality. Remove any watermarks or text.",
      image: safeImage
    });
  };

  // Animation Handlers
  const handleAnimateClick = async (aspectRatio: AspectRatio) => {
    if (!currentUser || !safeImage || !safeImage.recreationPrompt || !settings) return;

    setAnimationState('generatingKeywords');
    try {
      const keywords = await generateKeywordsForPrompt(safeImage.recreationPrompt, settings);
      setAnimationData({
        originalPrompt: safeImage.recreationPrompt,
        generatedKeywords: keywords,
        aspectRatio: aspectRatio
      });
      setAnimationState('selectingKeywords');
    } catch (e: any) {
      addNotification({ status: 'error', message: `Failed to generate keywords: ${e.message}` });
      setAnimationState('idle');
    }
  };

  const handleKeywordSelectionSubmit = async (selectedKeywords: string[]) => {
    if (!animationData || !settings || !safeImage) return;
    setAnimationState('enhancingPrompt');
    try {
      const finalPrompt = await enhancePromptWithKeywords(animationData.originalPrompt, selectedKeywords, settings);
      setPromptModalConfig({
        taskType: 'video',
        initialPrompt: finalPrompt,
        aspectRatio: animationData.aspectRatio,
        image: safeImage,
      });
    } catch (e: any) {
      addNotification({ status: 'error', message: `Failed to enhance prompt: ${e.message}` });
    } finally {
      setAnimationState('idle');
      setAnimationData(null);
    }
  };

  // Prompt Logic
  const getPromptFromContext = (override?: string) => {
    if (!safeImage) return null;
    let promptToUse = override;
    if (!override) {
      promptToUse = activeContext === 'caption' ? safeImage.recreationPrompt : safeImage.originalMetadataPrompt;
    }
    if (!promptToUse) return null;

    let finalPrompt = promptToUse;
    let negativePromptStr = "";

    if (promptToUse.includes('| negative:')) {
      const parts = promptToUse.split('| negative:');
      finalPrompt = parts[0].trim();
      negativePromptStr = parts[1].trim();
    }
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
    if (!currentUser || !safeImage) return;
    const combinedPrompt = getPromptFromContext(promptOverride);
    if (!combinedPrompt) return;

    logger.track('User Action: Recreate', { imageId: safeImage.id, aspectRatio });

    setPromptModalConfig({
      taskType: 'image',
      initialPrompt: combinedPrompt,
      aspectRatio,
      image: safeImage
    });
  };

  const handleGenerate = (aspectRatio: AspectRatio) => {
    if (!currentUser || !safeImage) return;
    const combinedPrompt = getPromptFromContext();
    if (!combinedPrompt) return;

    logger.track('User Action: Generate', { imageId: safeImage.id, aspectRatio });

    setPromptModalConfig({
      taskType: 'image',
      initialPrompt: combinedPrompt,
      aspectRatio,
      // image is UNDEFINED to trigger Txt2Img mode
    });
  };

  return (
    <>
      <div className={`fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm ${isFullscreen ? 'z-[60]' : 'z-50'}`} onClick={onClose}>

        {/* Main Canvas */}
        {safeImage && (
          <ZoomPanCanvas
            currentImage={safeImage}
            isVideo={!!isVideo}
            isOfflineVideo={!!isOfflineVideo}
            isLoading={isLoading}
            error={error}
            isSmartFilled={isSmartFilled}
            isFullscreen={isFullscreen}
            onClose={onClose}
            onContainerClick={handleContainerClick}
            onNext={nextImage}
            onPrev={prevImage}
          >
            {/* Overlay Metadata Panel */}
            <MetadataPanel
              image={safeImage}
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
              isSmartCropping={processingSmartCropIds?.has(safeImage.id) ?? false}
              isSmartFilled={isSmartFilled}
              isSlideshowActive={isSlideshowActive}
              onToggleSlideshow={() => setIsSlideshowActive(!isSlideshowActive)}
              slideshowDelay={slideshowDelay}
              onSlideshowDelayChange={setSlideshowDelay}
              hasMultipleImages={navigationImages.length > 1}
              activeContext={activeContext}
              setActiveContext={setActiveContext}
            />
          </ZoomPanCanvas>
        )}

        {!safeImage && !isLoading && !error && (
          <div className="text-white">No Image Selected</div>
        )}

        {!isVideo && navigationImages.length > 1 && !isLoading && (
          <ThumbnailStrip
            images={navigationImages}
            currentIndex={currentIndex}
            onSelect={setCurrentIndex}
            settings={settings}
            currentUser={currentUser}
            isVisible={isCarouselVisible}
          />
        )}
      </div>

      {/* Keyword Selection Modal */}
      {animationState === 'selectingKeywords' && animationData && (
        <KeywordSelectionModal
          isOpen={true}
          onClose={() => {
            setAnimationState('idle');
            setAnimationData(null);
          }}
          keywords={animationData.generatedKeywords}
          onSubmit={handleKeywordSelectionSubmit}
        />
      )}

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
    </>
  );
};

export default ImageViewer;
