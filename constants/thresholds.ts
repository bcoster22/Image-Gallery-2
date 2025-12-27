/**
 * Threshold Constants
 * 
 * All comparison values (pixels, percentages, counts) used throughout the application.
 * Following AI Maintainability Framework: Named constants over magic values.
 */

// === Gesture Recognition Thresholds ===
export const WHEEL_SCROLL_THRESHOLD = 30;
export const TAP_MAX_DURATION_MS = 300;
export const TAP_MAX_MOVEMENT_PX = 10;
export const SWIPE_MIN_DISTANCE_PX = 50;

// === Performance Thresholds ===
export const FPS_THRESHOLD_LOW = 30;
export const RENDER_TIME_WARNING_MS = 200;

// === VRAM Thresholds ===
export const VRAM_THRESHOLD_LOW = 60;
export const VRAM_THRESHOLD_BALANCED = 75;
export const VRAM_THRESHOLD_HIGH = 90;

// === Ghost Memory Detection ===
export const GHOST_VRAM_VARIANCE_THRESHOLD_MB = 1500;

// === Image Analysis Thresholds ===
export const TAG_SCORE_THRESHOLD = 0.35;
export const LANDSCAPE_ASPECT_RATIO_THRESHOLD = 1.2;

// === Slideshow Speed Limits ===
export const MIN_SLIDESHOW_INTERVAL_MS = 1000;
export const MAX_SLIDESHOW_INTERVAL_MS = 20000;
