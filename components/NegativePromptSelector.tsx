import React, { useState } from 'react';
import { SDXL_NEGATIVE_TEMPLATES, getNegativeTemplatesByCategory, NEGATIVE_CATEGORIES, NegativePromptTemplate } from '../constants/negative_prompts';

interface NegativePromptSelectorProps {
    currentPrompt: string;
    onSelectTemplate: (prompt: string) => void;
    onSaveCustom: (prompt: string) => void;
    customTemplates?: string[];
}

const NegativePromptSelector: React.FC<NegativePromptSelectorProps> = ({
    currentPrompt,
    onSelectTemplate,
    onSaveCustom,
    customTemplates = []
}) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [customPrompt, setCustomPrompt] = useState(currentPrompt);

    const templates = selectedCategory
        ? getNegativeTemplatesByCategory(selectedCategory)
        : Object.values(SDXL_NEGATIVE_TEMPLATES);

    const handleSaveCustom = () => {
        if (customPrompt.trim()) {
            onSaveCustom(customPrompt.trim());
            setEditMode(false);
        }
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            'Quality': 'bg-blue-600',
            'Photorealism': 'bg-green-600',
            'Portraits': 'bg-purple-600',
            'Architecture': 'bg-gray-600',
            'Creative': 'bg-orange-600'
        };
        return colors[category] || 'bg-gray-600';
    };

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            'Quality': '⭐',
            'Photorealism': '📷',
            'Portraits': '👤',
            'Architecture': '🏛️',
            'Creative': '🎨'
        };
        return icons[category] || '📝';
    };

    return (
        <div className="space-y-2">
            {/* Compact Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                >
                    <span className="text-red-400">🚫</span>
                    Negative Prompt Templates
                    <span className="text-xs text-gray-500">({Object.keys(SDXL_NEGATIVE_TEMPLATES).length} presets)</span>
                    <svg
                        className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                <button
                    onClick={() => setEditMode(!editMode)}
                    className="text-xs px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
                >
                    {editMode ? '✓ Done' : '+ Save Custom'}
                </button>
            </div>

            {/* Quick Select Pills - Only show top 3 when collapsed */}
            {!showAll && (
                <div className="flex gap-2 flex-wrap">
                    {templates.slice(0, 3).map(template => {
                        const isSelected = currentPrompt === template.prompt;
                        return (
                            <button
                                key={template.id}
                                onClick={() => onSelectTemplate(template.prompt)}
                                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${isSelected
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                                    }`}
                            >
                                {getCategoryIcon(template.category)} {template.name}
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setShowAll(true)}
                        className="text-xs px-3 py-1.5 rounded-full bg-gray-800 text-indigo-400 hover:bg-gray-700 border border-gray-700 font-medium"
                    >
                        +{templates.length - 3} more...
                    </button>
                </div>
            )}

            {/* Edit Mode */}
            {editMode && (
                <div className="border border-indigo-500/30 rounded-lg p-3 bg-indigo-900/10 space-y-2">
                    <label className="block text-xs text-gray-400">
                        Edit and save your custom negative prompt
                    </label>
                    <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        rows={2}
                        placeholder="low quality, blurry, artifacts..."
                    />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSaveCustom}
                            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
                        >
                            💾 Save as Template
                        </button>
                        <button
                            onClick={() => { setEditMode(false); setCustomPrompt(currentPrompt); }}
                            className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white text-xs"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Expanded View */}
            {showAll && (
                <div className="space-y-3 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    {/* Category Filter */}
                    <div className="flex gap-2 flex-wrap pb-2 border-b border-gray-800">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${selectedCategory === null
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            All ({Object.keys(SDXL_NEGATIVE_TEMPLATES).length})
                        </button>
                        {NEGATIVE_CATEGORIES.map(category => {
                            const count = getNegativeTemplatesByCategory(category).length;
                            return (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${selectedCategory === category
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        }`}
                                >
                                    {getCategoryIcon(category)} {category} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Template Grid - Compact Cards */}
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {templates.map(template => {
                            const isSelected = currentPrompt === template.prompt;

                            return (
                                <button
                                    key={template.id}
                                    onClick={() => onSelectTemplate(template.prompt)}
                                    className={`text-left p-2.5 rounded-lg border transition-all ${isSelected
                                            ? 'border-indigo-500 bg-indigo-900/30 shadow-md'
                                            : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <div className="flex-1 min-w-0">
                                            <h5 className="font-bold text-white text-xs truncate">
                                                {getCategoryIcon(template.category)} {template.name}
                                            </h5>
                                            <p className="text-[10px] text-gray-400 line-clamp-1">{template.description}</p>
                                        </div>
                                        <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded ${getCategoryColor(template.category)} text-white font-bold`}>
                                            {template.category}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 line-clamp-1 font-mono bg-gray-900/50 rounded px-1.5 py-0.5">
                                        {template.prompt.slice(0, 60)}...
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Custom Templates */}
                    {customTemplates.length > 0 && (
                        <div className="pt-2 border-t border-gray-800">
                            <div className="text-[10px] text-gray-500 font-semibold mb-1.5">YOUR CUSTOM TEMPLATES:</div>
                            <div className="flex gap-2 flex-wrap">
                                {customTemplates.map((customTemplate, idx) => {
                                    const isSelected = currentPrompt === customTemplate;
                                    return (
                                        <button
                                            key={`custom-${idx}`}
                                            onClick={() => onSelectTemplate(customTemplate)}
                                            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all max-w-xs truncate ${isSelected
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                                                }`}
                                            title={customTemplate}
                                        >
                                            ★ Custom #{idx + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(31, 41, 55, 0.5);
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

export default NegativePromptSelector;
