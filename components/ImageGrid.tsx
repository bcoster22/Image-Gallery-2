
import React, { useRef } from 'react';
import { ImageInfo } from '../types';
import Spinner from './Spinner';
import { WarningIcon, PlayIcon, CheckCircleIcon, VideoCameraIcon, HeartIcon, ChatBubbleIcon, MoreOptionsIcon } from './icons';

interface ImageGridProps {
  images: ImageInfo[];
  onImageClick: (image: ImageInfo, event: React.MouseEvent) => void;
  analyzingIds: Set<string>;
  generatingIds: Set<string>;
  disabled?: boolean;
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  blurNsfw?: boolean;
  layout?: 'masonry' | 'grid';
}

interface GridItemProps {
  image: ImageInfo;
  onImageClick: (image: ImageInfo, event: React.MouseEvent) => void;
  isAnalyzing: boolean;
  isGeneratingSource: boolean;
  isSelectionMode: boolean;
  isSelected: boolean;
  blurNsfw?: boolean;
  layout?: 'masonry' | 'grid';
}

const GridItem: React.FC<GridItemProps> = ({ image, onImageClick, isAnalyzing, isGeneratingSource, isSelectionMode, isSelected, blurNsfw, layout = 'masonry' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isOfflineVideo = image.isVideo && !image.videoUrl;
  const longPressTimerRef = useRef<number | null>(null);

  // Check if image should be blurred based on NSFW classification
  const shouldBlur = blurNsfw && image.nsfwClassification?.label === 'NSFW';

  // Video Autoplay Observer
  React.useEffect(() => {
    if (!videoRef.current || isSelectionMode || isOfflineVideo) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => { });
          } else {
            videoRef.current?.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    observer.observe(videoRef.current);

    return () => observer.disconnect();
  }, [isSelectionMode, isOfflineVideo]);

  const handleMouseEnter = () => {
    if (videoRef.current && !isSelectionMode) {
      videoRef.current.play().catch(() => { });
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current && !isSelectionMode) {
      videoRef.current.pause();
      // Don't reset time on mouse leave for feed-like behavior, or do?
      // Keeping original behavior:
      videoRef.current.currentTime = 0;
    }
  };

  // Long Press Logic
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSelectionMode) return;
    longPressTimerRef.current = window.setTimeout(() => {
      // Long press triggered
      if (navigator.vibrate) navigator.vibrate(15);
      // Simulate Ctrl+Click
      const syntheticEvent = {
        ...e,
        ctrlKey: true,
        preventDefault: () => { },
        stopPropagation: () => { },
        target: e.target,
      } as unknown as React.MouseEvent;
      onImageClick(image, syntheticEvent);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const isGrid = layout === 'grid';

  // Determine object position
  const objectPosition = layout === 'grid' && image.smartCrop
    ? `${image.smartCrop.x}% ${image.smartCrop.y}%`
    : 'center';

  return (
    <div
      className={`group relative overflow-hidden rounded-lg shadow-lg transition-all duration-300 ${isGrid ? 'aspect-square h-full' : 'break-inside-avoid mb-3 sm:mb-4'} ${isSelectionMode ? 'cursor-pointer' : 'cursor-pointer'} ${isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-indigo-500 scale-95' : ''} ${isSelectionMode && !isSelected ? 'opacity-60 hover:opacity-100' : ''}`}
      onClick={(e) => onImageClick(image, e)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd} // Cancel on scroll/move
    >
      {image.isVideo && image.videoUrl ? (
        <video
          ref={videoRef}
          src={image.videoUrl}
          className={`w-full block transition-transform duration-300 ease-in-out ${isGrid ? 'h-full object-cover' : 'h-auto'} ${!isSelectionMode ? 'group-hover:scale-105' : ''}`}
          style={{ objectPosition }}
          loop
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={image.dataUrl}
          alt={image.fileName}
          className={`w-full block transition-transform duration-300 ease-in-out ${isGrid ? 'h-full object-cover' : 'h-auto'} ${!isSelectionMode ? 'group-hover:scale-105' : ''} ${shouldBlur ? 'blur-xl group-hover:blur-none' : ''}`}
          style={{ objectPosition }}
          loading="lazy"
        />
      )}

      {/* Overlays remain the same */}
      {!isSelectionMode && (
        <>
          <div className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <MoreOptionsIcon className="w-5 h-5 text-white" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-between items-center">
            <div className="flex items-center gap-2 min-w-0">
              {image.authorAvatarUrl && (
                <img src={image.authorAvatarUrl} alt={image.authorName} className="w-6 h-6 rounded-full border border-white/80 flex-shrink-0" />
              )}
              {image.authorName && (
                <p className="text-white text-xs font-semibold truncate">{image.authorName}</p>
              )}
            </div>
            <div className="flex items-center gap-3 text-white text-xs font-medium flex-shrink-0">
              <div className="flex items-center gap-1">
                <HeartIcon className="w-4 h-4" />
                <span>{image.likes ?? 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <ChatBubbleIcon className="w-4 h-4" />
                <span>{image.commentsCount ?? 0}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {image.isVideo && !isSelectionMode && !isOfflineVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-100 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none">
          <PlayIcon className="w-16 h-16 text-white/70 drop-shadow-lg" />
        </div>
      )}

      {isSelected && (
        <div className="absolute inset-0 bg-indigo-700/40 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="bg-white/90 rounded-full p-1 shadow-lg">
            <CheckCircleIcon className="w-8 h-8 text-indigo-700" />
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
          <Spinner />
        </div>
      )}

      {image.isGenerating && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white p-2 text-center z-20">
          <Spinner />
          <p className="text-xs font-semibold mt-2">Creating Video...</p>
        </div>
      )}

      {isGeneratingSource && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white p-2 text-center z-20">
          <Spinner />
          <p className="text-xs font-semibold mt-2">Source for Generation...</p>
        </div>
      )}

      {isOfflineVideo && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-2 text-center pointer-events-none z-20">
          <VideoCameraIcon className="w-8 h-8 mb-1 text-gray-400" />
          <p className="text-xs font-semibold">Video Unavailable</p>
          <p className="text-xs text-gray-500 mt-1">in reloaded session</p>
        </div>
      )}

      {image.analysisFailed && !isAnalyzing && (
        <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center p-2 text-center text-white z-20">
          <WarningIcon className="w-8 h-8 mb-1 text-red-300" />
          <p className="text-xs font-semibold">AI Analysis Failed</p>
          <p className="text-xs text-red-300/80 mt-1">Rate limit, quota, or content policy error.</p>
        </div>
      )}
    </div>
  );
};


interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

import { FixedSizeGrid, GridChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// Helper hook for window dimensions
function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  React.useEffect(() => {
    function handleResize() {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, onImageClick, analyzingIds, generatingIds, disabled, isSelectionMode, selectedIds, onSelectionChange, blurNsfw, layout = 'masonry' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useWindowDimensions(); // This is now only used for initial columnCount, AutoSizer will provide actual width
  const [selectionBox, setSelectionBox] = React.useState<SelectionBox | null>(null);
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Responsive Column Logic
  const getColumnCount = (width: number) => {
    if (width >= 1536) return 8; // 2xl
    if (width >= 1280) return 6; // xl
    if (width >= 1024) return 5; // lg
    if (width >= 768) return 4; // md
    if (width >= 640) return 3; // sm
    return 2; // base
  };

  const padding = 16;
  const gap = 16;

  // Cell Renderer
  const Cell = ({ columnIndex, rowIndex, style, data }: GridChildComponentProps & { data: { columnCount: number, images: ImageInfo[] } }) => {
    const { columnCount, images } = data;
    const index = rowIndex * columnCount + columnIndex;
    if (index >= images.length) return null;

    const image = images[index];

    // Adjust style for gap - react-window gives absolute positioning
    const contentStyle = {
      ...style,
      left: Number(style.left) + (gap / 2), // Distribute gap on left
      top: Number(style.top) + (gap / 2),   // Distribute gap on top
      width: Number(style.width) - gap,     // Shrink width by full gap
      height: Number(style.height) - gap,   // Shrink height by full gap
    };

    return (
      <div style={contentStyle}>
        <div data-id={image.id} className="h-full w-full">
          <GridItem
            image={image}
            onImageClick={onImageClick}
            isAnalyzing={analyzingIds.has(image.id)}
            isGeneratingSource={generatingIds.has(image.id)}
            isSelectionMode={isSelectionMode}
            isSelected={selectedIds.has(image.id)}
            blurNsfw={blurNsfw}
            layout={layout}
          />
        </div>
      </div>
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelectionMode || disabled || !onSelectionChange) return;
    if ((e.target as HTMLElement).closest('button, a, input, video')) return;

    isDragging.current = true;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragStartPos.current = { x, y };
    setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current || !onSelectionChange) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionBox(prev => prev ? { ...prev, currentX: x, currentY: y } : null);

    const boxLeft = Math.min(dragStartPos.current.x, x);
    const boxTop = Math.min(dragStartPos.current.y, y);
    const boxRight = Math.max(dragStartPos.current.x, x);
    const boxBottom = Math.max(dragStartPos.current.y, y);

    // Optimized Box Selection for Virtual Grid?
    // We stick to DOM query since react-window renders visible items.
    const items = containerRef.current.querySelectorAll('[data-id]');
    const idsInBox = new Set<string>();

    items.forEach(item => {
      const itemRect = item.getBoundingClientRect();
      const containerRect = containerRef.current!.getBoundingClientRect();

      const itemLeft = itemRect.left - containerRect.left;
      const itemTop = itemRect.top - containerRect.top;
      const itemRight = itemLeft + itemRect.width;
      const itemBottom = itemTop + itemRect.height;

      if (boxLeft < itemRight && boxRight > itemLeft && boxTop < itemBottom && boxBottom > itemTop) {
        const id = item.getAttribute('data-id');
        if (id) idsInBox.add(id);
      }
    });

    onSelectionChange(idsInBox);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    setSelectionBox(null);
  };

  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setSelectionBox(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`h-[calc(100vh-140px)] w-full ${disabled ? 'pointer-events-none opacity-60' : ''} ${isSelectionMode ? 'select-none' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <AutoSizer>
        {({ height, width }) => {
          const columnCount = getColumnCount(width);
          // itemWidth now includes the gap, so the content inside Cell will subtract the gap
          const itemWidth = (width - padding) / columnCount;
          const rowCount = Math.ceil(images.length / columnCount);

          return (
            <FixedSizeGrid
              columnCount={columnCount}
              columnWidth={itemWidth}
              height={height}
              rowCount={rowCount}
              rowHeight={itemWidth} // Square items
              width={width}
              className="scrollbar-hide"
              style={{ overflowX: 'hidden' }}
              itemData={{ columnCount, images }}
            >
              {Cell}
            </FixedSizeGrid>
          );
        }}
      </AutoSizer>

      {selectionBox && (
        <div
          className="absolute border-2 border-indigo-500 bg-indigo-500/20 z-50 pointer-events-none"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
            position: 'absolute'
          }}
        />
      )}
    </div>
  );
};

export default ImageGrid;
