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
  onRequestSlowdown?: (shouldSlow: boolean) => void;
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
  randomOrder = false,
  onRequestSlowdown
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

  // Advanced Control State
  const [isPaused, setIsPaused] = useState(false);
  const [currentInterval, setCurrentInterval] = useState(interval);
  const [currentDuration, setCurrentDuration] = useState(animationDuration);
  const [feedback, setFeedback] = useState<{ text: string, icon?: React.ReactNode } | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  // Helper to show feedback toast
  const showFeedback = (text: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback({ text });
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(null), 1500);
  };

  // Update internal state if props change (unless user manually overrode them)
  useEffect(() => {
    setCurrentInterval(interval);
    setCurrentDuration(animationDuration);
  }, [interval, animationDuration]);

  // Ref to track if we are manually navigating to debounce
  const isNavigatingRef = useRef(false);
  const isFirstActivationRef = useRef(true); // Track first activation for initial delay
  const [direction, setDirection] = useState(1); // 1 = Next, -1 = Prev

  // TRIGGER SLIDE (Next or Prev)
  const triggerSlide = useCallback((dir: 1 | -1) => {
    if (imagesLengthRef.current <= 1) return;
    if (isNavigatingRef.current || transitionTimerRef.current) return; // Busy

    isNavigatingRef.current = true;
    setDirection(dir);

    // Random Mode always goes "Next" in the deck, but if user specifically asked for Prev, 
    // we might want to pop from history? 
    // For now, let's keep Random simple and just shuffle forward, or enable history later.
    // If Random Order is ON, standard "Prev" is hard without a history stack.
    // Let's assume standard cyclic behavior for Prev if not random, or just re-shuffle.
    // Actually, "Previous" in Random mode usually means "The one I just saw".
    // Implementing full history for Random Prev is complex. Let's stick to deck logic for Next,
    // and simple decrement for Prev (which might break the "random deck" flow but works).
    // Better: If Random, Prev just goes to random index? No, user wants "Previous image".
    // Let's disable Random logic for "Prev" direction for now and just loop back, 
    // OR just ignore Random deck for Prev and go activeIndex - 1.

    let nextIdx = 0;
    const current = activeIndexRef.current;

    if (randomOrder && dir === 1) {
      // Use existing Deck logic for NEXT
      if (deckRef.current.length === 0) {
        const newDeck = Array.from({ length: imagesLengthRef.current }, (_, i) => i);
        for (let i = newDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }
        if (newDeck.length > 1 && newDeck[0] === current) {
          [newDeck[0], newDeck[newDeck.length - 1]] = [newDeck[newDeck.length - 1], newDeck[0]];
        }
        deckRef.current = newDeck;
      }
      const popped = deckRef.current.pop();
      if (popped !== undefined) nextIdx = popped;
    } else {
      // Sequential (or Random Prev)
      nextIdx = (current + dir + imagesLengthRef.current) % imagesLengthRef.current;
    }

    const nextImg = imagesRef.current[nextIdx];

    // Select Effect
    let effect = transition;
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

    const panDur = Math.max(8000, currentDuration);
    const duration = isPan ? panDur : ((effect === 'slide' || effect === 'stack') ? Math.min(800, currentDuration) : currentDuration);

    setNextIndex(nextIdx);

    // Reset busy state after transition
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      setNextIndex((finishedNext) => {
        if (finishedNext !== null) setActiveIndex(finishedNext);
        isNavigatingRef.current = false;
        return null;
      });
    }, duration);

  }, [transition, useAdaptivePan, isPortrait, currentDuration, randomOrder]);

  // Check if next image needs smart crop processing
  useEffect(() => {
    if (!useSmartCrop || !isActive) return;

    // Calculate what the next index will be
    const nextIdx = randomOrder
      ? (deckRef.current.length > 0 ? deckRef.current[deckRef.current.length - 1] : (activeIndex + 1) % images.length)
      : (activeIndex + 1) % images.length;

    const nextImg = images[nextIdx];

    // Check if next image needs smart crop or is being processed
    const needsProcessing = nextImg && !nextImg.smartCrop;
    const isProcessing = nextImg && processingSmartCropIds?.has(nextImg.id);

    // Request slowdown if next image isn't ready
    if (onRequestSlowdown) {
      onRequestSlowdown(needsProcessing || isProcessing);
    }
  }, [activeIndex, images, useSmartCrop, processingSmartCropIds, randomOrder, isActive, onRequestSlowdown]);

  // Main Timer Loop (Auto Advance)
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  // Effect to handle Initial Delay (Warmup)
  useEffect(() => {
    if (isActive && !isPaused) {
      // Start 2s Warmup
      setIsWarmingUp(true);
      const timer = setTimeout(() => {
        setIsWarmingUp(false);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      // If stopped/paused, reset warmup state
      setIsWarmingUp(false);
    }
  }, [isActive, isPaused]);

  // Effect for Regular Interval Slideshow
  useEffect(() => {
    if (!isActive || isPaused || isWarmingUp) {
      if (!isNavigatingRef.current) {
        if (slideTimerRef.current) {
          clearTimeout(slideTimerRef.current);
          slideTimerRef.current = null;
        }
      }
      return;
    }

    // Only set timer if there isn't one already running AND nextIndex is null
    const shouldSetTimer = (nextIndex === null && !isNavigatingRef.current && !slideTimerRef.current);

    if (shouldSetTimer) {
      // Normal interval timer
      slideTimerRef.current = window.setTimeout(() => {
        triggerSlide(1);
        slideTimerRef.current = null;
      }, currentInterval);
    }

    return () => {
      if (slideTimerRef.current) {
        clearTimeout(slideTimerRef.current);
        slideTimerRef.current = null;
      }
    };
  }, [isActive, nextIndex, triggerSlide, currentInterval, isPaused, isWarmingUp]);


  // CONTROLS Handlers (Wheel, Swipe, Tap-exit)
  useEffect(() => {
    if (!isActive) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 30) {
        e.preventDefault();
        if (e.deltaY > 0) triggerSlide(1);
        else triggerSlide(-1);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const timeDiff = Date.now() - touchStartTime;

      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      if (timeDiff < 300 && Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
        onClose();
        return;
      }

      if (Math.abs(diffX) > 50 || Math.abs(diffY) > 50) {
        if (Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX > 0) triggerSlide(-1);
          else triggerSlide(1);
        } else {
          if (diffY > 0) triggerSlide(-1);
          else triggerSlide(1);
        }
      }
    };

    // Mouse Click to Exit
    const handleClick = (e: MouseEvent) => {
      onClose();
    };

    // Advanced Keyboard Controls
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default actions for control keys to avoid scrolling/browser interactions
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '_'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case ' ': // Space -> Next
          triggerSlide(1);
          break;
        case 'p':
        case 'P': // P -> Pause/Resume
          setIsPaused(prev => {
            const newState = !prev;
            showFeedback(newState ? "Paused" : "Resumed");
            return newState;
          });
          break;
        case '+':
        case '=': // Speed Up (Reduce Interval)
          setCurrentInterval(prev => {
            const next = Math.max(1000, prev - 500);
            showFeedback(`Speed Up (${(next / 1000).toFixed(1)}s)`);
            return next;
          });
          break;
        case '-':
        case '_': // Slow Down (Increase Interval)
          setCurrentInterval(prev => {
            const next = Math.min(20000, prev + 500);
            showFeedback(`Slow Down (${(next / 1000).toFixed(1)}s)`);
            return next;
          });
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          triggerSlide(1);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          triggerSlide(-1);
          break;
        case 'Escape':
          onClose();
          break;
        default:
          // Strict Exit: Any other key exits
          if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
            // Only exit on "typing" keys, or all keys?
            // User said "any other key exit slide show".
            onClose();
          }
          break;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, onClose, triggerSlide, isPaused, currentInterval]); // dependencies updated


  if (!isActive || images.length === 0) return null;

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
      // Stack usually implies "Next goes on top". Reversed stack might be "Current slides down?"
      // For simplicity, let's keep stack direction unified or simple reverse.
      // Reverse: New slide comes down from top? or Current slides down?
      // Let's make Prev slide come from Top if Dir -1.
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
        {/* Feedback Overlay (Pause/Speed) */}
        {feedback && (
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-[80] bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-md font-medium text-lg animate-fade-in-out shadow-lg">
            {feedback.text}
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
        /* Slide Reverse */
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }

        /* Cube */
        @keyframes cubeRotateIn { 
            from { transform: rotateY(90deg); opacity: 0.5; } 
            to { transform: rotateY(0deg); opacity: 1; } 
        }
        @keyframes cubeRotateOut { 
            from { transform: rotateY(0deg); opacity: 1; } 
            to { transform: rotateY(-90deg); opacity: 0.5; } 
        }
        /* Cube Reverse */
        @keyframes cubeRotateInRev { 
            from { transform: rotateY(-90deg); opacity: 0.5; } 
            to { transform: rotateY(0deg); opacity: 1; } 
        }
        @keyframes cubeRotateOutRev { 
            from { transform: rotateY(0deg); opacity: 1; } 
            to { transform: rotateY(90deg); opacity: 0.5; } 
        }

        /* Stack (Simple Slide Up) */
        @keyframes slideInUp { 
            from { transform: translateY(100%); } 
            to { transform: translateY(0); } 
        }
        @keyframes slideInDown { 
            from { transform: translateY(-100%); } 
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
        /* Parallax Reverse */
        @keyframes parallaxInRev { 
            from { transform: translateX(-100%) scale(1.1); filter: brightness(1.2); } 
            to { transform: translateX(0) scale(1); filter: brightness(1); } 
        }
        @keyframes parallaxOutRev { 
             from { transform: translateX(0) scale(1); filter: brightness(1); } 
             to { transform: translateX(30%) scale(0.9); filter: brightness(0.5); opacity: 0; } 
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