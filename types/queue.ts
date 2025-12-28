
import { ImageInfo, GenerationSettings, AspectRatio, AiProvider } from "../types";

export interface QueueItem {
    id: string;
    taskType: 'analysis' | 'generate' | 'enhance' | 'smart-crop';
    fileName: string;
    addedAt: number;
    priority?: number; // 0=Background, 1=Preload, 2=Interactive, 3=Immediate
    data: {
        image?: ImageInfo;
        prompt?: string;
        aspectRatio?: AspectRatio;
        sourceImage?: ImageInfo;
        generationSettings?: GenerationSettings;
        providerOverride?: AiProvider;
    };
}

export interface ActiveJob {
    id: string;
    fileName: string;
    size: number;
    startTime: number;
    taskType: string;
}

export interface QueueStatus {
    activeCount: number;
    pendingCount: number;
    isPaused: boolean;
    activeJobs: ActiveJob[];
    queuedJobs: { id: string; fileName: string; size: number; startTime: number; taskType: string }[];
    concurrencyLimit: number;
    calibrationStatus?: CalibrationStatus;
}
export interface BenchmarkResult {
    concurrency: number;
    avgTPS: number;
    maxVRAM: number;
    totalProcessed: number;
    timestamp: number;
}

export interface CalibrationStatus {
    isActive: boolean;
    startTime: number;
    currentConcurrency: number;
    results: BenchmarkResult[];
    timeRemainingInStep: number; // Seconds
}
