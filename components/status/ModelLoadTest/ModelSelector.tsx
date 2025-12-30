import React from 'react';
import { Play } from 'lucide-react';
import { AvailableModel } from './types';

interface ModelSelectorProps {
    models: AvailableModel[];
    selectedModelId: string | null;
    isTestRunning: boolean;
    onSelectModel: (id: string | null) => void;
    onRunTest: (id: string) => void;
}

export function ModelSelector({ models, selectedModelId, isTestRunning, onSelectModel, onRunTest }: ModelSelectorProps) {
    const [convertingId, setConvertingId] = React.useState<string | null>(null);

    const handleConvert = async (e: React.MouseEvent, model: AvailableModel) => {
        e.stopPropagation();
        if (convertingId) return;

        if (!confirm(`Convert "${model.name}" to single-file .safetensors checkpoint?\n\nThis will assume the model is SDXL/SD and save it to the checkpoints/ directory.`)) {
            return;
        }

        setConvertingId(model.id);
        try {
            // Need to get the base URL. Should pass in or infer. 
            // Assuming localhost:2020 via proxy or direct.
            // Using the new tool endpoint.
            const res = await fetch('http://localhost:2020/v1/tools/convert-diffusers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model_id: model.id, fp16: true })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || data.message || "Failed");

            alert(`Success! Saved to: ${data.message}`);
        } catch (err: any) {
            alert(`Conversion Failed: ${err.message}`);
        } finally {
            setConvertingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Available Models</h3>
            <div className="h-[300px] overflow-y-auto pr-2 space-y-2 models-list-scroll">
                {models.map(model => (
                    <div
                        key={model.id}
                        onClick={() => !isTestRunning && onSelectModel(selectedModelId === model.id ? null : model.id)}
                        className={`
                            p-3 rounded-lg border transition-all cursor-pointer relative group
                            ${selectedModelId === model.id
                                ? 'bg-blue-500/10 border-blue-500/50'
                                : 'bg-neutral-800/50 border-white/5 hover:bg-neutral-800 hover:border-white/10'}
                            ${isTestRunning ? 'opacity-50 pointer-events-none' : ''}
                        `}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-white truncate">{model.name}</span>
                                    {model.type && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-700 text-neutral-400 uppercase">
                                            {model.type}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-neutral-500 truncate mt-0.5 font-mono">{model.id}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Convert Button for Diffusers */}
                                {(model.format === 'diffusers' || model.id.includes('diffusers/')) && (
                                    <button
                                        onClick={(e) => handleConvert(e, model)}
                                        disabled={!!convertingId}
                                        className={`
                                            p-1.5 rounded-md transition-colors text-xs font-mono border border-white/5
                                            ${convertingId === model.id ? 'bg-yellow-500/20 text-yellow-500 animate-pulse' : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300'}
                                        `}
                                        title="Convert to Safetensors Checkpoint"
                                    >
                                        {convertingId === model.id ? 'CNV...' : 'CONVERT'}
                                    </button>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRunTest(model.id);
                                    }}
                                    disabled={isTestRunning}
                                    className={`
                                        p-1.5 rounded-md transition-colors
                                        ${selectedModelId === model.id
                                            ? 'bg-blue-500 text-white hover:bg-blue-400'
                                            : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600 hover:text-white'}
                                    `}
                                    title="Run Load Test"
                                >
                                    <Play className="w-3 h-3 fill-current" />
                                </button>
                            </div>
                        </div>

                        {/* Recent Stats Mini-Display */}
                        {(model.last_known_vram_mb || model.last_peak_vram_mb) && (
                            <div className="mt-2 flex items-center gap-3 text-[10px] text-neutral-400 font-mono border-t border-white/5 pt-2">
                                {model.last_known_vram_mb && (
                                    <span>Mem: {(model.last_known_vram_mb / 1024).toFixed(1)}GB</span>
                                )}
                                {model.last_peak_vram_mb && (
                                    <span className="text-orange-400/80">Peak: {(model.last_peak_vram_mb / 1024).toFixed(1)}GB</span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style>{`
                .models-list-scroll::-webkit-scrollbar {
                    width: 4px;
                }
                .models-list-scroll::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                }
                .models-list-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 2px;
                }
            `}</style>
        </div>
    );
}
