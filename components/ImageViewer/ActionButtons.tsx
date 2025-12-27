import React from 'react';
import {
    ClipboardIcon as CopyIcon,
    SparklesIcon,
    VideoCameraIcon,
    ArrowDownTrayIcon as DownloadIcon,
    SparklesIcon as WandIcon,
    ExclamationTriangleIcon as WarningIcon,
    ArrowPathIcon as RefreshIcon,
    ScissorsIcon as CropIcon,
    PlayIcon,
    StopIcon,
    ArrowsRightLeftIcon as ArrowLeftRightIcon,
    ArrowTrendingUpIcon as UpscaleIcon
} from '@heroicons/react/24/outline';
import Spinner from '../Spinner';
import { isAnyProviderConfiguredFor } from '../../services/aiService';
import { logger } from '../../services/loggingService';
import { getClosestSupportedAspectRatio } from '../../utils/fileUtils';
import { ActionButtonsProps } from './ImageViewer.types';
import { AspectRatio } from '../../types';

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    image, onRecreate, onGenerate, onAnimate, onEnhance, onRegenerateCaption, onSmartCrop,
    isSmartCropping, isSmartFilled, isPreparingAnimation, settings, currentUser, isFloating
}) => {
    const supportedAR = image.aspectRatio ? getClosestSupportedAspectRatio(image.aspectRatio) : '1:1';

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
                        onAnimate(supportedAR as AspectRatio);
                    }}
                    className={`${buttonClass} bg-green-600/80 hover:bg-green-600 flex items-center justify-center`}
                    disabled={!canAnimate || isPreparingAnimation || !currentUser || isOfflineVideo}
                >
                    {isPreparingAnimation ? <Spinner className={iconClass} /> : <VideoCameraIcon className={iconClass} />}
                </button>
            </div>
            <div title={getTxt2ImgTooltip()}>
                <button
                    onClick={() => onGenerate(supportedAR as AspectRatio)}
                    className={`${buttonClass} bg-pink-600/80 hover:bg-pink-600`}
                    disabled={!canGenerate || isPreparingAnimation || !currentUser}
                >
                    <SparklesIcon className={iconClass} />
                </button>
            </div>
            <div title={getGenerationTooltip(supportedAR)}>
                <button
                    onClick={() => onRecreate(supportedAR as AspectRatio)}
                    className={`${buttonClass} bg-indigo-600/80 hover:bg-indigo-600`}
                    disabled={!canGenerate || isPreparingAnimation || !currentUser}
                >
                    <ArrowLeftRightIcon className={iconClass} />
                </button>
            </div>
        </div>
    )
}
