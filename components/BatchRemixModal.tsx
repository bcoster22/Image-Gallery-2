
import React, { useState } from 'react';
import { CloseIcon, WandIcon } from './icons';

interface BatchRemixModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (theme: string, strength: number) => void;
    count: number;
}

const BatchRemixModal: React.FC<BatchRemixModalProps> = ({ isOpen, onClose, onConfirm, count }) => {
    const [theme, setTheme] = useState('');
    const [strength, setStrength] = useState(0.75); // Default to moderate strength

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (theme.trim()) {
            onConfirm(theme, strength);
            setTheme('');
        }
    };
    //...
    return (
        <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4 border border-gray-700 relative animate-fade-in p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <CloseIcon className="w-6 h-6" />
                </button>

                <div className="flex items-center mb-4">
                    <div className="bg-purple-900/50 p-3 rounded-full mr-4">
                        <WandIcon className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Batch Remix</h2>
                        <p className="text-sm text-gray-400">Adapt {count} image{count !== 1 ? 's' : ''} to a new theme.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="theme-input" className="block text-sm font-medium text-gray-300 mb-2">
                            Common Theme / Subject
                        </label>
                        <input
                            id="theme-input"
                            type="text"
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            placeholder="e.g., Sexy 26 year old woman wearing lingerie"
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            The AI will adapt the subject of each selected image.
                        </p>
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="strength-input" className="block text-sm font-medium text-gray-300">
                                Remix Strength: {Math.round(strength * 100)}%
                            </label>
                            <span className="text-xs text-gray-500">
                                {strength < 0.4 ? 'Subtle' : strength < 0.7 ? 'Balanced' : 'Creative'}
                            </span>
                        </div>
                        <input
                            id="strength-input"
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={strength}
                            onChange={(e) => setStrength(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Controls how much the original image is preserved. Higher values mean more change.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!theme.trim()}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Remix Images
                        </button>
                    </div>
                </form>
            </div >
            <style>{`
                  @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                  }
                  .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                  }
              `}</style>
        </div >
    );
};

export default BatchRemixModal;
