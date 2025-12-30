import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImageInfo } from '../types';
import { TransitionType } from '../components/IdleSlideshow/types';
import {
    DEFAULT_SLIDESHOW_INTERVAL_MS,
    DEFAULT_ANIMATION_DURATION_MS,
    SLIDESHOW_WARMUP_DELAY_MS,
    SLIDESHOW_FEEDBACK_DURATION_MS,
    SLIDESHOW_MIN_INTERVAL_MS,
    SLIDESHOW_MAX_INTERVAL_MS,
    SLIDESHOW_INTERVAL_STEP_MS,
    PAN_MIN_DURATION_MS
} from '../constants/timings';
import {
    WHEEL_SCROLL_THRESHOLD,
    TAP_MAX_DURATION_MS,
    TAP_MAX_MOVEMENT_PX,
    SWIPE_MIN_DISTANCE_PX,
    LANDSCAPE_ASPECT_RATIO_THRESHOLD
} from '../constants/thresholds';

interface UseSlideshowLogicProps {
    images: ImageInfo[];
    isActive: boolean;
    onClose: () => void;
    transition: TransitionType;
    interval: number;
    animationDuration: number;
    randomOrder: boolean;
    useAdaptivePan: boolean;
}

export function useSlideshowLogic({
    images, isActive, onClose,
    transition,
    interval,
    animationDuration,
    randomOrder,
    useAdaptivePan
}: UseSlideshowLogicProps) {

    // State
    const [activeIndex, setActiveIndex] = useState(0);
    const [nextIndex, setNextIndex] = useState<number | null>(null);
    const [currentEffect, setCurrentEffect] = useState<TransitionType>(transition === 'random' ? 'cross-fade' : transition as TransitionType);
    const [isPortrait, setIsPortrait] = useState(typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false);
    const [direction, setDirection] = useState<1 | -1>(1);

    // Advanced Control State
    const [isPaused, setIsPaused] = useState(false);
    const [currentInterval, setCurrentInterval] = useState(interval);
    const [currentDuration, setCurrentDuration] = useState(animationDuration);
    const [feedback, setFeedback] = useState<{ text: string, icon?: React.ReactNode } | null>(null);

    // Refs
    const slideTimerRef = useRef<number | null>(null);
    const transitionTimerRef = useRef<number | null>(null);
    const feedbackTimerRef = useRef<number | null>(null);
    const isNavigatingRef = useRef(false);
    const activeIndexRef = useRef(activeIndex);
    const imagesLengthRef = useRef(images.length);
    const imagesRef = useRef(images);
    const deckRef = useRef<number[]>([]);

    // Sync props to state/refs
    useEffect(() => {
        if (transition !== 'random') setCurrentEffect(transition);
    }, [transition]);

    useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
    useEffect(() => { imagesLengthRef.current = images.length; }, [images.length]);
    useEffect(() => { imagesRef.current = images; }, [images]);
    useEffect(() => {
        setCurrentInterval(interval);
        setCurrentDuration(animationDuration);
    }, [interval, animationDuration]);

    // Window Resize
    useEffect(() => {
        const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Deck Management for Random
    useEffect(() => {
        deckRef.current = [];
    }, [images.length, transition]);

    // Helper: Show Feedback
    const showFeedback = useCallback((text: string) => {
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        setFeedback({ text });
        feedbackTimerRef.current = window.setTimeout(() => setFeedback(null), SLIDESHOW_FEEDBACK_DURATION_MS);
    }, []);

    // Trigger Slide Logic
    const triggerSlide = useCallback((dir: 1 | -1) => {
        if (imagesLengthRef.current <= 1) return;
        if (isNavigatingRef.current || transitionTimerRef.current) return;

        isNavigatingRef.current = true;

        // Calculate Next Index
        let nextIdx = 0;
        const current = activeIndexRef.current;

        if (randomOrder && dir === 1) {
            if (deckRef.current.length === 0) {
                // Refill deck
                const newDeck = Array.from({ length: imagesLengthRef.current }, (_, i) => i);
                // Shuffle
                for (let i = newDeck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
                }
                // Avoid immediate repeat
                if (newDeck.length > 1 && newDeck[0] === current) {
                    [newDeck[0], newDeck[newDeck.length - 1]] = [newDeck[newDeck.length - 1], newDeck[0]];
                }
                deckRef.current = newDeck;
            }
            const popped = deckRef.current.pop();
            if (popped !== undefined) nextIdx = popped;
        } else {
            nextIdx = (current + dir + imagesLengthRef.current) % imagesLengthRef.current;
        }

        const nextImg = imagesRef.current[nextIdx];

        // Determine Effect
        let effect: TransitionType = transition;
        let isPan = false;
        if (useAdaptivePan && isPortrait && nextImg && nextImg.width && nextImg.height && nextImg.width > nextImg.height * LANDSCAPE_ASPECT_RATIO_THRESHOLD) {
            isPan = true;
        }

        if (!isPan) {
            if (transition === 'random') {
                const effects: TransitionType[] = ['cross-fade', 'slide', 'cube', 'stack', 'zoom', 'ken-burns', 'parallax'];
                effect = effects[Math.floor(Math.random() * effects.length)];
                setCurrentEffect(effect);
            } else {
                setCurrentEffect(effect);
            }
        }

        const panDur = Math.max(PAN_MIN_DURATION_MS, currentDuration);
        const duration = isPan ? panDur : ((effect === 'slide' || effect === 'stack') ? Math.min(800, currentDuration) : currentDuration);

        setNextIndex(nextIdx);

        // Transition Timer
        transitionTimerRef.current = window.setTimeout(() => {
            transitionTimerRef.current = null;
            setNextIndex((finishedNext) => {
                if (finishedNext !== null) setActiveIndex(finishedNext);
                isNavigatingRef.current = false;
                return null;
            });
        }, duration);

    }, [transition, useAdaptivePan, isPortrait, currentDuration, randomOrder]); // Careful with deps

    // Timer Loops
    const [isWarmingUp, setIsWarmingUp] = useState(false);

    useEffect(() => {
        if (isActive && !isPaused) {
            setIsWarmingUp(true);
            const timer = setTimeout(() => setIsWarmingUp(false), SLIDESHOW_WARMUP_DELAY_MS);
            return () => clearTimeout(timer);
        } else {
            setIsWarmingUp(false);
        }
    }, [isActive, isPaused]);

    useEffect(() => {
        if (!isActive || isPaused || isWarmingUp) {
            if (!isNavigatingRef.current && slideTimerRef.current) {
                clearTimeout(slideTimerRef.current);
                slideTimerRef.current = null;
            }
            return;
        }

        const shouldSetTimer = (nextIndex === null && !isNavigatingRef.current && !slideTimerRef.current);

        if (shouldSetTimer) {
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

    // Event Handlers
    useEffect(() => {
        if (!isActive) return;

        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        const handleWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) > WHEEL_SCROLL_THRESHOLD) {
                e.preventDefault();
                triggerSlide(e.deltaY > 0 ? 1 : -1);
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

            if (timeDiff < TAP_MAX_DURATION_MS && Math.abs(diffX) < TAP_MAX_MOVEMENT_PX && Math.abs(diffY) < TAP_MAX_MOVEMENT_PX) {
                onClose();
                return;
            }

            if (Math.abs(diffX) > SWIPE_MIN_DISTANCE_PX || Math.abs(diffY) > SWIPE_MIN_DISTANCE_PX) {
                if (Math.abs(diffX) > Math.abs(diffY)) {
                    triggerSlide(diffX > 0 ? -1 : 1);
                } else {
                    triggerSlide(diffY > 0 ? -1 : 1);
                }
            }
        };

        const handleClick = () => onClose();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '_'].includes(e.key)) {
                e.preventDefault();
            }

            switch (e.key) {
                case ' ': triggerSlide(1); break;
                case 'p': case 'P':
                    setIsPaused(p => {
                        const newState = !p;
                        showFeedback(newState ? "Paused" : "Resumed");
                        return newState;
                    });
                    break;
                case '+': case '=':
                    setCurrentInterval(p => {
                        const next = Math.max(SLIDESHOW_MIN_INTERVAL_MS, p - SLIDESHOW_INTERVAL_STEP_MS);
                        showFeedback(`Speed Up (${(next / 1000).toFixed(1)}s)`);
                        return next;
                    });
                    break;
                case '-': case '_':
                    setCurrentInterval(p => {
                        const next = Math.min(SLIDESHOW_MAX_INTERVAL_MS, p + SLIDESHOW_INTERVAL_STEP_MS);
                        showFeedback(`Slow Down (${(next / 1000).toFixed(1)}s)`);
                        return next;
                    });
                    break;
                case 'ArrowRight': case 'ArrowUp': triggerSlide(1); break;
                case 'ArrowLeft': case 'ArrowDown': triggerSlide(-1); break;
                case 'Escape': onClose(); break;
                default:
                    if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) onClose();
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
    }, [isActive, onClose, triggerSlide, isPaused]); // dependencies optimized

    return {
        activeIndex,
        nextIndex,
        currentEffect,
        isPortrait,
        currentDuration,
        currentInterval, // Using this derived state for animations if needed
        feedback,
        isPaused,
        direction
    };
}
