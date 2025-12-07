import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImageInfo } from '../types';
import { CloseIcon } from './icons';

interface IdleSlideshowProps {
  images: ImageInfo[];
  isActive: boolean;
  onClose: () => void;
  transition?: 'fade' | 'cross-fade' | 'slide' | 'zoom' | 'ken-burns' | 'cube' | 'stack' | 'random' | 'parallax';
  useSmartCrop?: boolean;
  useAdaptivePan?: boolean;
  processingSmartCropIds?: Set<string>;
  interval?: number;
  animationDuration?: number;
  enableBounce?: boolean;
  randomOrder?: boolean;
}

const IdleSlideshow: React.FC<IdleSlideshowProps> = ({
  images, isActive, onClose,
  transition = 'cross-fade',
  useSmartCrop = false,
  useAdaptivePan = false,
  processingSmartCropIds,
  interval = 4000,
  animationDuration = 1500,
  enableBounce = false,
  randomOrder = false
}) => {
  // State for Adaptive Portrait
  const [isPortrait, setIsPortrait] = useState(typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeIndex, setActiveIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);

  // State to track the current transition effect being used
  const [currentEffect, setCurrentEffect] = useState(transition === 'random' ? 'cross-fade' : transition);

  // Refs for timing
  const slideTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

  // Update currentEffect if prop changes (unless it's random)
  useEffect(() => {
    if (transition !== 'random') {
      setCurrentEffect(transition);
    }
  }, [transition]);

  // Use a Ref to hold the current activeIndex so triggerNextStable doesn't need to rebuild.
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  const imagesLengthRef = useRef(images.length);
  useEffect(() => { imagesLengthRef.current = images.length; }, [images.length]);

  const imagesRef = useRef(images);
  useEffect(() => { imagesRef.current = images; }, [images]);

  // Random Order Deck Management
  const deckRef = useRef<number[]>([]);

  // Reset deck if images length changes significantly or if we switch modes
  useEffect(() => {
    deckRef.current = [];
  }, [images.length, transition]); // Reset deck on major changes

  // TRIGGER NEXT STABLE
  const triggerNextStable = useCallback(() => {
    if (imagesLengthRef.current <= 1) return;

    let effect = transition;
    const current = activeIndexRef.current;
    let nextIdx = (current + 1) % imagesLengthRef.current; // Default sequential

    // Handle Random Order
    if (randomOrder) {
      if (deckRef.current.length === 0) {
        // Create new deck
        const newDeck = Array.from({ length: imagesLengthRef.current }, (_, i) => i);
        // Shuffle (Fisher-Yates)
        for (let i = newDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }

        // Avoid immediate repeat if deck is refilled
        // If the last image shown is the same as the first in the new deck, swap first with last
        if (newDeck.length > 1 && newDeck[0] === current) {
          [newDeck[0], newDeck[newDeck.length - 1]] = [newDeck[newDeck.length - 1], newDeck[0]];
        }
        deckRef.current = newDeck;
      }

      // Pop from deck
      const popped = deckRef.current.pop();
      if (popped !== undefined) {
        nextIdx = popped;
      }
    }

    const nextImg = imagesRef.current[nextIdx];

    let isPan = false;
    if (useAdaptivePan && isPortrait && nextImg && nextImg.width && nextImg.height && nextImg.width > nextImg.height * 1.2) {
      isPan = true;
    }

    if (!isPan) {
      if (transition === 'random') {
        const effects = ['cross-fade', 'slide', 'cube', 'stack', 'zoom', 'ken-burns', 'parallax'];
        effect = effects[Math.floor(Math.random() * effects.length)] as any;
        setCurrentEffect(effect);
      } else {
        setCurrentEffect(effect);
      }
    }

    // Set duration based on IsPan or User Pref
    const panDur = Math.max(8000, animationDuration);
    const duration = isPan ? panDur : ((effect === 'slide' || effect === 'stack') ? Math.min(800, animationDuration) : animationDuration);

    setNextIndex((_) => {
      return nextIdx;
    });

    transitionTimerRef.current = window.setTimeout(() => {
      setNextIndex((finishedNext) => {
        if (finishedNext !== null) {
          setActiveIndex(finishedNext);
        }
        return null;
      });
    }, duration);
  }, [transition, useAdaptivePan, isPortrait, animationDuration, randomOrder]);

  // Main Loop
  useEffect(() => {
    if (!isActive) {
      setActiveIndex(0);
      setNextIndex(null);
      return;
    }

    // Only set timer if we are stable (nextIndex is null)
    if (nextIndex === null) {
      slideTimerRef.current = window.setTimeout(triggerNextStable, interval);
    }

    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, [isActive, nextIndex, triggerNextStable, interval]);

  // Event Listeners for closing
  useEffect(() => {
    if (isActive) {
      const closeOnInteraction = () => onClose();
      const options = { once: true, passive: true };
      window.addEventListener('mousemove', closeOnInteraction, options);
      window.addEventListener('mousedown', closeOnInteraction, options);
      window.addEventListener('keydown', closeOnInteraction, options);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      return () => {
        window.removeEventListener('mousemove', closeOnInteraction);
        window.removeEventListener('mousedown', closeOnInteraction);
        window.removeEventListener('keydown', closeOnInteraction);
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      };
    }
  }, [isActive, onClose]);


  if (!isActive || images.length === 0) return null;

  const currentImg = images[activeIndex];
  const nextImg = nextIndex !== null ? images[nextIndex] : null;

  const getStyles = () => {
    const isTransitioning = nextImg !== null;
    const effect = currentEffect;
    const dur = `${animationDuration}ms`;
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
      return {
        container: containerBase,
        activeAnim: isTransitioning ? { animation: `slideOutLeft ${dur} cubic-bezier(0.4, 0.0, 0.2, 1) forwards` } : {},
        nextAnim: { animation: `slideInRight ${dur} cubic-bezier(0.4, 0.0, 0.2, 1) forwards` }
      };
    }

    if (effect === 'cube') {
      return {
        container: `${containerBase} perspective-1000`,
        activeAnim: isTransitioning ? { animation: `cubeRotateOut ${dur} ease-in-out forwards`, transformOrigin: '100% 50%' } : {},
        nextAnim: { animation: `cubeRotateIn ${dur} ease-in-out forwards`, transformOrigin: '0% 50%' }
      };
    }

    if (effect === 'stack') {
      return {
        container: containerBase,
        activeAnim: isTransitioning ? {
          transform: 'scale(0.9)',
          opacity: 0.5,
          filter: 'brightness(50%)',
          transition: `all ${dur} ease-out`
        } as any : {},
        nextAnim: {
          animation: `slideInUp ${dur} ease-out forwards`,
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
      const direction = enableBounce ? 'alternate' : 'normal';
      return {
        container: containerBase,
        activeAnim: isTransitioning
          ? { animation: `fadeOut ${dur} forwards, kenBurnsRight 10s infinite ${direction}` }
          : { animation: `kenBurnsRight 10s infinite ${direction}` },
        nextAnim: { animation: `fadeIn ${dur} forwards, kenBurnsLeft 10s infinite ${direction}` }
      };
    }

    if (effect === 'parallax') {
      return {
        container: containerBase,
        activeAnim: isTransitioning ? { animation: `parallaxOut ${dur} cubic-bezier(0.2, 0.0, 0.2, 1) forwards` } : {},
        nextAnim: { animation: `parallaxIn ${dur} cubic-bezier(0.2, 0.0, 0.2, 1) forwards` }
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
      if (useAdaptivePan && isPortrait && img && img.width && img.height && img.width > img.height * 1.2) {
        const direction = index % 2 === 0 ? 'left-to-right' : 'right-to-left';
        const endTransform = direction === 'left-to-right' ? 'translateX(0)' : 'translateX(calc(100vw - 100%))';
        const animName = direction === 'left-to-right' ? 'panRight' : 'panLeft';
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
            animation: `fadeOut ${Math.min(1500, animationDuration) + 'ms'} forwards`
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
        const slideLifetime = interval + animationDuration;
        const panDurMs = Math.max(8000, animationDuration);

        const effectiveDur = enableBounce ? slideLifetime / 2 : panDurMs;
        const direction = enableBounce ? 'alternate' : 'normal';
        const iteration = enableBounce ? 'infinite' : '1';
        const fillMode = enableBounce ? '' : 'forwards';

        styles.nextAnim = {
          objectFit: 'cover',
          height: '100%',
          width: 'auto',
          maxWidth: 'none',
          position: 'absolute',
          top: 0,
          animation: `fadeIn ${Math.min(1500, animationDuration) + 'ms'} ease-in, ${meta.animName} ${effectiveDur}ms linear ${direction} ${iteration} ${fillMode}`
        };
      }
    }

    return { ...styles };
  };

  const styles = getFinalStyles();
  const useSmartCropStyles = useSmartCrop;

  const isPanImage = (img: ImageInfo | null) => {
    return useAdaptivePan && isPortrait && img && img.width && img.height && img.width > img.height * 1.2;
  };

  const getImageStyle = (img: ImageInfo | null) => {
    if (!img) return {};
    if (useSmartCropStyles && img.smartCrop && !isPanImage(img)) {
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
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        
        /* Fade */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

        /* Slide */
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideOutLeft { from { transform: translateX(0); } to { transform: translateX(-100%); } }

        /* Cube */
        @keyframes cubeRotateIn { 
            from { transform: rotateY(90deg); opacity: 0.5; } 
            to { transform: rotateY(0deg); opacity: 1; } 
        }
        @keyframes cubeRotateOut { 
            from { transform: rotateY(0deg); opacity: 1; } 
            to { transform: rotateY(-90deg); opacity: 0.5; } 
        }

        /* Stack (Simple Slide Up) */
        @keyframes slideInUp { 
            from { transform: translateY(100%); } 
            to { transform: translateY(0); } 
        }

        /* Zoom */
        @keyframes zoomInFade { from { transform: scale(1.1); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes zoomOutFade { from { transform: scale(1); opacity: 1; } to { transform: scale(0.9); opacity: 0; } }

        /* Ken Burns */
        @keyframes kenBurnsRight { from { transform: scale(1) translate(0,0); } to { transform: scale(1.2) translate(2%, 2%); } }
        @keyframes kenBurnsLeft { from { transform: scale(1.2) translate(-2%, -2%); } to { transform: scale(1) translate(0,0); } }

        /* Parallax Glide */
        @keyframes parallaxIn { 
            from { transform: translateX(100%) scale(1.1); filter: brightness(1.2); } 
            to { transform: translateX(0) scale(1); filter: brightness(1); } 
        }
        @keyframes parallaxOut { 
            from { transform: translateX(0) scale(1); filter: brightness(1); } 
            to { transform: translateX(-30%) scale(0.9); filter: brightness(0.5); opacity: 0; } 
        }

        /* Cinematic Pan (Portrait Mode) */
        @keyframes panToRightEdge {
            from { transform: translateX(0); }
            to { transform: translateX(calc(100vw - 100%)); }
        }
        @keyframes panToLeftEdge {
            from { transform: translateX(calc(100vw - 100%)); }
            to { transform: translateX(0); }
        }
        @keyframes panRight {
             from { transform: translateX(calc(100vw - 100%)); }
             to { transform: translateX(0); }
        }
        @keyframes panLeft {
             from { transform: translateX(0); }
             to { transform: translateX(calc(100vw - 100%)); }
        }

      `}</style>
    </div>
  );
};

export default IdleSlideshow;