import React, { useState } from 'react';
import { CloseIcon, SparklesIcon } from './icons';

interface KeywordSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (selectedKeywords: string[]) => void;
    keywords: string[];
}

const KeywordSelectionModal: React.FC<KeywordSelectionModalProps> = ({ isOpen, onClose, onSubmit, keywords }) => {
    const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());

    if (!isOpen) return null;

    const handleToggleKeyword = (keyword: string) => {
        setSelectedKeywords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(keyword)) {
                newSet.delete(keyword);
            } else {
                newSet.add(keyword);
            }
            return newSet;
        });
    };

    const handleSubmit = () => {
        onSubmit(Array.from(selectedKeywords));
    };

    return (
        <div 
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 border border-gray-700 relative animate-fade-in flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                    <div className="flex items-center">
                        <SparklesIcon className="w-6 h-6 mr-3 text-green-400" />
                        <h2 className="text-xl font-bold text-white">Add Creative Keywords</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <main className="flex-grow p-6 overflow-y-auto">
                    <p className="text-gray-300 mb-4">The AI has suggested these keywords to make your video more dynamic. Select any that match your vision.</p>
                    <div className="flex flex-wrap gap-3">
                        {keywords.map((kw, i) => {
                            const isSelected = selectedKeywords.has(kw);
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleToggleKeyword(kw)}
                                    className={`px-3 py-1.5 text-sm rounded-full transition-all duration-200 border-2 ${
                                        isSelected 
                                        ? 'bg-indigo-600 border-indigo-500 text-white font-semibold transform scale-105' 
                                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                                    }`}
                                >
                                    {kw}
                                </button>
                            );
                        })}
                    </div>
                </main>
                
                <footer className="p-4 border-t border-gray-700 flex justify-between items-center flex-shrink-0">
                    <p className="text-sm text-gray-400">{selectedKeywords.size} keyword{selectedKeywords.size === 1 ? '' : 's'} selected</p>
                    <button
                        onClick={handleSubmit}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500"
                    >
                        Continue
                    </button>
                </footer>
            </div>
             <style>{`
                  @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                  }
                  .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                  }
              `}</style>
        </div>
    );
};

export default KeywordSelectionModal;