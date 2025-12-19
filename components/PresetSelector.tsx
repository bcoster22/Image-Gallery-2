import React, { useState, useEffect } from 'react';
import { GOD_TIER_PRESETS, GodTierPreset, recommendPresetForPrompt, PRESET_CATEGORIES } from '../constants/god_tier_presets';

interface PresetSelectorProps {
    prompt: string;
    currentPreset?: string;
    onPresetSelect: (presetId: string, preset: GodTierPreset) => void;
}

const PresetSelector: React.FC<PresetSelectorProps> = ({
    prompt,
    currentPreset,
    onPresetSelect
}) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [recommendedPreset, setRecommendedPreset] = useState<string>('');

    // Analyze prompt for recommendations
    useEffect(() => {
        if (prompt && prompt.length >= 3) {
            const recommended = recommendPresetForPrompt(prompt);
            setRecommendedPreset(recommended);
        } else {
            setRecommendedPreset('');
        }
    }, [prompt]);

    const getTierColor = (tier: string) => {
        if (tier.includes('🥇')) return 'from-yellow-500 to-yellow-700';
        if (tier.includes('⚡')) return 'from-cyan-500 to-blue-600';
        if (tier.includes('🏗️')) return 'from-gray-500 to-gray-700';
        if (tier.includes('🎨')) return 'from-purple-500 to-pink-600';
        if (tier.includes('🔬') || tier.includes('🔧')) return 'from-green-500 to-emerald-700';
        return 'from-gray-600 to-gray-800';
    };

    const getSpeedColor = (speed: string) => {
        const colors: Record<string, string> = {
            'Lightning': 'text-cyan-400',
            'Fast': 'text-green-400',
            'Medium': 'text-yellow-400',
            'Slow': 'text-orange-400',
            'Very Slow': 'text-red-400'
        };
        return colors[speed] || 'text-gray-400';
    };

    const filteredPresets = selectedCategory
        ? Object.entries(GOD_TIER_PRESETS).filter(([_, preset]) => preset.category === selectedCategory)
        : Object.entries(GOD_TIER_PRESETS);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    ⚙️ God Tier Presets
                </h3>
                {recommendedPreset && (
                    <span className="text-xs text-yellow-400 animate-pulse">
                        ✨ Recommendation ready
                    </span>
                )}
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedCategory === null
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    All ({Object.keys(GOD_TIER_PRESETS).length})
                </button>
                {PRESET_CATEGORIES.map(category => {
                    const count = Object.values(GOD_TIER_PRESETS).filter(p => p.category === category).length;
                    return (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedCategory === category
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {category} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Preset Cards */}
            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {filteredPresets.map(([presetId, preset]) => {
                    const isRecommended = presetId === recommendedPreset;
                    const isSelected = presetId === currentPreset;

                    return (
                        <button
                            key={presetId}
                            onClick={() => onPresetSelect(presetId, preset)}
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
                                        ✓ Active
                                    </span>
                                </div>
                            )}

                            <div className="space-y-2">
                                {/* Tier Badge & Name */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-white text-sm mb-1">
                                            {preset.name}
                                        </h4>
                                        <p className="text-xs text-indigo-400 font-medium">
                                            {preset.best_for}
                                        </p>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gradient-to-r ${getTierColor(preset.tier)} text-white shrink-0`}>
                                        {preset.tier}
                                    </span>
                                </div>

                                {/* Description */}
                                <p className="text-xs text-gray-400">
                                    {preset.description}
                                </p>

                                {/* Technical Details */}
                                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-700/50">
                                    <div>
                                        <span className="text-gray-500">Model:</span>
                                        <span className="ml-1 text-gray-300">{GOD_TIER_PRESETS[presetId].model}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Steps:</span>
                                        <span className="ml-1 text-gray-300">{preset.steps}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">CFG:</span>
                                        <span className="ml-1 text-gray-300">{preset.cfg}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Speed:</span>
                                        <span className={`ml-1 font-medium ${getSpeedColor(preset.speed)}`}>
                                            {preset.speed}
                                        </span>
                                    </div>
                                </div>

                                {/* Sampler & Scheduler */}
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>📊 {preset.sampler}</span>
                                    <span>•</span>
                                    <span>{preset.scheduler}</span>
                                    <span>•</span>
                                    <span className="text-purple-400">{preset.vram}</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

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

export default PresetSelector;
