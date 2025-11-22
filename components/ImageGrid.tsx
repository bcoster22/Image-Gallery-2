
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
}

interface GridItemProps {
  image: ImageInfo;
  onImageClick: (image: ImageInfo, event: React.MouseEvent) => void;
  isAnalyzing: boolean;
  isGeneratingSource: boolean;
  isSelectionMode: boolean;
  isSelected: boolean;
}

const GridItem: React.FC<GridItemProps> = ({ image, onImageClick, isAnalyzing, isGeneratingSource, isSelectionMode, isSelected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isOfflineVideo = image.isVideo && !image.videoUrl;

  const handleMouseEnter = () => {
    if (videoRef.current && !isSelectionMode) {
      videoRef.current.play().catch(error => {
        // Autoplay was prevented by browser policy
        console.warn("Video autoplay prevented:", error);
      });
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current && !isSelectionMode) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-lg shadow-lg transition-all duration-300 break-inside-avoid mb-3 sm:mb-4 ${isSelectionMode ? 'cursor-pointer' : 'cursor-pointer'} ${isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-indigo-500 scale-95' : ''} ${isSelectionMode && !isSelected ? 'opacity-60 hover:opacity-100' : ''}`}
      onClick={(e) => onImageClick(image, e)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {image.isVideo && image.videoUrl ? (
        <video
          ref={videoRef}
          src={image.videoUrl}
          className={`w-full h-auto block transition-transform duration-300 ease-in-out ${!isSelectionMode ? 'group-hover:scale-105' : ''}`}
          loop
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={image.dataUrl}
          alt={image.fileName}
          className={`w-full h-auto block transition-transform duration-300 ease-in-out ${!isSelectionMode ? 'group-hover:scale-105' : ''}`}
          loading="lazy"
        />
      )}
      
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


const ImageGrid: React.FC<ImageGridProps> = ({ images, onImageClick, analyzingIds, generatingIds, disabled, isSelectionMode, selectedIds }) => {
  return (
    <div className={`columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 2xl:columns-8 gap-3 sm:gap-4 ${disabled ? 'pointer-events-none opacity-60 transition-opacity' : ''}`}>
      {images.map((image) => (
        <GridItem
          key={image.id}
          image={image}
          onImageClick={onImageClick}
          isAnalyzing={analyzingIds.has(image.id)}
          isGeneratingSource={generatingIds.has(image.id)}
          isSelectionMode={isSelectionMode}
          isSelected={selectedIds.has(image.id)}
        />
      ))}
    </div>
  );
};

export default ImageGrid;
