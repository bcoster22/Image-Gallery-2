import React from 'react';
import { CheckCircle, Download, Play, Clock, Loader2, XCircle, AlertTriangle } from 'lucide-react';
import { ModelInfo, TestResult } from './types';

interface ModelListProps {
    models: ModelInfo[];
    loading: boolean;
    testStatuses?: Record<string, TestResult>;
    onTestLoad: (model: ModelInfo) => void;
}

export function ModelList({ models, loading, testStatuses = {}, onTestLoad }: ModelListProps) {
    const getStatusBadge = (modelId: string) => {
        const result = testStatuses[modelId];
        if (!result) return null;

        switch (result.status) {
            case 'queued':
                return (
                    <div className="flex items-center gap-1.5 text-blue-400 text-xs font-medium">
                        <Clock className="w-4 h-4" />
                        <span>Queued</span>
                    </div>
                );
            case 'generating':
            case 'verifying':
            case 'loading':
                return (
                    <div className="flex items-center gap-1.5 text-blue-400 text-xs font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="capitalize">{result.status}...</span>
                    </div>
                );
            case 'success':
                return (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                        <CheckCircle className="w-4 h-4" />
                        <span>Complete</span>
                    </div>
                );
            case 'failure':
                return (
                    <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium" title={result.error}>
                        <XCircle className="w-4 h-4" />
                        <span>Error</span>
                    </div>
                );
            default:
                return null;
        }
    };

    const getResultBadge = (modelId: string) => {
        const result = testStatuses[modelId];
        if (!result || !['success', 'failure'].includes(result.status)) return null;

        // Calculate quality score based on generation time and verification
        let label = 'Failed';
        let colorClass = 'bg-red-500/10 border-red-500/30 text-red-400';
        let icon = <XCircle className="w-4 h-4" />;

        if (result.status === 'success') {
            const genTime = result.generationTimeMs || 0;
            const hasVerification = result.verificationResult && !result.verificationResult.toLowerCase().includes('fail');

            // Success: < 30s generation time + valid verification
            if (genTime < 30000 && hasVerification) {
                label = 'Success';
                colorClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                icon = <CheckCircle className="w-4 h-4" />;
            }
            // Poor: > 30s or verification issues
            else if (genTime >= 30000 || !hasVerification) {
                label = 'Poor';
                colorClass = 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
                icon = <AlertTriangle className="w-4 h-4" />;
            }
        }

        return (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded border font-medium text-xs ${colorClass}`}>
                {icon}
                <span>{label}</span>
            </div>
        );
    };

    return (
        <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <div className="col-span-3">Model Name</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Test Status</div>
                <div className="col-span-2">Result</div>
                <div className="col-span-1 text-right">VRAM</div>
                <div className="col-span-2 text-right">Action</div>
            </div>

            <div className="divide-y divide-white/5">
                {models.map(model => {
                    const result = testStatuses[model.id];
                    const showResult = result && (result.status === 'success' || result.status === 'failure') && result.generatedImageUrl;

                    return (
                        <React.Fragment key={model.id}>
                            <div className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors ${showResult ? 'bg-white/5' : ''}`}>
                                <div className="col-span-3">
                                    <div className="font-medium text-white">{model.name}</div>
                                    <div className="text-xs text-neutral-500 truncate">{model.id}</div>
                                </div>

                                <div className="col-span-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${model.type === 'generation' ? 'bg-blue-500/20 text-blue-300' :
                                        model.type === 'analysis' ? 'bg-green-500/20 text-green-300' :
                                            'bg-neutral-500/20 text-neutral-300'
                                        }`}>
                                        {model.type?.toUpperCase()}
                                    </span>
                                </div>

                                <div className="col-span-2 flex items-center gap-2">
                                    {getStatusBadge(model.id) || (
                                        model.is_downloaded ? (
                                            <div className="flex items-center gap-1.5 text-neutral-500 text-sm opacity-50">
                                                <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                                                <span>Idle</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-neutral-500 text-sm">
                                                <Download className="w-4 h-4" />
                                                <span>Remote</span>
                                            </div>
                                        )
                                    )}
                                </div>

                                <div className="col-span-2">
                                    {getResultBadge(model.id)}
                                </div>

                                <div className="col-span-1 text-right text-neutral-300 font-mono text-sm">
                                    {model.last_known_vram_mb ? `${(model.last_known_vram_mb / 1024).toFixed(1)} GB` : '-'}
                                </div>

                                <div className="col-span-2 flex justify-end">
                                    <button
                                        onClick={() => onTestLoad(model)}
                                        disabled={!model.is_downloaded && model.type === 'generation'}
                                        className={`
                                     flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                     ${model.type === 'generation'
                                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                                                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'}
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                 `}
                                    >
                                        <Play className="w-3 h-3 fill-current" />
                                        Test Load
                                    </button>
                                </div>
                            </div>

                            {/* Enhanced Comparison Layout */}
                            {showResult && (
                                <div className="bg-gradient-to-r from-black via-neutral-950 to-black border-b border-white/5 p-6">
                                    <div className="grid grid-cols-12 gap-6 items-start">
                                        {/* Generated Image - Equal width */}
                                        <div className="col-span-4 flex flex-col">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Generated Output</h4>
                                                <span className="text-xs text-neutral-500">
                                                    {model.name.split('/').pop()}
                                                </span>
                                            </div>
                                            <div className="rounded-lg overflow-hidden border border-white/10 bg-black relative group max-h-80">
                                                <img
                                                    src={result.generatedImageUrl}
                                                    alt="Generated"
                                                    className="w-full h-full object-contain"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                                                        <div className="text-xs text-emerald-400 font-mono">
                                                            ⚡ {(result.generationTimeMs ? (result.generationTimeMs / 1000).toFixed(2) : '0')}s
                                                        </div>
                                                        <div className="text-xs text-neutral-400">
                                                            Click to enlarge
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Test Metrics - Middle column */}
                                        <div className="col-span-4">
                                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Test Metrics</h4>

                                            <div className="space-y-2">
                                                {/* Quality Score */}
                                                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                                    <div className="text-xs text-neutral-500 mb-1">Quality Assessment</div>
                                                    {getResultBadge(model.id)}
                                                </div>

                                                {/* Generation Time, Eye Color, Resolution - Combined Row */}
                                                <div className="grid grid-cols-3 gap-2">
                                                    {/* Generation Time */}
                                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                                        <div className="text-xs text-neutral-500 mb-1">Gen. Time</div>
                                                        <div className="text-base font-mono text-white">
                                                            {(result.generationTimeMs ? (result.generationTimeMs / 1000).toFixed(2) : '0')}s
                                                        </div>
                                                    </div>

                                                    {/* Eye Color */}
                                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                                        <div className="text-xs text-neutral-500 mb-1">Eye Color</div>
                                                        <div className="text-sm font-medium text-white capitalize">
                                                            {result.eyeColor || 'N/A'}
                                                        </div>
                                                    </div>

                                                    {/* Image Resolution */}
                                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                                        <div className="text-xs text-neutral-500 mb-1">Resolution</div>
                                                        <div className="text-sm font-mono text-white">
                                                            {result.imageResolution || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Verification Result */}
                                                {result.verificationResult && (
                                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                                        <div className="text-xs text-neutral-500 mb-1">AI Verification</div>
                                                        <div className="text-sm text-neutral-300 leading-relaxed">
                                                            {result.verificationResult}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Detail Crop - Equal width */}
                                        <div className="col-span-4 flex flex-col">
                                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Detail Crop</h4>
                                            {result.eyeCropUrl ? (
                                                <div className="rounded-lg overflow-hidden border border-white/10 bg-black max-h-80 flex items-center justify-center">
                                                    <img
                                                        src={result.eyeCropUrl}
                                                        alt="Detail"
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border border-white/10 bg-white/5 max-h-80 flex items-center justify-center">
                                                    <div className="text-neutral-600 text-xs italic">
                                                        No detail crop available
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {models.length === 0 && !loading && (
                <div className="p-8 text-center text-neutral-500">No models found. Check connection to Moondream Station.</div>
            )}
        </div>
    );
}
