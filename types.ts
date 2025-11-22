
import { HarmBlockThreshold } from "@google/genai";

export type AiProvider = 'gemini' | 'openai' | 'grok' | 'moondream_cloud' | 'moondream_local' | 'comfyui';
export type GalleryView = 'public' | 'my-gallery' | 'creations' | 'prompt-history' | 'status' | 'admin-settings';

export interface ProviderCapabilities {
  vision: boolean;
  generation: boolean;
  animation: boolean;
  editing: boolean;
  textGeneration: boolean;
}

export type Capability = keyof ProviderCapabilities;

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
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
