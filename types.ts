
import { HarmBlockThreshold } from "@google/genai";

export type AiProvider = 'gemini' | 'openai' | 'grok' | 'moondream_cloud' | 'moondream_local' | 'comfyui';
export type GalleryView = 'public' | 'my-gallery' | 'creations' | 'prompt-history' | 'status' | 'admin-settings' | 'profile-settings';

export interface ProviderCapabilities {
  vision: boolean;
  generation: boolean;
  animation: boolean;
  editing: boolean;
  textGeneration: boolean;
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
  detectSubject?(image: ImageInfo, settings: AdminSettings): Promise<{ x: number, y: number }>; // Returns center coordinates (0-100)

  /**
   * Generates an image from a text prompt.
   * Required for 'generation' capability.
   */
  generateImageFromPrompt?(
    prompt: string,
    settings: AdminSettings,
    aspectRatio?: AspectRatio
  ): Promise<string>;

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
    settings: AdminSettings
  ): Promise<string>;

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
}


export interface ImageInfo {
  id: string;
  file: File;
  fileName: string;
  dataUrl: string;
  keywords?: string[];
  recreationPrompt?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  analysisFailed?: boolean;
  ownerId?: string;
  isPublic?: boolean;
  isVideo?: boolean;
  videoUrl?: string; // Blob URL
  isGenerating?: boolean;
  source?: 'upload' | 'generated' | 'enhanced' | 'video' | 'prompt';
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
}

export interface GenerationTask {
  id: string;
  type: 'video' | 'image' | 'enhance';
  status: 'processing' | 'completed' | 'failed';
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
export interface ActiveJob {
  id: string;
  fileName: string;
  size: number; // in bytes
  startTime: number;
}

export interface QueueStatus {
  activeCount: number;
  pendingCount: number;
  isPaused: boolean;
  activeJobs: ActiveJob[];
  queuedJobs: ActiveJob[];
  concurrencyLimit: number;
}
