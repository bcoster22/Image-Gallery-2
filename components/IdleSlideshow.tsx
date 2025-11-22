import React, { useState, useEffect, useRef } from 'react';
import { ImageInfo } from '../types';
import { CloseIcon } from './icons';

interface IdleSlideshowProps {
  images: ImageInfo[];
  isActive: boolean;
  onClose: () => void;
}

const IdleSlideshow: React.FC<IdleSlideshowProps> = ({ images, isActive, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(true);
  const timerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive) {
      const closeOnInteraction = () => onClose();
      const options = { once: true, passive: true };
      window.addEventListener('mousemove', closeOnInteraction, options);
      window.addEventListener('mousedown', closeOnInteraction, options);
      window.addEventListener('keydown', closeOnInteraction, options);
      return () => {
        window.removeEventListener('mousemove', closeOnInteraction);
        window.removeEventListener('mousedown', closeOnInteraction);
        window.removeEventListener('keydown', closeOnInteraction);
      };
    }
  }, [isActive, onClose]);
  
  // Effect for the initial fade-in when the slideshow starts
  useEffect(() => {
    if (isActive) {
      setIsFading(true);
      const fadeInTimer = setTimeout(() => setIsFading(false), 100);
      return () => clearTimeout(fadeInTimer);
    } else {
        setCurrentIndex(0); // Reset index when slideshow closes
    }
  }, [isActive]);

  // Main slideshow loop effect
  useEffect(() => {
    const clearTimers = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };

    if (isActive && images.length > 1) {
        const randomDelay = 4000 + Math.random() * 5000;
        timerRef.current = window.setTimeout(() => {
            setIsFading(true); // Start fade-out

            transitionTimerRef.current = window.setTimeout(() => {
                setCurrentIndex(prev => (prev + 1) % images.length);
                setIsFading(false); // Start fade-in of new image
            }, 1000); // Must match CSS transition duration
        }, randomDelay);

        return clearTimers;
    }
    
    return clearTimers;

  }, [isActive, currentIndex, images.length]);


  if (!isActive || images.length === 0) {
    return null;
  }
  
  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center animate-fade-in-slow">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 text-white/70 hover:text-white transition-colors"
      >
        <CloseIcon className="w-8 h-8" />
      </button>

      <div className="w-full h-full">
        {currentImage && !currentImage.isVideo && (
            <img
                key={currentImage.id}
                src={currentImage.dataUrl}
                alt={currentImage.fileName || ''}
                className={`w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
            />
        )}
      </div>

      <style>{`
        @keyframes fade-in-slow {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in-slow {
          animation: fade-in-slow 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default IdleSlideshow;