

import React, { useMemo, useState } from 'react';
import { Activity, Clock } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { StatPoint } from './StatusPage.types';
import { getSmoothColor } from '../../utils/statusUtils';

interface PerformanceStatsProps {
    statsHistory: StatPoint[];
    timeRange: '1h' | '6h' | '12h' | '24h' | '1w';
    resilienceLog: { timestamp: number, type: 'info' | 'warn' | 'error', message: string }[];
}

export function PerformanceStats({ statsHistory, timeRange, resilienceLog }: PerformanceStatsProps) {
    // Local state for time range control within this component if needed, 
    // but props control it currently. We can add local toggles if desired similar to GPU card.
    // For now, we use the passed timeRange but might want local control for charts.
    const [localTimeRange, setLocalTimeRange] = useState<'1h' | '6h' | '12h' | '24h' | '1w'>(timeRange);

    const filteredStats = useMemo(() => {
        const now = Date.now();
        let cutoff = now;
        switch (localTimeRange) {
            case '1h': cutoff -= 60 * 60 * 1000; break;
            case '6h': cutoff -= 6 * 60 * 60 * 1000; break;
            case '12h': cutoff -= 12 * 60 * 60 * 1000; break;
            case '24h': cutoff -= 24 * 60 * 60 * 1000; break;
            case '1w': cutoff -= 7 * 24 * 60 * 60 * 1000; break;
        }
        return statsHistory.filter(s => s.timestamp >= cutoff);
    }, [localTimeRange, statsHistory]);

    const avgSpeed = filteredStats.length > 0
        ? (filteredStats.reduce((acc, curr) => acc + (curr.tokensPerSec || 0), 0) / filteredStats.length).toFixed(1)
        : '0.0';

    return (
        <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Performance Overview</h3>
                        <p className="text-xs text-neutral-400">Historical Analysis</p>
                    </div>
                </div>

                {/* Time Range Controls */}
                <div className="flex bg-neutral-900 rounded-lg p-1 border border-white/5">
                    {(['1h', '6h', '12h', '24h', '1w'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setLocalTimeRange(range)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${localTimeRange === range
                                ? 'bg-neutral-700 text-white shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-300'
                                }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tokens Per Second Chart */}
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-neutral-400">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-medium">Avg Speed</span>
                        </div>
                        <div className="text-xl font-bold text-white">
                            {avgSpeed} <span className="text-sm text-neutral-500 font-normal">t/s</span>
                        </div>
                    </div>

                    <div className="h-24 w-full bg-neutral-900/50 rounded-lg overflow-hidden border border-white/5 relative group">
                        <div className="absolute inset-0 z-10 p-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={filteredStats}>
                                    <defs>
                                        <linearGradient id="tpsGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <Area
                                        type="monotone"
                                        dataKey="tokensPerSec"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#tpsGradient)"
                                        isAnimationActive={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                                        labelStyle={{ color: '#888' }}
                                        itemStyle={{ color: '#10b981' }}
                                        formatter={(value: any) => [`${Number(value).toFixed(2)} t/s`, 'Speed']}
                                        labelFormatter={() => ''}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Resilience Monitor / Event Log */}
                <div className="bg-black/20 rounded-xl p-4 border border-white/5 flex flex-col h-40">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-neutral-400">
                            <Activity className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-medium text-amber-500">System Resilience Monitor</span>
                        </div>
                        <button
                            onClick={() => {
                                const text = resilienceLog.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
                                navigator.clipboard.writeText(text);
                                alert("Diagnosis Log Copied to Clipboard!");
                            }}
                            className="text-[10px] bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded text-neutral-300 transition-colors"
                        >
                            Copy Diagnosis
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                        {resilienceLog.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-neutral-600 italic">
                                System waiting for events...
                            </div>
                        ) : (
                            resilienceLog.map((log, idx) => (
                                <div key={idx} className="text-[10px] flex gap-2 font-mono border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                    <span className="text-neutral-500 shrink-0">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    <span className={`break-words ${log.type === 'error' ? 'text-red-400' :
                                        log.type === 'warn' ? 'text-amber-400' :
                                            'text-neutral-300'
                                        }`}>
                                        {log.message}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
