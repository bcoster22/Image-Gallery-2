export interface DiagnosticResult {
    id: string;
    name: string;
    category: 'system' | 'hardware' | 'network' | 'performance' | 'environment' | 'memory';
    severity: 'critical' | 'warning' | 'info';
    status: 'pass' | 'fail' | 'warning' | 'pending' | 'skipped' | 'error';
    message: string;
    timestamp: number;
    fix_id?: string;
}

export interface DiagnosticsPageProps {
    onClose: () => void;
    moondreamUrl?: string;
}

export interface HealthScoreRingProps {
    score: number;
    size?: number;
    strokeWidth?: number;
}

export interface DiagnosticsHeaderProps {
    onClose: () => void;
    healthScore: number;
}

export interface DiagnosticsResultCardProps {
    result: DiagnosticResult;
    onFix?: (fixId: string) => void;
}
