import React, { useRef, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, Cpu } from 'lucide-react';
import { TestStatus, ModelTestResult } from './types';

interface TestStatusDisplayProps {
    status: TestStatus;
    modelTestResult: ModelTestResult | null;
    currentModelId: string | null;
}

export function TestStatusDisplay({ status, modelTestResult, currentModelId }: TestStatusDisplayProps) {
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [status.message]);

    const getPhaseLabel = (phase: string) => {
        switch (phase) {
            case 'idle': return 'Ready';
            case 'loading': return 'Loading Model';
            case 'warmup': return 'Warming Up (First Inference)';
            case 'generating': return 'Generating Test Image';
            case 'unloading': return 'Unloading Model';
            case 'complete': return 'Test Complete';
            case 'failed': return 'Test Failed';
            default: return phase;
        }
    };

    return (
        <div className="space-y-4">
            {/* Phase Indicator */}
            <div className="flex items-center gap-4 text-sm bg-black/20 p-3 rounded-lg border border-white/5">
                <div className="flex items-center gap-2 text-white font-medium">
                    <Activity className={`w-4 h-4 ${status.phase === 'generating' ? 'animate-pulse text-blue-400' : 'text-neutral-400'}`} />
                    <span>{getPhaseLabel(status.phase)}</span>
                </div>
                {status.phase !== 'idle' && (
                    <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${status.phase === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${status.progress}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Log / Message Area */}
            <div
                ref={logContainerRef}
                className="h-[120px] bg-black font-mono text-xs p-3 rounded-lg border border-white/10 overflow-y-auto text-neutral-300"
            >
                {/* Simulated Log Stream */}
                <div className="text-neutral-500 mb-1"> System Ready.</div>
                {currentModelId && <div className="text-blue-400/80 mb-1">{`> Selected target: ${currentModelId}`}</div>}
                {status.message && (
                    <div className={`${status.phase === 'failed' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {`> ${status.message}`}
                    </div>
                )}
            </div>

            {/* Final Result Card */}
            {modelTestResult && (
                <div className={`
                    p-4 rounded-xl border flex gap-4 animate-in fade-in slide-in-from-bottom-2
                    ${modelTestResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-red-500/10 border-red-500/20'}
                `}>
                    <div className="shrink-0">
                        {modelTestResult.success
                            ? <CheckCircle className="w-8 h-8 text-emerald-500" />
                            : <AlertTriangle className="w-8 h-8 text-red-500" />
                        }
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className={`font-bold mb-1 ${modelTestResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                            {modelTestResult.success ? 'Model Verified' : 'Verification Failed'}
                        </h4>

                        {modelTestResult.error ? (
                            <p className="text-xs text-red-300/80 font-mono break-all">{modelTestResult.error}</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/10">
                                    <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-0.5">VRAM Impact</div>
                                    <div className="text-lg font-mono text-emerald-300">
                                        {(modelTestResult.vramMb || 0 / 1024).toFixed(1)} <span className="text-xs">GB</span>
                                    </div>
                                    {modelTestResult.peakVramMb && (
                                        <div className="text-[9px] text-emerald-400/60 mt-0.5">
                                            Peak: {(modelTestResult.peakVramMb / 1024).toFixed(1)} GB
                                        </div>
                                    )}
                                </div>

                                {modelTestResult.imageData && (
                                    <div className="bg-black/40 rounded-lg overflow-hidden border border-white/5 relative group cursor-pointer">
                                        <img
                                            src={modelTestResult.imageData}
                                            alt="Test Gen"
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] text-white">
                                                Preview
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
