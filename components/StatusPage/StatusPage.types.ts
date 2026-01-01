import { AdminSettings, QueueStatus } from "../../types";
import { CalibrationStatus } from "../../types/queue";
export type { AdminSettings, QueueStatus };

export interface StatPoint {
    timestamp: number;
    tokensPerSec: number;
    device: 'CPU' | 'GPU';
}

export interface OtelMetrics {
    cpu: number;
    memory: number;
    device: string;
    cpu_details?: {
        usage: number;
        cores: number;
    };
    memory_details?: {
        used_gb: number;
        total_gb: number;
        percent: number;
    };
    environment?: {
        platform: string;
        accelerator_available: boolean;
        torch_version: string;
        cuda_version: string;
        hip_version?: string;
        execution_type: string;
        process_memory_mb?: number;
    };
    gpus?: {
        id: number;
        name: string;
        load: number;
        memory_used: number;
        memory_total: number;
        temperature: number;
        fan_control_supported?: boolean;
    }[];
    loaded_models?: {
        id: string;
        name: string;
        vram_mb: number;
        ram_mb: number;
        loaded_at: number;
    }[];
    ghost_memory?: {
        detected: boolean;
        ghost_vram_mb: number;
    };
}

export interface StatusPageProps {
    statsHistory: StatPoint[];
    settings: AdminSettings | null;
    queueStatus?: QueueStatus;
    onPauseQueue?: (paused: boolean) => void;
    onClearQueue?: () => void;
    onRemoveFromQueue?: (ids: string[]) => void;
    onShowPerformance?: () => void;
    onShowDiagnostics?: () => void;
    startCalibration?: () => void;
    stopCalibration?: () => void;
    calibrationStatus?: CalibrationStatus;
    isBatchMode: boolean;
    onToggleBatchMode?: () => void;
    // Batch size calibration
    optimalBatchSize?: number;
    batchSizeCalibrated?: boolean;
    onCalibrateBatchSize?: () => void;
    batchCalibrationInProgress?: boolean;
}
