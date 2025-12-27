import React, { useRef } from 'react';
import { XMarkIcon as CloseIcon } from '@heroicons/react/24/outline';
import Spinner from '../Spinner';
import { ImageInfo } from '../../types';

interface ZoomPanCanvasProps {
    currentImage: ImageInfo;
    isVideo: boolean;
    isOfflineVideo: boolean;
    isLoading: boolean;
    error: string | null;
    isSmartFilled: boolean;
    isFullscreen: boolean;
    onClose: () => void;
    onContainerClick: () => void; // Handles mode cycling (carousel/fullscreen/details)
    onNext: () => void;
    onPrev: () => void;
    children?: React.ReactNode;
}

export const ZoomPanCanvas: React.FC<ZoomPanCanvasProps> = ({
    currentImage,
    isVideo,
    isOfflineVideo,
    isLoading,
    error,
    isSmartFilled,
    isFullscreen,
    onClose,
    onContainerClick,
    onNext,
    onPrev,
    children
}) => {
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);
    const isDraggingRef = useRef(false);

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
            onContainerClick();
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
                onPrev();
            } else {
                onNext();
            }
        } else {
            // Treat as a click if not a swipe
            isDraggingRef.current = false;
            onContainerClick();
        }

        touchStartRef.current = null;
        isDraggingRef.current = false;
    };

    return (
        <div
            className={`relative w-full h-full flex flex-col items-center justify-center ${isSmartFilled ? '' : 'p-4'}`}
            style={{ touchAction: 'none' }}
            onClick={(e) => e.stopPropagation()} // Prevent bubble to backdrop
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

                {children}

                {error && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md p-3 bg-red-800/80 text-white rounded-lg text-center text-sm z-20">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};
