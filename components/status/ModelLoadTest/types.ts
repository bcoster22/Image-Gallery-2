export interface TestConfig {
    vramSetting: 'low' | 'balanced' | 'high';
    maxVramPct: number;
}

export interface TestStatus {
    phase: 'idle' | 'loading' | 'warmup' | 'generating' | 'unloading' | 'complete' | 'failed';
    message: string;
    progress: number;
}

export interface TestResult {
    status: TestStatus;
    error?: string;
}

export interface ModelTestResult {
    success: boolean;
    vramMb?: number;
    peakVramMb?: number;
    imageData?: string;
    error?: string;
}

export interface AvailableModel {
    id: string;
    name: string;
    description: string;
    type?: string;
    format?: string;
    size_bytes?: number;
    last_known_vram_mb?: number;
    last_peak_vram_mb?: number;
}
