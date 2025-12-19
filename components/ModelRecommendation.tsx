import React, { useState, useEffect } from 'react';
import { GenerationSettings } from '../types';

interface ModelMeta {
    id: string;
    hf_id: string;
    name: string;
    tier: 'gold' | 'specialized';
    best_for: string;
    description: string;
    scheduler: string;
    optimal_steps: number;
    cfg_range: [number, number];
    keywords: string[];
    score?: number;
    matched_keywords?: string[];
}

interface ModelRecommendationProps {
    prompt: string;
    currentModel?: string;
    onModelSelect: (modelId: string, autoConfig: Partial<GenerationSettings>) => void;
}

const ModelRecommendation: React.FC<ModelRecommendationProps> = ({
    prompt,
    currentModel,
    onModelSelect
}) => {
    const [recommendations, setRecommendations] = useState<ModelMeta[]>([]);
    const [allModels, setAllModels] = useState<ModelMeta[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [recommendedModel, setRecommendedModel] = useState<string>('');
    const [confidence, setConfidence] = useState<number>(0);
    const [reason, setReason] = useState<string>('');

    // Fetch all models on mount
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const response = await fetch('http://127.0.0.1:2020/v1/models/sdxl');
                if (response.ok) {
                    const data = await response.json();
                    setAllModels(data.models || []);
                }
            } catch (error) {
                console.error('Failed to fetch models:', error);
            }
        };
        fetchModels();
    }, []);

    // Fetch recommendations when prompt changes (debounced)
    useEffect(() => {
        if (!prompt || prompt.length < 3) {
            setRecommendations([]);
            setRecommendedModel('');
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch('http://127.0.0.1:2020/v1/models/recommend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });

                if (response.ok) {
                    const data = await response.json();
                    setRecommendations(data.matches || []);
                    setRecommendedModel(data.recommended);
                    setConfidence(data.confidence || 0);
                    setReason(data.reason || '');
                }
            } catch (error) {
                console.error('Failed to get recommendations:', error);
            } finally {
                setLoading(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [prompt]);

    const handleModelClick = (model: ModelMeta) => {
        // Auto-configure settings based on model metadata
        const avgCfg = (model.cfg_range[0] + model.cfg_range[1]) / 2;

        const autoConfig: Partial<GenerationSettings> = {
            model: model.id,
            scheduler: model.scheduler,
            steps: model.optimal_steps,
            cfg_scale: avgCfg
        };

        onModelSelect(model.id, autoConfig);
    };

    const getTierBadge = (tier: string) => {
        if (tier === 'gold') {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900">
                    ⭐ Gold Standard
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-900/50 text-indigo-300">
                Specialized
            </span>
        );
    };

    const displayModels = showAll ? allModels : recommendations;
    const hasRecommendations = recommendations.length > 0;

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                        🎨 Model Selection
                        {loading && <span className="text-xs text-gray-500 animate-pulse">Analyzing...</span>}
                    </h3>
                    {hasRecommendations && confidence > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                            {reason} • {Math.round(confidence * 100)}% confidence
                        </p>
                    )}
                </div>
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                    {showAll ? 'Show Recommended' : `Browse All (${allModels.length})`}
                </button>
            </div>

            {/* Model Cards Grid */}
            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {displayModels.map((model) => {
                    const isRecommended = model.id === recommendedModel;
                    const isSelected = model.id === currentModel;
                    const matchScore = model.score || 0;

                    return (
                        <button
                            key={model.id}
                            onClick={() => handleModelClick(model)}
                            className={`
                                relative text-left p-3 rounded-lg border transition-all
                                ${isSelected
                                    ? 'border-indigo-500 bg-indigo-900/30 shadow-lg shadow-indigo-500/20'
                                    : isRecommended
                                        ? 'border-yellow-500/50 bg-yellow-900/10 hover:bg-yellow-900/20'
                                        : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600'
                                }
                            `}
                        >
                            {/* Recommended Badge */}
                            {isRecommended && !isSelected && (
                                <div className="absolute top-2 right-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-500 text-gray-900 animate-pulse">
                                        ✨ Recommended
                                    </span>
                                </div>
                            )}

                            {/* Selected Badge */}
                            {isSelected && (
                                <div className="absolute top-2 right-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-500 text-white">
                                        ✓ Selected
                                    </span>
                                </div>
                            )}

                            {/* Model Info */}
                            <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-white text-sm truncate">
                                            {model.name}
                                        </h4>
                                        <p className="text-xs text-indigo-400 font-medium mt-0.5">
                                            {model.best_for}
                                        </p>
                                    </div>
                                    {getTierBadge(model.tier)}
                                </div>

                                <p className="text-xs text-gray-400 line-clamp-2">
                                    {model.description}
                                </p>

                                {/* Match Score */}
                                {matchScore > 0 && model.matched_keywords && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        <span className="text-xs text-gray-500">Matches:</span>
                                        {model.matched_keywords.slice(0, 3).map((kw, i) => (
                                            <span
                                                key={i}
                                                className="text-xs px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-400 border border-yellow-700/50"
                                            >
                                                {kw}
                                            </span>
                                        ))}
                                        {model.matched_keywords.length > 3 && (
                                            <span className="text-xs text-gray-500">
                                                +{model.matched_keywords.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Auto-config Preview */}
                                <div className="flex items-center gap-3 text-xs text-gray-500 pt-1 border-t border-gray-700/50">
                                    <span>📊 {model.scheduler.replace(/_/g, ' ').toUpperCase()}</span>
                                    <span>🔢 {model.optimal_steps} steps</span>
                                    <span>
                                        ⚙️ CFG {model.cfg_range[0]}-{model.cfg_range[1]}
                                    </span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Empty State */}
            {!showAll && !hasRecommendations && !loading && prompt.length >= 3 && (
                <div className="text-center py-6 text-gray-500 text-sm">
                    <p className="mb-2">🤔 No specific model recommendations</p>
                    <button
                        onClick={() => setShowAll(true)}
                        className="text-indigo-400 hover:text-indigo-300 underline"
                    >
                        Browse all models
                    </button>
                </div>
            )}

            {/* Prompt Too Short */}
            {!showAll && prompt.length < 3 && (
                <div className="text-center py-6 text-gray-500 text-sm">
                    <p>💡 Type a prompt to get intelligent model recommendations</p>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(55, 65, 81, 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(99, 102, 241, 0.5);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(99, 102, 241, 0.7);
                }
            `}</style>
        </div>
    );
};

export default ModelRecommendation;
