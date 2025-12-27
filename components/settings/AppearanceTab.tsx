import React from 'react';
import { AdminSettings } from '../../types';

interface AppearanceTabProps {
    settings: AdminSettings;
    onUpdateSettings: (settings: AdminSettings) => void;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({ settings, onUpdateSettings }) => {

    // Helper to safely update appearance settings
    const handleChange = (field: keyof AdminSettings['appearance'], value: number) => {
        onUpdateSettings({
            ...settings,
            appearance: {
                ...settings.appearance,
                [field]: value
            }
        });
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4">Appearance</h2>
            <p className="text-sm text-gray-400 mb-6">Customize the look and feel of your gallery.</p>

            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-8">

                {/* Thumbnail Size */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <label htmlFor="thumb-size-slider" className="text-sm font-medium text-gray-200">
                            Thumbnail Size: <span className="text-indigo-400 font-bold">{settings.appearance?.thumbnailSize ?? 40}px</span>
                        </label>
                    </div>
                    <input
                        type="range"
                        id="thumb-size-slider"
                        min="30"
                        max="100"
                        step="5"
                        value={settings.appearance?.thumbnailSize ?? 40}
                        onChange={(e) => handleChange('thumbnailSize', Number(e.target.value))}
                        className="w-full h-2 bg-gradient-to-r from-indigo-900 to-indigo-500 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>30px (Compact)</span>
                        <span>100px (Large)</span>
                    </div>
                </div>

                {/* Hover Scale */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <label htmlFor="thumb-hover-slider" className="text-sm font-medium text-gray-200">
                            Thumbnail Hover Scale: <span className="text-indigo-400 font-bold">{settings.appearance?.thumbnailHoverScale ?? 1.2}x</span>
                        </label>
                    </div>
                    <input
                        type="range"
                        id="thumb-hover-slider"
                        min="1.0"
                        max="2.0"
                        step="0.1"
                        value={settings.appearance?.thumbnailHoverScale ?? 1.2}
                        onChange={(e) => handleChange('thumbnailHoverScale', Number(e.target.value))}
                        className="w-full h-2 bg-gradient-to-r from-indigo-900 to-indigo-500 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>1.0x (No Zoom)</span>
                        <span>2.0x (200%)</span>
                    </div>
                </div>

                {/* Live Preview */}
                <div className="bg-black/40 rounded-xl border border-white/10 p-6 flex flex-col items-center justify-center">
                    <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">Live Preview</h4>
                    <div
                        className="flex gap-2 p-2 overflow-hidden bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg px-3"
                        style={{ maxWidth: '100%' }}
                    >
                        {[1, 2, 3, 4, 5].map((i) => {
                            const size = settings.appearance?.thumbnailSize ?? 40;
                            const hoverScale = settings.appearance?.thumbnailHoverScale ?? 1.2;
                            const isSelected = i === 3;
                            const isHovered = i === 2;
                            const scale = isSelected ? Math.max(1.4, hoverScale) : (isHovered ? hoverScale : 1);

                            return (
                                <div
                                    key={i}
                                    className={`relative flex-shrink-0 rounded-md overflow-hidden transition-all duration-300 ${isSelected ? 'ring-2 ring-white opacity-100' : (isHovered ? 'ring-0 opacity-100' : 'ring-0 opacity-50')}`}
                                    style={{
                                        width: `${size}px`,
                                        height: `${size}px`,
                                        transform: `scale(${scale})`,
                                        margin: '0 4px'
                                    }}
                                >
                                    <div className={`w-full h-full ${isSelected ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                                        {isHovered && <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold bg-black/20">HOVER</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
