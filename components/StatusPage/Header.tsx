import React from 'react';
import { Activity, ScanEye } from 'lucide-react';

interface HeaderProps {
    onShowPerformance?: () => void;
    onShowDiagnostics?: () => void;
}

export function Header({ onShowPerformance, onShowDiagnostics }: HeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/20 text-cyan-400 grid place-items-center">
                    <Activity className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">System Status</h1>
                    <p className="text-neutral-400">Real-time service health and performance metrics</p>
                </div>
            </div>
            {onShowDiagnostics && (
                <button
                    onClick={onShowDiagnostics}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-600/30 transition-colors"
                >
                    <Activity className="w-4 h-4" />
                    System Health
                </button>
            )}
            {onShowPerformance && (
                <button
                    onClick={onShowPerformance}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/30 transition-colors"
                >
                    <ScanEye className="w-4 h-4" />
                    Performance & Benchmarks
                </button>
            )}
        </div>
    );
}
