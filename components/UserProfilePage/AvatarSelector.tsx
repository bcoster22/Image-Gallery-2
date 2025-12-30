import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AdminSettings } from '../../types';
import { generateImageFromPrompt } from '../../services/aiService';

const AVATAR_PRESETS = [
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Alex',
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Sam',
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Milo',
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Willow',
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Caleb',
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Sofia',
    'https://api.dicebear.com/8.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/8.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/8.x/bottts/svg?seed=Bot1',
    'https://api.dicebear.com/8.x/bottts/svg?seed=Bot2',
    'https://api.dicebear.com/8.x/lorelei/svg?seed=L1',
    'https://api.dicebear.com/8.x/lorelei/svg?seed=L2',
    'https://api.dicebear.com/8.x/micah/svg?seed=M1',
    'https://api.dicebear.com/8.x/micah/svg?seed=M2',
    'https://api.dicebear.com/8.x/notionists/svg?seed=N1',
];

interface AvatarSelectorProps {
    avatarUrl: string;
    onAvatarChange: (url: string) => void;
    settings: AdminSettings | null;
    addNotification: (notification: any) => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
    avatarUrl,
    onAvatarChange,
    settings,
    addNotification
}) => {
    const [avatarPrompt, setAvatarPrompt] = useState<string>('');
    const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

    const handleGenerateAvatar = async () => {
        if (!settings || !avatarPrompt.trim()) return;
        setIsGeneratingAvatar(true);
        try {
            const generatedUrl = await generateImageFromPrompt(
                `Profile avatar, ${avatarPrompt}, centralized, simple background, high quality`,
                settings,
                '1:1'
            );
            onAvatarChange(generatedUrl);
            addNotification({ status: 'success', message: 'Avatar generated!' });
        } catch (e: any) {
            addNotification({ status: 'error', message: 'Failed to generate avatar: ' + e.message });
        } finally {
            setIsGeneratingAvatar(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center gap-6 mb-8">
                    <div className="relative">
                        <img src={avatarUrl} alt="Current" className="w-24 h-24 rounded-full border-4 border-gray-700 shadow-lg" />
                        <div className="absolute -bottom-2 -right-2 bg-green-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                            CURRENT
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Your Avatar</h3>
                        <p className="text-gray-400 text-sm">Select a preset or generate a unique AI avatar.</p>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">AI Generator</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={avatarPrompt}
                            onChange={(e) => setAvatarPrompt(e.target.value)}
                            placeholder="E.g., Cyberpunk raccoon, minimalist cat, neon robot..."
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                            onClick={handleGenerateAvatar}
                            disabled={isGeneratingAvatar || !avatarPrompt.trim()}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
                        >
                            {isGeneratingAvatar ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Generate
                        </button>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Presets</h3>
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3">
                        {AVATAR_PRESETS.map((url, i) => (
                            <button
                                key={i}
                                onClick={() => onAvatarChange(url)}
                                className={`relative rounded-full overflow-hidden transition-transform hover:scale-110 focus:outline-none ${avatarUrl === url ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-800' : ''}`}
                            >
                                <img src={url} alt={`Preset ${i}`} className="w-full h-full bg-gray-700" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
