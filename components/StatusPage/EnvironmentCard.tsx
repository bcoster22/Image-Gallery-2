import React from 'react';
import { Server, Zap, Cpu } from 'lucide-react';
import { cn } from '../../utils/statusUtils';
import { OtelMetrics, StatPoint } from './StatusPage.types';

interface EnvironmentCardProps {
    environment: OtelMetrics['environment'];
    otelMetrics: OtelMetrics | null;
    latestStat?: StatPoint;
    moondreamStatus?: string;
}

export function EnvironmentCard({ environment, otelMetrics, latestStat, moondreamStatus }: EnvironmentCardProps) {
    if (!environment) return null;

    return (
        <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                        <Server className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Environment</h3>
                        <p className="text-xs text-neutral-400">Runtime Configuration</p>
                    </div>
                </div>
                <div className={cn("px-2 py-1 rounded text-xs font-medium uppercase",
                    environment.accelerator_available ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30" : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                )}>
                    {environment.accelerator_available ? 'Accelerator Active' : 'CPU Only'}
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-neutral-400 mb-1">
                        <Zap className="w-4 h-4" />
                        <span className="text-xs font-medium">CPU Usage</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {otelMetrics ? `${(otelMetrics.cpu || 0).toFixed(1)}% ` : (latestStat && moondreamStatus === 'operational' ? (latestStat.tokensPerSec || 0).toFixed(1) + ' t/s' : '0.0%')}
                    </div>
                </div>
                <div className="bg-black/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-neutral-400 mb-1">
                        <Cpu className="w-4 h-4" />
                        <span className="text-xs font-medium">Memory</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {otelMetrics ? `${(otelMetrics.memory || 0).toFixed(1)}% ` : (latestStat && moondreamStatus === 'operational' ? (latestStat.device === 'GPU' ? 'Unknown' : latestStat.device) : '-')}
                    </div>
                </div>
            </div>

            {/* Platform Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                <div className="bg-black/20 rounded-xl p-4">
                    <div className="text-neutral-400 text-xs font-medium mb-1">Platform</div>
                    <div className="text-lg font-bold text-white">{environment.platform}</div>
                    <div className="text-xs text-neutral-500">
                        {environment.platform === 'CUDA' ? `v${environment.cuda_version} ` :
                            environment.platform === 'ROCm' ? `v${environment.hip_version} ` : 'Standard'}
                    </div>
                </div>
                <div className="bg-black/20 rounded-xl p-4">
                    <div className="text-neutral-400 text-xs font-medium mb-1">PyTorch</div>
                    <div className="text-lg font-bold text-white">{environment.torch_version}</div>
                    <div className="text-xs text-neutral-500">
                        {environment.execution_type}
                    </div>
                </div>
                <div className="bg-black/20 rounded-xl p-4">
                    <div className="text-neutral-400 text-xs font-medium mb-1">Backend RAM</div>
                    <div className="text-lg font-bold text-white">
                        {environment.process_memory_mb ? Math.round(environment.process_memory_mb) : 0} <span className="text-sm font-normal text-neutral-500">MB</span>
                    </div>
                    <div className="text-xs text-neutral-500">
                        Python Process
                    </div>
                </div>
            </div>
        </div>
    );
}
