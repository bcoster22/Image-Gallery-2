import React from 'react';
import { CheckCircle, Download, Play } from 'lucide-react';
import { ModelInfo } from './types';

interface ModelListProps {
    models: ModelInfo[];
    loading: boolean;
    onTestLoad: (model: ModelInfo) => void;
}

export function ModelList({ models, loading, onTestLoad }: ModelListProps) {
    return (
        <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <div className="col-span-4">Model Name</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-right">VRAM</div>
                <div className="col-span-1 text-center">Config</div>
                <div className="col-span-2 text-right">Action</div>
            </div>

            <div className="divide-y divide-white/5">
                {models.map(model => (
                    <div key={model.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors">
                        <div className="col-span-4">
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
                            {model.is_downloaded ? (
                                <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Ready</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-neutral-500 text-sm">
                                    <Download className="w-4 h-4" />
                                    <span>Remote</span>
                                </div>
                            )}
                        </div>

                        <div className="col-span-1 text-right text-neutral-300 font-mono text-sm">
                            {model.last_known_vram_mb ? `${(model.last_known_vram_mb / 1024).toFixed(1)} GB` : '-'}
                        </div>

                        <div className="col-span-1 text-center font-mono text-xs text-neutral-500">
                            FP16
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
                ))}
            </div>

            {models.length === 0 && !loading && (
                <div className="p-8 text-center text-neutral-500">No models found. Check connection to Moondream Station.</div>
            )}
        </div>
    );
}
