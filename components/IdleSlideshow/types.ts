import { ImageInfo } from '../../types';

export type TransitionType = 'fade' | 'cross-fade' | 'slide' | 'zoom' | 'ken-burns' | 'cube' | 'stack' | 'random' | 'parallax';

export interface IdleSlideshowProps {
    images: ImageInfo[];
    isActive: boolean;
    onClose: () => void;
    transition?: TransitionType;
    useSmartCrop?: boolean;
    useAdaptivePan?: boolean;
    processingSmartCropIds?: Set<string>;
    interval?: number;
    animationDuration?: number;
    enableBounce?: boolean;
    randomOrder?: boolean;
    onRequestSlowdown?: (shouldSlow: boolean) => void;
}
