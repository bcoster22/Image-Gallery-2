
import { HarmBlockThreshold } from "@google/genai";

export type AiProvider = 'gemini' | 'openai' | 'grok' | 'moondream_cloud' | 'moondream_local' | 'comfyui';
export type GalleryView = 'public' | 'my-gallery' | 'creations' | 'prompt-history' | 'status' | 'admin-settings' | 'profile-settings' | 'duplicates';

export interface ProviderCapabilities {
  vision: boolean;
  generation: boolean;
  animation: boolean;
  editing: boolean;
  textGeneration: boolean;
  captioning: boolean; // For robust natural language descriptions (e.g., JoyCaption, Gemini)
  tagging: boolean; // For keyword extraction (e.g., WD14, Moondream)
}

export type Capability = keyof ProviderCapabilities;

/**
 * Interface for all AI Providers.
 * This ensures a consistent API for the AI Service to consume.
 */
export interface IAiProvider {
  readonly id: AiProvider;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  /**
   * Validates if the provider is correctly configured in the settings.
   */
  validateConfig(settings: AdminSettings): boolean;

  /**
   * Tests the connection to the provider.
   */
  testConnection?(settings: AdminSettings): Promise<void>;

  // --- Capabilities ---

  /**
   * Analyzes an image and returns keywords and a recreation prompt.
   * Required for 'vision' capability.
   */
  analyzeImage?(
    image: ImageInfo,
    settings: AdminSettings,
    onStatus?: (message: string) => void
  ): Promise<ImageAnalysisResult>;

  /**
   * Detects the main subject in an image and returns its center coordinates.
   * Required for 'vision' capability.
   */
  /**
   * Generates a natural language caption for an image.
   * Required for 'captioning' capability.
   */
  captionImage?(
    image: ImageInfo,
    settings: AdminSettings
  ): Promise<string>;

  /**
   * Generates a list of tags/keywords for an image.
   * Required for 'tagging' capability.
   */
  tagImage?(
    image: ImageInfo,
    settings: AdminSettings
  ): Promise<string[]>;

  detectSubject?(image: ImageInfo, settings: AdminSettings): Promise<{ x: number, y: number }>; // Returns center coordinates (0-100)

  /**
   * Generates an image from a text prompt.
   * Required for 'generation' capability.
   */
  generateImageFromPrompt?(
    prompt: string,
    aspectRatio: AspectRatio,
    sourceImage: ImageInfo | undefined,
    settings: AdminSettings
  ): Promise<GenerationResult>;

  /**
   * Animates a static image or generates a video from prompt.
   * Required for 'animation' capability.
   */
  animateImage?(
    image: ImageInfo | null,
    prompt: string,
    aspectRatio: AspectRatio,
    settings: AdminSettings
  ): Promise<{ uri: string; apiKey: string }>;

  /**
   * Edits an existing image based on a prompt.
   * Required for 'editing' capability.
   */
  editImage?(
    image: ImageInfo,
    prompt: string,
    strength: number | undefined,
    settings: AdminSettings
  ): Promise<GenerationResult>;

  /**
   * Generates keywords for a given prompt.
   * Part of 'textGeneration' capability.
   */
  generateKeywordsForPrompt?(
    prompt: string,
    settings: AdminSettings
  ): Promise<string[]>;

  /**
   * Enhances a prompt using provided keywords.
   * Part of 'textGeneration' capability.
   */
  enhancePromptWithKeywords?(
    prompt: string,
    keywords: string[],
    settings: AdminSettings
  ): Promise<string>;

  /**
   * Adapts a prompt to a specific theme.
   * Part of 'textGeneration' capability.
   */
  adaptPrompt?(
    originalPrompt: string,
    theme: string,
    settings: AdminSettings
  ): Promise<string>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  bannerUrl?: string; // URL for the custom background banner
  bannerPosition?: {
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    scale: number; // Zoom level (e.g., 1 to 3)
  };
  galleryLayout?: 'masonry' | 'grid';
  slideshowTransition?: 'fade' | 'cross-fade' | 'slide' | 'zoom' | 'ken-burns' | 'cube' | 'stack' | 'random' | 'parallax';
  slideshowSmartCrop?: boolean;
  slideshowAdaptivePan?: boolean;
  slideshowInterval?: number;          // ms
  slideshowAnimationDuration?: number; // ms
  slideshowBounce?: boolean;
  slideshowRandomOrder?: boolean;
  thumbnailSize?: number;
  thumbnailHoverScale?: number;
  disableSmartCropNotifications?: boolean;
  autoSaveToGallery?: boolean; // Control if creations appear in My Gallery automatically
}

export interface GeminiSafetySettings {
  harassment: HarmBlockThreshold;
  hateSpeech: HarmBlockThreshold;
  sexuallyExplicit: HarmBlockThreshold;
  dangerousContent: HarmBlockThreshold;
}

// Deprecated: Kept for migration purposes
export interface AppSettings {
  provider: string;
  geminiApiKey: string | null;
  openaiApiKey: string | null;
  grokApiKey: string | null;
  moondreamEndpoint: string | null;
  moondreamApiKey: string | null;
  geminiGenerationModel: string | null;
  openaiGenerationModel: string | null;
  grokGenerationModel: string | null;
  geminiVeoModel: string | null;
  geminiSafetySettings: GeminiSafetySettings | null;
}

// New V2 Admin Settings Structure
export interface PromptStep {
  id: string;
  name: string;
  prompt: string;
  status: string;
}

export interface PromptStrategy {
  id: string;
  name: string;
  description: string;
  steps: PromptStep[];
}

export interface AdminSettings {
  providers: {
    gemini: {
      apiKey: string | null;
      generationModel: string | null;
      veoModel: string | null;
      safetySettings: GeminiSafetySettings | null;
    };
    grok: {
      apiKey: string | null;
      generationModel: string | null;
    };
    moondream_cloud: {
      apiKey: string | null;
    };
    moondream_local: {
      endpoint: string | null;
      model: string | null;
      captionModel: string | null;
      taggingModel: string | null;
    };
    openai: {
      apiKey: string | null;
      generationModel: string | null;
      textGenerationModel: string | null;
      organizationId: string | null;
      projectId: string | null;
    };
    comfyui: {
      mode: 'local' | 'hosted';
      endpoint: string | null;
      apiKey: string | null;
    };
  };
  routing: Record<Capability, AiProvider[]>;
  performance: {
    downscaleImages: boolean;
    maxAnalysisDimension: number;
    vramUsage: 'high' | 'balanced' | 'low';
  };
  prompts: {
    assignments: Record<string, string>; // providerId -> strategyId
    strategies: PromptStrategy[];
  };
  contentSafety: {
    enabled: boolean;
    autoClassify: boolean; // Run NSFW check automatically
    threshold: number; // 0-100, confidence threshold for NSFW
    nsfwKeyword: string; // Customizable keyword (default: "NSFW")
    sfwKeyword: string; // Customizable keyword (default: "SFW")
    blurNsfw: boolean; // Blur NSFW images in gallery
    showConfidence: boolean; // Show confidence scores in UI
    useSingleModelSession: boolean; // When true, keeps one model loaded for speed
  };
  appearance: {
    thumbnailSize: number; // Default 40
    thumbnailHoverScale: number; // Default 1.2
  };
}


export interface ImageInfo {
  id: string;
  file: File;
  fileName: string;
  displayName?: string;
  dataUrl: string;
  keywords?: string[];
  recreationPrompt?: string;
  originalMetadataPrompt?: string; // Prompt extracted from file metadata (e.g. PNG chunks)
  width?: number;
  height?: number;
  aspectRatio?: string;
  dHash?: string; // Perceptual difference hash
  analysisFailed?: boolean;
  analysisError?: string; // Specific error message from provider
  ownerId?: string;
  isPublic?: boolean;
  isVideo?: boolean;
  videoUrl?: string; // Blob URL
  isGenerating?: boolean;
  source?: 'upload' | 'generated' | 'enhanced' | 'video' | 'prompt';
  savedToGallery?: boolean; // If true, explicitly shown in My Gallery. If undefined, legacy behavior (uploads=true)
  // New fields for Civitai-style cards
  authorName?: string;
  authorAvatarUrl?: string;
  likes?: number;
  commentsCount?: number;
  smartCrop?: { x: number; y: number }; // Center position in percentages (0-100)
  // NSFW Classification
  nsfwClassification?: {
    label: 'NSFW' | 'SFW' | 'Unknown';
    score: number; // 0-1
    confidence: number; // 0-100 (percentage)
    predictions?: Array<{ label: string; score: number }>;
    lastChecked?: number; // timestamp
  };
  generationMetadata?: {
    provider?: string;
    model?: string;
    steps?: number;
    cfg?: number;
    seed?: number;
    sampler?: string;
    scheduler?: string;
    loras?: string[];
  };
}

export interface GenerationTask {
  id: string;
  type: 'video' | 'image' | 'enhance';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  sourceImageId?: string;
  sourceImageName?: string;
  prompt: string;
  error?: string;
}

export interface Notification {
  id: string;
  status: 'processing' | 'success' | 'error';
  message: string;
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

// Types for the new Status Page
export interface ServiceStatus {
  id: string;
  name: string;
  statusPct: number;
  latencyMs?: number;
  lastCheck: string; // ISO
  history: Array<0 | 1>; // newest last
}

export interface StatusGroup {
  name: string;
  services: ServiceStatus[];
}

export interface StatusPayload {
  overall: "operational" | "degraded" | "partial_outage" | "major_outage";
  updatedAt: string;
  refreshSec: number;
  groups: StatusGroup[];
}

export interface UploadProgress {
  current: number;
  total: number;
  eta: number; // in seconds
  speed: number; // in MB/s
  fileName: string;
}

export interface AnalysisProgress {
  current: number;
  total: number;
  fileName: string;
}
export interface ImageAnalysisStats {
  tokensPerSec: number;
  device: 'CPU' | 'GPU';
  totalTokens?: number;
  duration?: number;
}

export interface ProviderStats {
  duration: number; // in seconds
  totalTokens?: number;
  tokensPerSec?: number;
  cost?: number;
  device?: string; // e.g., 'GPU', 'CPU'
}

export interface ImageAnalysisResult {
  keywords: string[];
  recreationPrompt: string;
  stats?: ProviderStats;
  nsfwClassification?: {
    label: 'NSFW' | 'SFW' | 'Unknown';
    score: number;
    confidence: number;
    predictions?: Array<{ label: string; score: number }>;
    lastChecked?: number;
  };
}

export interface GenerationResult {
  image: string; // base64 data URL or remote URL
  stats?: ProviderStats;
  metadata?: any;
}

// Advanced Generation Settings (for text/image to image)
export interface GenerationSettings {
  provider: AiProvider;
  model: string; // e.g., 'sdxl-realism', 'flux-dev'
  steps: number; // 1-150, optimal 28-35
  denoise: number; // 0-100%, for img2img how much to change
  cfg_scale: number; // 0-20, guidance scale, optimal 6-8
  seed: number; // -1 for random
  width?: number; // Output width (if not using aspect ratio)
  height?: number; // Output height (if not using aspect ratio)
}

// AI Model Settings for Restoration (2025 Best Practices)
export interface AIModelSettings {
  model: 'sdxl' | 'sdxl-lightning' | 'flux' | 'flux-schnell'; // Model type
  steps: number; // 8-50, recommended 28-35
  cfg_scale: number; // 0.0-16.0, recommended 6.0-8.0 for img2img
  denoise_strength: number; // 0-100%, recommended 25-35% for restoration
  enhancement_prompt?: string; // Complementary prompt (not descriptive)
  negative_prompt?: string; // What to avoid
  seed?: number; // -1 for random, or specific seed for reproducibility
  // Upscale specific
  target_megapixels?: number; // 2 to 42
  tiled?: boolean; // For low VRAM
  provider?: AiProvider;
}

// Upscale Settings (for image enhancement)
export interface UpscaleSettings {
  provider: AiProvider;
  model: string; // e.g., 'real-esrgan-x4plus', 'sd-upscale'
  method: 'esrgan' | 'real-esrgan' | 'latent' | 'sd-upscale';
  targetMegapixels: 2 | 4 | 6 | 8 | 16 | 24 | 32 | 42; // Target output resolution in megapixels
  tiled: boolean; // Enable tiling for low VRAM GPUs
  tile_size: 512 | 1024; // Tile size in pixels
  tile_overlap: 8 | 16 | 32; // Overlap to avoid seams
  denoise: number; // 0-100%, for SD upscale method
  steps?: number; // For SD upscale method
}

// Preset for saving/loading settings
export interface GenerationPreset {
  id: string;
  name: string;
  taskType: 'img2img' | 'txt2img' | 'upscale';
  generation?: GenerationSettings;
  upscale?: UpscaleSettings;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

// Queue Types
export type JobTaskType = 'analysis' | 'smart-crop' | 'generate' | 'upload' | 'video' | 'other';

export interface ActiveJob {
  id: string;
  fileName: string;
  size: number; // in bytes
  startTime: number;
  taskType?: JobTaskType;
}


// Queue Priority Levels (higher number = more urgent)
export enum QueuePriority {
  BACKGROUND = 0,      // Background batch processing (user closed modal)
  PRELOAD = 1,         // Slideshow preload, "Smart fit to screen" - UX optimization
  INTERACTIVE = 2,     // Generation Studio open - user actively watching
  IMMEDIATE = 3        // User explicitly waiting (regenerate caption, view-specific tasks)
}

export interface QueueItem {
  id: string;
  taskType: JobTaskType;
  fileName: string; // For display
  addedAt: number;
  priority?: QueuePriority; // Semantic priority level
  // Specific data for the task
  data: {
    // For analysis
    image?: ImageInfo;
    // For generation
    prompt?: string;
    aspectRatio?: AspectRatio;
    sourceImage?: ImageInfo;
    generationSettings?: GenerationSettings; // Snapshot of settings
  };
}

export interface QueueStatus {
  activeCount: number;
  pendingCount: number;
  isPaused: boolean;
  activeJobs: ActiveJob[];
  queuedJobs: ActiveJob[];
  concurrencyLimit: number;
}
