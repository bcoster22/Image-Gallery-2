import React from 'react';
import { BoltIcon } from '@heroicons/react/24/outline';

interface ActionStepProps {
    batchCount: number;
    onBatchCountChange: (count: number) => void;
    isGenerating: boolean;
    onGenerate: () => void;
    isValid: boolean;
}

export const ActionStep: React.FC<ActionStepProps> = ({
    batchCount,
    onBatchCountChange,
    isGenerating,
    onGenerate,
    isValid
}) => {
    return (
        <div className="bg-[#141414] border-t border-[#2a2a2a] p-4 pb-8 md:p-4 sticky bottom-0 z-10 w-full">
            <div className="flex items-center gap-2 mb-3 opacity-60">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Step 5: Action</span>
                <div className="h-px bg-gray-700 flex-grow"></div>
            </div>

            <div className="flex items-center gap-4">
                {/* Batch Slider */}
                <div className="flex-grow">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Batch Count</span>
                        <span className="text-white font-mono">{batchCount}</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="200"
                        value={batchCount}
                        onChange={e => onBatchCountChange(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
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
        </div>
    );
};
