import React, { useRef, useEffect, useCallback } from 'react';
import { ThumbnailStripProps } from './ImageViewer.types';

export const ThumbnailStrip: React.FC<ThumbnailStripProps> = ({
    images, currentIndex, onSelect, settings, currentUser, isVisible
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Scroll active thumbnail into view
    useEffect(() => {
        if (containerRef.current && currentIndex >= 0 && isVisible) {
            const container = containerRef.current;
            const activeThumb = container.children[currentIndex] as HTMLElement;

            if (activeThumb) {
                const containerLeft = container.getBoundingClientRect().left;
                const activeLeft = activeThumb.getBoundingClientRect().left;
                const scrollOffset = activeLeft - containerLeft - (container.clientWidth / 2) + (activeThumb.clientWidth / 2);

                container.scrollBy({ left: scrollOffset, behavior: 'smooth' });
            }
        }
    }, [currentIndex, isVisible]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (containerRef.current) {
            e.stopPropagation();
            containerRef.current.scrollLeft += e.deltaY;
        }
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className="absolute bottom-16 lg:bottom-6 left-0 w-full z-30 animate-fade-in-up mask-image-linear-to-r"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div
                ref={containerRef}
                onWheel={handleWheel}
                className="flex gap-2 overflow-x-auto scrollbar-none w-full px-4 transition-all duration-300"
                style={{
                    scrollBehavior: 'smooth',
                    maxWidth: '100%',
                    '--thumb-hover-scale': currentUser?.thumbnailHoverScale ?? settings?.appearance?.thumbnailHoverScale ?? 1.2
                } as React.CSSProperties}
            >
                {
                    images.map((img, index) => {
                        const baseSize = currentUser?.thumbnailSize ?? settings?.appearance?.thumbnailSize ?? 40;
                        const aspectRatio = 3 / 5;
                        const activeHeight = Math.round(baseSize * 1.4);
                        const currentHeight = currentIndex === index ? activeHeight : baseSize;
                        const currentWidth = Math.round(currentHeight * aspectRatio);

                        return (
                            <button
                                key={img.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(index);
                                }}
                                className={`flex-shrink-0 relative group transition-all duration-300 ${currentIndex === index ? 'z-10' : 'opacity-60 hover:opacity-100 hover:z-10'}`}
                                style={{
                                    width: `${currentWidth}px`,
                                    height: `${currentHeight}px`,
                                }}
                            >
                                <img
                                    src={img.dataUrl}
                                    alt={img.fileName}
                                    className={`w-full h-full object-cover rounded-md shadow-md transition-transform duration-300 ${currentIndex === index ? 'ring-2 ring-white scale-105' : 'group-hover:scale-110'}`}
                                />
                            </button>
                        );
                    })
                }
            </div>
        </div>
    );
}
