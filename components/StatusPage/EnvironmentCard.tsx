import React from 'react';
import { Server, Zap, Cpu } from 'lucide-react';
import { cn } from '../../utils/statusUtils';
import { OtelMetrics, StatPoint } from './StatusPage.types';
import { VRAMChart } from '../status/ModelLoadTest/VRAMChart';

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
                <div className="bg-black/20 rounded-xl p-4 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-neutral-400">
                            <Zap className="w-4 h-4" />
                            <span className="text-xs font-medium">CPU Usage</span>
                        </div>
                        {otelMetrics?.cpu_details?.cores && (
                            <span className="text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">
                                {otelMetrics.cpu_details.cores} Cores
                            </span>
                        )}
                    </div>

                    <div className="relative z-10">
                        <div className="text-2xl font-bold text-white mb-1">
                            {otelMetrics ? `${(otelMetrics.cpu || 0).toFixed(1)}%` : '0.0%'}
                        </div>
                        {otelMetrics && (
                            <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                    style={{ width: `${otelMetrics.cpu}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-black/20 rounded-xl p-4 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-neutral-400">
                            <Cpu className="w-4 h-4" />
                            <span className="text-xs font-medium">Memory</span>
                        </div>
                        {otelMetrics?.memory_details && (
                            <span className="text-[10px] text-neutral-500">
                                {otelMetrics.memory_details.total_gb.toFixed(1)} GB Total
                            </span>
                        )}
                    </div>

                    <div className="relative z-10">
                        <div className="text-2xl font-bold text-white mb-1">
                            {otelMetrics?.memory_details ? (
                                <span>
                                    {otelMetrics.memory_details.used_gb.toFixed(1)} <span className="text-sm font-normal text-neutral-500">GB</span>
                                </span>
                            ) : (
                                otelMetrics ? `${(otelMetrics.memory || 0).toFixed(1)}%` : '-'
                            )}
                        </div>
                        {otelMetrics && (
                            <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden relative flex">
                                {/* Remaining System Memory Segment */}
                                <div
                                    className={cn("h-full transition-all duration-500 relative group/segment",
                                        (otelMetrics.memory || 0) > 90 ? "bg-red-500" :
                                            (otelMetrics.memory || 0) > 75 ? "bg-amber-500" : "bg-emerald-500"
                                    )}
                                    style={{
                                        width: `${(otelMetrics.memory || 0) - (otelMetrics.environment?.process_memory_mb && otelMetrics.memory_details ? (otelMetrics.environment.process_memory_mb / (otelMetrics.memory_details.total_gb * 1024)) * 100 : 0)}%`
                                    }}
                                    title={`Other System: ${(otelMetrics.memory_details ? (otelMetrics.memory_details.used_gb - ((otelMetrics.environment?.process_memory_mb || 0) / 1024)) : 0).toFixed(1)} GB`}
                                />

                                {/* Python Process Memory Segment */}
                                {otelMetrics.environment?.process_memory_mb && otelMetrics.memory_details && (
                                    <div
                                        className="h-full bg-violet-500 transition-all duration-500 relative group/segment"
                                        style={{
                                            width: `${(otelMetrics.environment.process_memory_mb / (otelMetrics.memory_details.total_gb * 1024)) * 100}%`
                                        }}
                                        title={`Python Process: ${Math.round(otelMetrics.environment.process_memory_mb)} MB`}
                                    />
                                )}
                            </div>
                        )}
                        {/* Legend */}
                        {otelMetrics?.environment?.process_memory_mb && (
                            <div className="flex items-center gap-3 mt-1.5">
                                <div className="flex items-center gap-1.5">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", (otelMetrics.memory || 0) > 90 ? "bg-red-500" : (otelMetrics.memory || 0) > 75 ? "bg-amber-500" : "bg-emerald-500")} />
                                    <span className="text-[10px] text-neutral-400">System</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                    <span className="text-[10px] text-neutral-400">Python</span>
                                </div>
                            </div>
                        )}
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

            {/* VRAM Chart (Moved from Model Load Test) */}
            {otelMetrics?.gpus?.[0] && (
                <div className="mt-4 pt-4 border-t border-white/5">
                    <VRAMChart
                        metricsVram={otelMetrics.gpus[0].memory_used}
                        totalVram={otelMetrics.gpus[0].memory_total}
                    // Optional: Pass system RAM if we want that context in the chart too, though EnvironmentCard has its own RAM bar.
                    // We leave test-specific props (vramMb, peakVramMb) undefined as this is the general view.
                    />
                </div>
            )}
        </div>
    );
}
