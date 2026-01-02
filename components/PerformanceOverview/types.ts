export interface ModelInfo {
    id: string;
    name: string;
    description: string;
    version: string;
    last_known_vram_mb?: number;
    type: 'generation' | 'analysis' | 'vision';
    is_downloaded?: boolean;
}

export interface TestResult {
    modelId: string;
    status: 'idle' | 'queued' | 'loading' | 'generating' | 'verifying' | 'success' | 'failure';
    generationTimeMs?: number;
    generatedImageUrl?: string;
    verificationResult?: string;
    eyeCropUrl?: string;
    error?: string;
}
