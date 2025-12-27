import { useCallback, useEffect, useRef } from 'react';

export const useSlideshow = (
    nextImage: () => void,
    isActive: boolean,
    delay: number,
    isLoading: boolean,
    isVideo: boolean,
    navigationImagesLength: number
) => {
    const slideshowTimerRef = useRef<number | null>(null);
    const isFirstSlideshowActivationRef = useRef(true);

    const startSlideshowLoop = useCallback(() => {
        if (navigationImagesLength <= 1 || isLoading || isVideo || !isActive) return;
        nextImage();
        // Use fixed delay from state
        slideshowTimerRef.current = window.setTimeout(startSlideshowLoop, delay);
    }, [nextImage, navigationImagesLength, isLoading, isVideo, isActive, delay]);

    const resetInactivityTimer = useCallback(() => {
        if (slideshowTimerRef.current) clearTimeout(slideshowTimerRef.current);

        if (isLoading || isVideo || !isActive) {
            // Reset first activation flag when slideshow is turned off
            isFirstSlideshowActivationRef.current = true;
            return;
        }

        // Add 2 second initial delay ONLY on first activation
        const initialDelay = isFirstSlideshowActivationRef.current ? 2000 : 0;
        slideshowTimerRef.current = window.setTimeout(startSlideshowLoop, delay + initialDelay);

        // Mark that we've had the first activation
        isFirstSlideshowActivationRef.current = false;
    }, [startSlideshowLoop, isLoading, isVideo, isActive, delay]);

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

    return {
        resetInactivityTimer
    };
};
