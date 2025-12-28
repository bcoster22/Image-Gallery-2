import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

interface NoSettingsPromptProps {
    onSettingsClick: () => void;
}

export const NoSettingsPrompt: React.FC<NoSettingsPromptProps> = ({ onSettingsClick }) => (
    <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center p-10 border-2 border-dashed border-gray-600 rounded-2xl bg-gray-800/50">
            <h2 className="text-2xl font-semibold text-white mb-2">Welcome to Gemini Vision Gallery</h2>
            <p className="text-gray-400 mb-6">Please configure your AI providers in settings to get started.</p>
            <button
                onClick={onSettingsClick}
                className="flex items-center mx-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
            >
                <SettingsIcon className="w-5 h-5 mr-2" />
                Go to Settings
            </button>
        </div>
    </div>
);
