import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface VRAMChartProps {
    vramMb?: number;
    peakVramMb?: number;
    ramMb?: number;
    metricsVram: number;
    totalVram: number;
}

export function VRAMChart({ vramMb, peakVramMb, ramMb, metricsVram, totalVram }: VRAMChartProps) {
    const vramPct = totalVram > 0 ? (metricsVram / totalVram) * 100 : 0;
    const modelVramPct = totalVram > 0 && vramMb ? (vramMb / totalVram) * 100 : 0;
    const peakVramPct = totalVram > 0 && peakVramMb ? (peakVramMb / totalVram) * 100 : 0;

    return (
        <div className="space-y-4 p-4 bg-black/20 rounded-lg border border-white/5">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                <span>VRAM Usage</span>
                <span className="font-mono text-white">
                    {(metricsVram / 1024).toFixed(1)} / {(totalVram / 1024).toFixed(1)} GB ({vramPct.toFixed(0)}%)
                </span>
            </div>

            {/* Main Bar */}
            <div className="h-4 bg-neutral-800 rounded-full overflow-hidden relative">
                {/* Background Grid */}
                <div className="absolute inset-0 grid grid-cols-4 gap-px opacity-30">
                    <div className="border-r border-black" />
                    <div className="border-r border-black" />
                    <div className="border-r border-black" />
                </div>

                {/* Base System Usage (Grey) */}
                <div
                    className="absolute top-0 left-0 h-full bg-neutral-600 transition-all duration-300"
                    style={{ width: `${vramPct}%` }}
                />

                {/* Model Contribution (Blue Overlay) */}
                {modelVramPct > 0 && (
                    <div
                        className="absolute top-0 left-0 h-full bg-blue-500/50 transition-all duration-300 border-r border-blue-400"
                        style={{
                            left: `${Math.max(0, vramPct - modelVramPct)}%`,
                            width: `${modelVramPct}%`
                        }}
                    />
                )}

                {/* Peak Marker */}
                {peakVramPct > vramPct && (
                    <div
                        className="absolute top-0 w-0.5 h-full bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.8)] z-10"
                        style={{ left: `${peakVramPct}%` }}
                    />
                )}
            </div>

            {/* Threshold Indicators */}
            <div className="relative h-4 text-[10px] font-mono text-neutral-600">
                <div className="absolute left-[60%] -translate-x-1/2 flex flex-col items-center">
                    <div className="h-1 w-px bg-neutral-700 mb-0.5" />
                    <span>60%</span>
                </div>
                <div className="absolute left-[75%] -translate-x-1/2 flex flex-col items-center">
                    <div className="h-1 w-px bg-yellow-700 mb-0.5" />
                    <span className="text-yellow-700/50">75%</span>
                </div>
                <div className="absolute left-[90%] -translate-x-1/2 flex flex-col items-center">
                    <div className="h-1 w-px bg-red-700 mb-0.5" />
                    <span className="text-red-700/50">90%</span>
                </div>
            </div>

            {/* RAM Stats */}
            {ramMb && (
                <div className="mt-2 pt-2 border-t border-white/5 flex justify-between text-xs">
                    <span className="text-neutral-500">System RAM Impact</span>
                    <span className="font-mono text-neutral-300">{(ramMb / 1024).toFixed(1)} GB</span>
                </div>
            )}
        </div>
    );
}
