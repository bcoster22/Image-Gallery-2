import React, { useState } from 'react';
import { CpuChipIcon } from '@heroicons/react/24/outline';
import ConfigSection from '../ConfigSection';
import NegativePromptSelector from '../../NegativePromptSelector';

interface ConceptStepProps {
    prompt: string;
    onPromptChange: (prompt: string) => void;
    promptHistory?: string[]; // Added
    negativePrompt: string;
    onNegativePromptChange: (negativePrompt: string) => void;
    negativePromptHistory: string[];
    onGenerate: () => void;
}

export const ConceptStep: React.FC<ConceptStepProps> = ({
    prompt,
    onPromptChange,
    promptHistory = [], // Added
    negativePrompt,
    onNegativePromptChange,
    negativePromptHistory,
    onGenerate
}) => {
    const [showHistory, setShowHistory] = useState(false); // For Positive Prompt
    const [showNegativeHistory, setShowNegativeHistory] = useState(false);

    return (
        <ConfigSection number={1} title="Concept" icon={CpuChipIcon}>
            <div className="space-y-4">
                {/* Positive Prompt */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] uppercase text-gray-500 font-bold text-left">Positive Prompt</label>
                            {/* History Toggle for Positive */}
                            {promptHistory.length > 0 && (
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="text-[9px] text-gray-500 hover:text-gray-300 underline"
                                >
                                    History
                                </button>
                            )}
                        </div>
                        <span className="text-[10px] text-indigo-400 font-mono">{prompt.length} chars</span>
                    </div>

                    <div className="relative">
                        <textarea
                            value={prompt}
                            onChange={e => onPromptChange(e.target.value)}
                            onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') onGenerate(); }}
                            placeholder="Describe your imagination..."
                            className="w-full h-28 bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-sm text-gray-100 placeholder-gray-600 resize-none focus:border-indigo-500 focus:outline-none transition-colors scrollbar-thin scrollbar-thumb-gray-800"
                        />
                        {/* Dropdown for history */}
                        {showHistory && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                                {promptHistory.map((p, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { onPromptChange(p); setShowHistory(false); }}
                                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 border-b border-gray-800 last:border-0 truncate"
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Secondary / Negative Prompt */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] uppercase text-gray-500 font-bold text-left">Negative Prompt</label>
                            {/* History Toggle for Negative */}
                            {negativePromptHistory.length > 0 && (
                                <button
                                    onClick={() => setShowNegativeHistory(!showNegativeHistory)}
                                    className="text-[9px] text-gray-500 hover:text-gray-300 underline"
                                >
                                    History
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="relative">
                        <textarea
                            value={negativePrompt}
                            onChange={e => onNegativePromptChange(e.target.value)}
                            placeholder="Things to avoid..."
                            className="w-full h-16 bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-xs text-gray-400 placeholder-gray-700 resize-none focus:border-red-900 focus:outline-none transition-colors"
                        />
                        {/* Dropdown for history */}
                        {showNegativeHistory && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                                {negativePromptHistory.map((p, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { onNegativePromptChange(p); setShowNegativeHistory(false); }}
                                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 border-b border-gray-800 last:border-0 truncate"
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="mt-2 text-left">
                        <NegativePromptSelector
                            currentPrompt={negativePrompt}
                            onSelectTemplate={onNegativePromptChange}
                            onSaveCustom={(p) => onNegativePromptChange(p)}
                            customTemplates={negativePromptHistory}
                        />
                    </div>
                </div>
            </div>
        </ConfigSection>
    );
};
