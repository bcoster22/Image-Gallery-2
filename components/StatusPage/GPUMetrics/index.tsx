import React from 'react';
import { HardDrive } from 'lucide-react';
import { cn } from '../../../utils/statusUtils';
import { OtelMetrics, AdminSettings } from '../StatusPage.types';
import { GPUControlCard } from './GPUControlCard';

interface GPUMetricsProps {
    otelMetrics: OtelMetrics | null;
    settings: AdminSettings | null;
    moondreamUrl: string;
    onRefreshMetrics: () => void;
}

export function GPUMetrics({ otelMetrics, settings, moondreamUrl, onRefreshMetrics }: GPUMetricsProps) {
    if (!otelMetrics || !otelMetrics.gpus || otelMetrics.gpus.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-green-400" />
                GPU Status
            </h2>
            <div className={cn("grid gap-4", otelMetrics.gpus.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
                {otelMetrics.gpus.map((gpu) => (
                    <GPUControlCard
                        key={gpu.id}
                        gpu={gpu}
                        otelMetrics={otelMetrics}
                        settings={settings}
                        moondreamUrl={moondreamUrl}
                        onRefreshMetrics={async () => onRefreshMetrics()}
                    />
                ))}
            </div>
        </div>
    );
}
