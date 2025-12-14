
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
  onDragEnd?: (e: React.DragEvent) => void;
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
  onDragEnd?: (e: React.DragEvent) => void;
  onDragStartSelection?: () => void;
  getDragPreviews?: () => ImageInfo[];
}

const GridItem: React.FC<GridItemProps> = ({ image, onImageClick, isAnalyzing, isGeneratingSource, isSelectionMode, isSelected, blurNsfw, layout = 'masonry', onDragEnd, onDragStartSelection, getDragPreviews }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isOfflineVideo = image.isVideo && !image.videoUrl;
  const longPressTimerRef = useRef<number | null>(null);
  const ignoreClickRef = useRef(false);

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

  // Drag Logic
  const handleDragStart = (e: React.DragEvent) => {
    if (!isSelectionMode) {
      e.preventDefault();
      return;
    }

    // Auto-select if dragging an unselected item
    if (!isSelected && onDragStartSelection) {
      onDragStartSelection();
    }

    // Allow dragging out
    e.dataTransfer.effectAllowed = 'copy';
    // using a custom type prevents the OS from creating a text clipping
    e.dataTransfer.setData('application/x-gallery-item', image.id);

    // CUSTOM GHOST IMAGE LOGIC
    if (getDragPreviews && isSelectionMode) {
      const previews = getDragPreviews();
      // Only create stack if we have multiple items or if we want to customize the single item drag too
      // User asked for "stack say upto 6 images", implying stack mainly for multiple.

      if (previews.length > 0) {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        // Z-index high to ensure it renders on top if visible, but it's offscreen
        // Actually setDragImage requires element to be visible?
        // It needs to be in DOM, but can be offscreen.

        // Container visual style
        container.style.width = '120px'; // Thumbnail size for drag
        container.style.height = '120px';

        // Stack items
        previews.slice(0, 6).forEach((img, i) => {
          const div = document.createElement('div');
          div.style.position = 'absolute';
          div.style.width = '100%';
          div.style.height = '100%';
          div.style.borderRadius = '8px';
          div.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)';
          div.style.overflow = 'hidden';
          div.style.backgroundColor = '#1f2937'; // gray-800
          div.style.border = '2px solid white';

          // Stack offset logic
          // Reverse index so first item is on top? Or last item on top?
          // Usually the item being dragged (under cursor) should be visible or the stack should look like a pile.
          // Let's create a "deck" look.
          const offset = i * 4;
          div.style.top = `${offset}px`;
          div.style.left = `${offset}px`;
          // Simple rotation for messiness?
          // div.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
          // Clean stack is better for UI.

          const imgEl = document.createElement('img');
          imgEl.src = img.dataUrl;
          imgEl.style.width = '100%';
          imgEl.style.height = '100%';
          imgEl.style.objectFit = 'cover';

          div.appendChild(imgEl);

          // We want index 0 (the dragged item usually, or first selected) to be on TOP?
          // z-index: (6 - i)
          div.style.zIndex = (6 - i).toString();

          container.appendChild(div);
        });

        // Badge for count
        if (previews.length > 1) {
          const badge = document.createElement('div');
          badge.textContent = previews.length.toString();
          badge.style.position = 'absolute';
          badge.style.top = '-8px';
          badge.style.right = '-8px';
          badge.style.background = '#ef4444'; // red-500
          badge.style.color = 'white';
          badge.style.fontWeight = 'bold';
          badge.style.borderRadius = '9999px';
          badge.style.width = '24px';
          badge.style.height = '24px';
          badge.style.display = 'flex';
          badge.style.alignItems = 'center';
          badge.style.justifyContent = 'center';
          badge.style.fontSize = '12px';
          badge.style.zIndex = '20';
          badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
          container.appendChild(badge);
        }

        document.body.appendChild(container);
        e.dataTransfer.setDragImage(container, 60, 60); // Center grab

        // Cleanup
        setTimeout(() => {
          document.body.removeChild(container);
        }, 0);
      }
    }
  };

  // Long Press Logic
  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent) => {
    // REMOVED: if (isSelectionMode) return;
    // Allowing long press even in selection mode for consistent UX (user requested "hard to select next images")

    // For Mouse events, ensure it's the left button (button 0)
    if ('button' in e && e.button !== 0) return;

    ignoreClickRef.current = false; // Reset to be safe

    longPressTimerRef.current = window.setTimeout(() => {
      // Long press triggered
      if (navigator.vibrate) navigator.vibrate(15);

      // Raise flag to ignore the subsequent click event
      ignoreClickRef.current = true;

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

  const handleTouchStart = (e: React.TouchEvent) => handleLongPressStart(e);
  const handleMouseDown = (e: React.MouseEvent) => handleLongPressStart(e);

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Intercept click to prevent double-toggle if long press occurred
  const handleClick = (e: React.MouseEvent) => {
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false;
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    onImageClick(image, e);
  };

  const isGrid = layout === 'grid';

  // Determine object position
  const objectPosition = layout === 'grid' && image.smartCrop
    ? `${image.smartCrop.x}% ${image.smartCrop.y}%`
    : 'center';

  return (
    <div
      className={`group relative overflow-hidden rounded-lg shadow-lg transition-all duration-300 ${isGrid ? 'aspect-square h-full' : 'break-inside-avoid mb-3 sm:mb-4'} ${isSelectionMode ? 'cursor-pointer' : 'cursor-pointer'} ${isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-indigo-500 scale-95' : ''} ${isSelectionMode && !isSelected ? 'opacity-60 hover:opacity-100' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={(e) => {
        handleMouseLeave();
        handleLongPressEnd();
        ignoreClickRef.current = false;
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleLongPressEnd}
      onTouchMove={() => {
        handleLongPressEnd();
        ignoreClickRef.current = false;
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        handleMouseDown(e);
      }}
      onMouseUp={handleLongPressEnd}
      draggable={isSelectionMode}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
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
          <p className="text-xs text-red-300/80 mt-1 px-1 line-clamp-3" title={image.analysisError}>{image.analysisError || "Rate limit, quota, or content policy error."}</p>
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


import { VirtuosoGrid } from 'react-virtuoso';
import styled from '@emotion/styled';

// Styled components for VirtuosoGrid
const ItemContainer = styled.div`
  padding: 8px;
  width: 50%;
  display: flex;
  flex: none;
  align-content: stretch;
  box-sizing: border-box;

  @media (min-width: 640px) { width: 33.333%; }
  @media (min-width: 768px) { width: 25%; }
  @media (min-width: 1024px) { width: 20%; }
  @media (min-width: 1280px) { width: 16.666%; }
  @media (min-width: 1536px) { width: 12.5%; }
`;

const ListContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

// Styled components for Masonry Layout
const MasonryListContainer = styled('div')`
  padding: 0 8px;
  column-count: 2;
  column-gap: 16px;

  @media (min-width: 640px) { column-count: 3; }
  @media (min-width: 768px) { column-count: 4; }
  @media (min-width: 1024px) { column-count: 5; }
  @media (min-width: 1280px) { column-count: 6; }
  @media (min-width: 1536px) { column-count: 8; }
` as any;

const MasonryItemContainer = styled('div')`
  break-inside: avoid;
  margin-bottom: 16px;
  -webkit-column-break-inside: avoid;
  page-break-inside: avoid;
  width: 100%;
` as any;

const ImageGrid: React.FC<ImageGridProps> = ({ images, onImageClick, analyzingIds, generatingIds, disabled, isSelectionMode, selectedIds, onSelectionChange, blurNsfw, layout = 'masonry', onDragEnd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectionBox, setSelectionBox] = React.useState<SelectionBox | null>(null);
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

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

    // Simple box accumulation logic if strictly needed, but might be tricky with Virtualization.
    // For now, let's keep the box UI but the selection logic might need to be "select visible currently"
    const boxLeft = Math.min(dragStartPos.current.x, x);
    const boxTop = Math.min(dragStartPos.current.y, y);
    const boxRight = Math.max(dragStartPos.current.x, x);
    const boxBottom = Math.max(dragStartPos.current.y, y);

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


  /* 
     VirtuosoGrid doesn't support CSS Masonry (column-count) because virtualization 
     conflicts with the browser's column layout algorithm when items are removed from the top.
     For 'masonry' layout, we use standard CSS columns. 
     For 'grid' layout, we use VirtuosoGrid for performance.
  */

  // Helper to ensure item is selected when dragging starts
  const ensureSelected = (id: string) => {
    if (!selectedIds.has(id) && onSelectionChange) {
      const newSet = new Set(selectedIds);
      newSet.add(id);
      onSelectionChange(newSet);
    }
  };

  const renderMasonry = () => (
    <div
      className={`h-[calc(100vh-140px)] w-full overflow-y-auto px-2 scrollbar-none ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      ref={containerRef as any}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <MasonryListContainer>
        {images.map((image) => (
          <MasonryItemContainer key={image.id} data-id={image.id}>
            <GridItem
              image={image}
              onImageClick={onImageClick}
              isAnalyzing={analyzingIds.has(image.id)}
              isGeneratingSource={generatingIds.has(image.id)}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(image.id)}
              blurNsfw={blurNsfw}
              layout="masonry"
              onDragEnd={onDragEnd}
              onDragStartSelection={() => ensureSelected(image.id)}
            />
          </MasonryItemContainer>
        ))}
      </MasonryListContainer>
      {/* Helper for selection box absolute positioning context */}
      {selectionBox && (
        <div
          className="fixed border-2 border-indigo-500 bg-indigo-500/20 z-50 pointer-events-none"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
          }}
        />
      )}
    </div>
  );

  if (layout === 'masonry') {
    return renderMasonry();
  }

  // Grid Layout - Virtualized
  return (
    <div
      ref={containerRef}
      className={`h-[calc(100vh-140px)] w-full ${disabled ? 'pointer-events-none opacity-60' : ''} ${isSelectionMode ? 'select-none' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <VirtuosoGrid
        className="scrollbar-none"
        style={{ height: '100%', width: '100%' }}
        totalCount={images.length}
        components={{
          Item: ItemContainer,
          List: ListContainer,
        }}
        itemContent={(index) => {
          const image = images[index];
          return (
            <div data-id={image.id} className="aspect-square h-full w-full">
              <GridItem
                image={image}
                onImageClick={onImageClick}
                isAnalyzing={analyzingIds.has(image.id)}
                isGeneratingSource={generatingIds.has(image.id)}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(image.id)}
                blurNsfw={blurNsfw}
                layout="grid"
                onDragEnd={onDragEnd}
                onDragStartSelection={() => ensureSelected(image.id)}
              />
            </div>
          );
        }}
      />

      {selectionBox && (
        <div
          className="absolute border-2 border-indigo-500 bg-indigo-500/20 z-50 pointer-events-none"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
          }}
        />
      )}
    </div>
  );
};

export default ImageGrid;
