import React from 'react';
import { Server, Zap, Cpu } from 'lucide-react';
import { cn, statusColor } from '../../utils/statusUtils';
import { OtelMetrics, StatPoint } from './StatusPage.types';

interface MoondreamCardProps {
    moondreamStatus: "operational" | "degraded" | "down" | "idle";
    otelMetrics: OtelMetrics | null;
    latestStat?: StatPoint;
    children?: React.ReactNode;
}

export function MoondreamCard({ moondreamStatus, otelMetrics, latestStat, children }: MoondreamCardProps) {
    return (
        <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6 h-full flex flex-col gap-6">
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                        <Server className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Moondream Station</h3>
                        <p className="text-xs text-neutral-400">Local Inference Engine</p>
                    </div>
                </div>
                <div className={cn("px-2 py-1 rounded text-xs font-medium uppercase", statusColor(moondreamStatus))}>
                    {moondreamStatus === 'down' ? 'OFFLINE' : moondreamStatus}
                </div>
            </div>
            {children && (
                <div className="space-y-6 pt-4 border-t border-white/5">
                    {children}
                </div>
            )}
        </div>
    );
}
