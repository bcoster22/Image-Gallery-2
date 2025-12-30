import React from 'react';
import {
  DEFAULT_SLIDESHOW_INTERVAL_MS,
  DEFAULT_ANIMATION_DURATION_MS
} from '../constants/timings';
import { IdleSlideshowProps } from './IdleSlideshow/types';
import { useSlideshowLogic } from '../hooks/useSlideshowLogic';
import { SlideshowLayer } from './IdleSlideshow/SlideshowLayer';

const IdleSlideshow: React.FC<IdleSlideshowProps> = ({
  images, isActive, onClose,
  transition = 'cross-fade' as const,
  useSmartCrop = false,
  useAdaptivePan = false,
  processingSmartCropIds,
  interval = DEFAULT_SLIDESHOW_INTERVAL_MS,
  animationDuration = DEFAULT_ANIMATION_DURATION_MS,
  enableBounce = false,
  randomOrder = false
}) => {

  const {
    activeIndex,
    nextIndex,
    direction,
    currentEffect,
    currentDuration,
    currentInterval,
    feedback,
    isPortrait
  } = useSlideshowLogic({
    images,
    isActive,
    onClose,
    transition,
    interval,
    animationDuration,
    randomOrder,
    useAdaptivePan
  });

  if (!isActive) return null;

  return (
    <SlideshowLayer
      images={images}
      activeIndex={activeIndex}
      nextIndex={nextIndex}
      direction={direction}
      currentEffect={currentEffect}
      currentDuration={currentDuration}
      currentInterval={currentInterval}
      isPortrait={isPortrait}
      useAdaptivePan={useAdaptivePan}
      useSmartCrop={useSmartCrop}
      processingSmartCropIds={processingSmartCropIds}
      enableBounce={enableBounce}
      feedback={feedback}
      onClose={onClose}
    />
  );
};

export default IdleSlideshow;