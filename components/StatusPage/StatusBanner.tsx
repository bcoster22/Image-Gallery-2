import React from 'react';
import { cn, statusColor, fmtAgo } from '../../utils/statusUtils';
import { StatPoint } from './StatusPage.types';

interface StatusBannerProps {
    moondreamStatus: "operational" | "degraded" | "down" | "idle";
    latestStat?: StatPoint;
}

export function StatusBanner({ moondreamStatus, latestStat }: StatusBannerProps) {
    return (
        <div className={cn("flex items-center gap-3 rounded-2xl px-6 py-4 border", statusColor(moondreamStatus))}>
            <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-current"></span>
            </div>
            <div className="text-lg font-medium capitalize">
                {moondreamStatus === 'operational' ? 'All Systems Operational' :
                    moondreamStatus === 'idle' ? 'System Idle' :
                        'Service Disconnected'}
            </div>
            <div className="ml-auto text-sm opacity-75 hidden sm:block">
                Last activity: {latestStat ? fmtAgo(latestStat.timestamp) : 'Never'}
            </div>
        </div>
    );
}
