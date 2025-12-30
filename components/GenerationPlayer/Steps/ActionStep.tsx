import React from 'react';
import { BoltIcon } from '@heroicons/react/24/outline';
import ConfigSection from '../ConfigSection';

interface ActionStepProps {
    batchCount: number;
    onBatchCountChange: (count: number) => void;
    maxBatchCount?: number;
    onMaxBatchCountChange?: (max: number) => void;
    isGenerating: boolean;
    onGenerate: () => void;
    isValid: boolean;
}

export const ActionStep: React.FC<ActionStepProps> = ({
    batchCount,
    onBatchCountChange,
    maxBatchCount,
    onMaxBatchCountChange,
    isGenerating,
    onGenerate,
    isValid
}) => {
    return (
        <ConfigSection number={5} title="Action" icon={BoltIcon}>
            <div className="flex items-center gap-4">
                {/* Batch Slider */}
                <div className="flex-grow">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-2">
                        <span className="text-left font-bold text-gray-500 uppercase">Batch Count</span>
                        <div className="flex items-center gap-1">
                            <span className="text-white font-mono bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">{batchCount}</span>
                            <span className="text-gray-600">/</span>
                            <input
                                type="number"
                                className="w-10 bg-transparent text-right text-gray-500 hover:text-gray-300 focus:text-white focus:outline-none border-b border-transparent hover:border-gray-700 focus:border-indigo-500 transition-all font-mono"
                                value={maxBatchCount}
                                onChange={(e) => onMaxBatchCountChange && onMaxBatchCountChange(Math.max(1, Number(e.target.value)))}
                                title="Set Max Batch Count"
                            />
                        </div>
                    </div>

                    <div className="relative w-full h-4 flex items-center group">
                        {/* Rainbow Track */}
                        <div className="absolute w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-75 ease-out"
                                style={{
                                    width: `${(batchCount / (maxBatchCount || 200)) * 100}%`,
                                    background: 'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ec4899)'
                                }}
                            />
                        </div>

                        {/* Native Range Input */}
                        <input
                            type="range"
                            min="1"
                            max={maxBatchCount || 200}
                            value={batchCount}
                            onChange={e => onBatchCountChange(Number(e.target.value))}
                            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                        />

                        {/* Custom Thumb */}
                        <div
                            className="absolute h-3.5 w-3.5 bg-white rounded-full shadow-lg border-2 border-indigo-500 pointer-events-none transition-all duration-75 ease-out group-hover:scale-110 group-active:scale-95 z-0"
                            style={{ left: `calc(${(batchCount / (maxBatchCount || 200)) * 100}% - 7px)` }}
                        />
                    </div>
                </div>

                {/* Generate Button */}
                <button
                    onClick={onGenerate}
                    disabled={isGenerating || !isValid}
                    className={`
                        flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm tracking-wide shadow-lg transition-all
                        ${isGenerating || !isValid
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed w-32'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 active:scale-95 w-32'
                        }
                    `}
                >
                    {isGenerating ? (
                        <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        </>
                    ) : (
                        <>
                            <BoltIcon className="w-4 h-4" />
                            <span>GO</span>
                        </>
                    )}
                </button>
            </div>
        </ConfigSection>
    );
};
