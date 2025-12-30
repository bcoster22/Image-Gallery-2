import React from 'react';
import { ImageInfo } from '../../types';
import { TransitionType } from './types';
import { XMarkIcon as CloseIcon } from '@heroicons/react/24/outline';
import {
    PAN_MIN_DURATION_MS,
    PAN_FADE_DURATION_MS
} from '../../constants/timings';
import { LANDSCAPE_ASPECT_RATIO_THRESHOLD } from '../../constants/thresholds';

interface SlideshowLayerProps {
    images: ImageInfo[];
    activeIndex: number;
    nextIndex: number | null;
    direction: 1 | -1;
    currentEffect: TransitionType;
    currentDuration: number;
    currentInterval: number;
    isPortrait: boolean;
    useAdaptivePan: boolean;
    useSmartCrop: boolean;
    processingSmartCropIds?: Set<string>;
    enableBounce: boolean;
    feedback: { text: string, icon?: React.ReactNode } | null;
    onClose: () => void;
}

export const SlideshowLayer: React.FC<SlideshowLayerProps> = ({
    images, activeIndex, nextIndex, direction,
    currentEffect, currentDuration, currentInterval,
    isPortrait, useAdaptivePan, useSmartCrop, processingSmartCropIds,
    enableBounce, feedback, onClose
}) => {

    if (images.length === 0) return null;

    const currentImg = images[activeIndex];
    const nextImg = nextIndex !== null ? images[nextIndex] : null;

    const getStyles = () => {
        const isTransitioning = nextImg !== null;
        const effect = currentEffect;
        const dur = `${currentDuration}ms`;
        const imageBase = "absolute inset-0 w-full h-full object-contain will-change-transform";
        const containerBase = "w-full h-full relative overflow-hidden";

        if (effect === 'cross-fade') {
            return {
                container: containerBase,
                activeAnim: isTransitioning ? { animation: `fadeOut ${dur} forwards` } : {},
                nextAnim: { animation: `fadeIn ${dur} forwards` }
            };
        }

        if (effect === 'slide') {
            const outAnim = direction === 1 ? 'slideOutLeft' : 'slideOutRight';
            const inAnim = direction === 1 ? 'slideInRight' : 'slideInLeft';
            return {
                container: containerBase,
                activeAnim: isTransitioning ? { animation: `${outAnim} ${dur} cubic-bezier(0.4, 0.0, 0.2, 1) forwards` } : {},
                nextAnim: { animation: `${inAnim} ${dur} cubic-bezier(0.4, 0.0, 0.2, 1) forwards` }
            };
        }

        if (effect === 'cube') {
            const outAnim = direction === 1 ? 'cubeRotateOut' : 'cubeRotateOutRev';
            const inAnim = direction === 1 ? 'cubeRotateIn' : 'cubeRotateInRev';
            const originActive = direction === 1 ? '100% 50%' : '0% 50%';
            const originNext = direction === 1 ? '0% 50%' : '100% 50%';
            return {
                container: `${containerBase} perspective-1000`,
                activeAnim: isTransitioning ? { animation: `${outAnim} ${dur} ease-in-out forwards`, transformOrigin: originActive } : {},
                nextAnim: { animation: `${inAnim} ${dur} ease-in-out forwards`, transformOrigin: originNext }
            };
        }

        if (effect === 'stack') {
            const inAnim = direction === 1 ? 'slideInUp' : 'slideInDown';
            return {
                container: containerBase,
                activeAnim: isTransitioning ? {
                    transform: 'scale(0.9)',
                    opacity: 0.5,
                    filter: 'brightness(50%)',
                    transition: `all ${dur} ease-out`
                } as any : {},
                nextAnim: {
                    animation: `${inAnim} ${dur} ease-out forwards`,
                    boxShadow: '0 -10px 20px rgba(0,0,0,0.5)'
                } as any
            };
        }

        if (effect === 'zoom') {
            return {
                container: containerBase,
                activeAnim: isTransitioning ? { animation: `zoomOutFade ${dur} forwards` } : {},
                nextAnim: { animation: `zoomInFade ${dur} forwards` }
            };
        }

        if (effect === 'ken-burns') {
            const dirProp = enableBounce ? 'alternate' : 'normal';
            return {
                container: containerBase,
                activeAnim: isTransitioning
                    ? { animation: `fadeOut ${dur} forwards, kenBurnsRight 10s infinite ${dirProp}` }
                    : { animation: `kenBurnsRight 10s infinite ${dirProp}` },
                nextAnim: { animation: `fadeIn ${dur} forwards, kenBurnsLeft 10s infinite ${dirProp}` }
            };
        }

        if (effect === 'parallax') {
            const outAnim = direction === 1 ? 'parallaxOut' : 'parallaxOutRev';
            const inAnim = direction === 1 ? 'parallaxIn' : 'parallaxInRev';
            return {
                container: containerBase,
                activeAnim: isTransitioning ? { animation: `${outAnim} ${dur} cubic-bezier(0.2, 0.0, 0.2, 1) forwards` } : {},
                nextAnim: { animation: `${inAnim} ${dur} cubic-bezier(0.2, 0.0, 0.2, 1) forwards` }
            };
        }

        return {
            container: containerBase,
            activeAnim: isTransitioning ? { animation: `fadeOut ${dur} forwards` } : {},
            nextAnim: { animation: `fadeIn ${dur} forwards` }
        };
    };

    const getFinalStyles = () => {
        const getAdaptiveMeta = (img: ImageInfo | null, index: number) => {
            if (useAdaptivePan && isPortrait && img && img.width && img.height && img.width > img.height * LANDSCAPE_ASPECT_RATIO_THRESHOLD) {
                const panDir = index % 2 === 0 ? 'left-to-right' : 'right-to-left';
                const endTransform = panDir === 'left-to-right' ? 'translateX(0)' : 'translateX(calc(100vw - 100%))';
                const animName = panDir === 'left-to-right' ? 'panRight' : 'panLeft';
                return { isPan: true, endTransform, animName };
            }
            return { isPan: false };
        };

        const styles = getStyles();

        if (currentImg) {
            const meta = getAdaptiveMeta(currentImg, activeIndex);
            if (meta.isPan) {
                styles.container = "w-full h-full relative overflow-hidden bg-black";
                const baseStyle: React.CSSProperties = {
                    objectFit: 'cover',
                    height: '100%',
                    width: 'auto',
                    maxWidth: 'none',
                    position: 'absolute',
                    top: 0,
                    transform: meta.endTransform
                };

                if (nextImg) {
                    styles.activeAnim = {
                        ...baseStyle,
                        animation: `fadeOut ${Math.min(PAN_FADE_DURATION_MS, currentDuration) + 'ms'} forwards`
                    };
                } else {
                    styles.activeAnim = baseStyle;
                }
            }
        }

        if (nextImg) {
            const meta = getAdaptiveMeta(nextImg, nextIndex!);
            if (meta.isPan) {
                styles.container = "w-full h-full relative overflow-hidden bg-black";
                const slideLifetime = currentInterval + currentDuration;
                const panDurMs = Math.max(PAN_MIN_DURATION_MS, currentDuration);

                const effectiveDur = enableBounce ? slideLifetime / 2 : panDurMs;
                const animDir = enableBounce ? 'alternate' : 'normal';
                const iteration = enableBounce ? 'infinite' : '1';
                const fillMode = enableBounce ? '' : 'forwards';

                styles.nextAnim = {
                    objectFit: 'cover',
                    height: '100%',
                    width: 'auto',
                    maxWidth: 'none',
                    position: 'absolute',
                    top: 0,
                    animation: `fadeIn ${Math.min(PAN_FADE_DURATION_MS, currentDuration) + 'ms'} ease-in, ${meta.animName} ${effectiveDur}ms linear ${animDir} ${iteration} ${fillMode}`
                };
            }
        }

        return { ...styles };
    };

    const styles = getFinalStyles();

    const isPanImage = (img: ImageInfo | null) => {
        return useAdaptivePan && isPortrait && img && img.width && img.height && img.width > img.height * LANDSCAPE_ASPECT_RATIO_THRESHOLD;
    };

    const getImageStyle = (img: ImageInfo | null) => {
        if (!img) return {};
        if (useSmartCrop && img.smartCrop && !isPanImage(img)) {
            return {
                objectFit: 'cover' as const,
                objectPosition: `${img.smartCrop.x}% ${img.smartCrop.y}%`,
            };
        }
        return {};
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-[70] text-white/70 hover:text-white transition-colors"
            >
                <CloseIcon className="w-8 h-8" />
            </button>

            <div className={styles.container}>
                {/* Active Image */}
                {currentImg && (
                    <img
                        key={`active-${currentImg.id}`}
                        src={currentImg.dataUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain will-change-transform"
                        style={{ ...styles.activeAnim, ...getImageStyle(currentImg) }}
                    />
                )}

                {/* Next Image */}
                {nextImg && (
                    <img
                        key={`next-${nextImg.id}`}
                        src={nextImg.dataUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain will-change-transform"
                        style={{ ...styles.nextAnim, ...getImageStyle(nextImg) }}
                    />
                )}

                {/* Processing Overlays */}
                {currentImg && processingSmartCropIds?.has(currentImg.id) && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none" style={styles.activeAnim}>
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-white font-medium text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">Smart Cropping...</p>
                    </div>
                )}

                {nextImg && processingSmartCropIds?.has(nextImg.id) && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none" style={styles.nextAnim}>
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-white font-medium text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">Smart Cropping...</p>
                    </div>
                )}

                {/* Feedback Overlay (Pause/Speed) */}
                {feedback && (
                    <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-[80] bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-md font-medium text-lg animate-fade-in-out shadow-lg">
                        {feedback.text}
                    </div>
                )}
            </div>

            <style>{`
        .perspective-1000 { perspective: 1000px; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideOutLeft { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }
        @keyframes cubeRotateIn { from { transform: rotateY(90deg); opacity: 0.5; } to { transform: rotateY(0deg); opacity: 1; } }
        @keyframes cubeRotateOut { from { transform: rotateY(0deg); opacity: 1; } to { transform: rotateY(-90deg); opacity: 0.5; } }
        @keyframes cubeRotateInRev { from { transform: rotateY(-90deg); opacity: 0.5; } to { transform: rotateY(0deg); opacity: 1; } }
        @keyframes cubeRotateOutRev { from { transform: rotateY(0deg); opacity: 1; } to { transform: rotateY(90deg); opacity: 0.5; } }
        @keyframes slideInUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideInDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes zoomInFade { from { transform: scale(1.1); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes zoomOutFade { from { transform: scale(1); opacity: 1; } to { transform: scale(0.9); opacity: 0; } }
        @keyframes kenBurnsRight { from { transform: scale(1) translate(0,0); } to { transform: scale(1.2) translate(2%, 2%); } }
        @keyframes kenBurnsLeft { from { transform: scale(1.2) translate(-2%, -2%); } to { transform: scale(1) translate(0,0); } }
        @keyframes parallaxIn { from { transform: translateX(100%) scale(1.1); filter: brightness(1.2); } to { transform: translateX(0) scale(1); filter: brightness(1); } }
        @keyframes parallaxOut { from { transform: translateX(0) scale(1); filter: brightness(1); } to { transform: translateX(-30%) scale(0.9); filter: brightness(0.5); opacity: 0; } }
        @keyframes parallaxInRev { from { transform: translateX(-100%) scale(1.1); filter: brightness(1.2); } to { transform: translateX(0) scale(1); filter: brightness(1); } }
        @keyframes parallaxOutRev { from { transform: translateX(0) scale(1); filter: brightness(1); } to { transform: translateX(30%) scale(0.9); filter: brightness(0.5); opacity: 0; } }
        @keyframes panToRightEdge { from { transform: translateX(0); } to { transform: translateX(calc(100vw - 100%)); } }
        @keyframes panToLeftEdge { from { transform: translateX(calc(100vw - 100%)); } to { transform: translateX(0); } }
        @keyframes panRight { from { transform: translateX(calc(100vw - 100%)); } to { transform: translateX(0); } }
        @keyframes panLeft { from { transform: translateX(0); } to { transform: translateX(calc(100vw - 100%)); } }
      `}</style>
        </div>
    );
};
