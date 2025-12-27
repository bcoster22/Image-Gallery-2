import React, { useEffect } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import ConfigSection from '../ConfigSection';
import { AspectRatio, GenerationSettings } from '../../../types';
import { AspectRatios } from '../GenerationPlayer.types';

interface ShapeStepProps {
    aspectRatio: AspectRatio;
    onAspectRatioChange: (ratio: AspectRatio) => void;
    randomAspectRatio: boolean;
    onRandomAspectRatioChange?: (enabled: boolean) => void;
    enabledRandomRatios: AspectRatio[];
    onEnabledRandomRatiosChange?: (ratios: AspectRatio[]) => void;

    // New Props for Resolution Control
    settings: GenerationSettings;
    onSettingsChange: (settings: GenerationSettings) => void;
}

const RESOLUTION_MAP: Record<AspectRatio, { w: number, h: number }> = {
    '1:1': { w: 1024, h: 1024 },
    '16:9': { w: 1216, h: 832 },
    '9:16': { w: 832, h: 1216 },
    '4:3': { w: 1152, h: 896 },
    '3:4': { w: 896, h: 1152 }
};

export const ShapeStep: React.FC<ShapeStepProps> = ({
    aspectRatio,
    onAspectRatioChange,
    randomAspectRatio,
    onRandomAspectRatioChange,
    enabledRandomRatios,
    onEnabledRandomRatiosChange,
    settings,
    onSettingsChange
}) => {

    // Sync Resolution when Aspect Ratio changes (one-way sync for now)
    // We only trigger this if the current dimensions don't match the new AR target
    useEffect(() => {
        if (randomAspectRatio) return;

        const target = RESOLUTION_MAP[aspectRatio];
        if (target) {
            // Only update if significantly different (prevent loops if user is tweaking)
            // But actually, we want to enforce it if AR is clicked.
            // Since this effect runs on aspectRatio change, it's safe.
            if (settings.width !== target.w || settings.height !== target.h) {
                onSettingsChange({
                    ...settings,
                    width: target.w,
                    height: target.h
                });
            }
        }
    }, [aspectRatio, randomAspectRatio]);

    // Sync Aspect Ratio when Resolution changes manually?
    // Hard to do cleanly without "Custom". For now, manual overrides just stay as overrides 
    // but the AR button might look active if it matches.

    const toggleRatio = (ar: AspectRatio) => {
        if (randomAspectRatio && onEnabledRandomRatiosChange) {
            if (enabledRandomRatios.includes(ar)) {
                if (enabledRandomRatios.length === 1) return; // Must have at least one
                onEnabledRandomRatiosChange(enabledRandomRatios.filter(r => r !== ar));
            } else {
                onEnabledRandomRatiosChange([...enabledRandomRatios, ar]);
            }
        } else {
            onAspectRatioChange(ar);
            // Explicitly set resolution immediately for better responsiveness
            const target = RESOLUTION_MAP[ar];
            onSettingsChange({ ...settings, width: target.w, height: target.h });
        }
    };

    const handleDimensionChange = (dim: 'width' | 'height', val: string) => {
        const num = parseInt(val);
        if (isNaN(num)) return;

        onSettingsChange({
            ...settings,
            [dim]: num
        });
    };

    return (
        <ConfigSection number={2} title="Shape" icon={PhotoIcon}>
            <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase text-gray-500 font-bold">Aspect Ratio</label>
                {onRandomAspectRatioChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-gray-500">Random Start</span>
                        <button
                            onClick={() => onRandomAspectRatioChange(!randomAspectRatio)}
                            className={`relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors ${randomAspectRatio ? 'bg-indigo-600' : 'bg-gray-700'}`}
                        >
                            <span className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${randomAspectRatio ? 'translate-x-3' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
                {AspectRatios.map(ar => {
                    const isActive = randomAspectRatio ? enabledRandomRatios.includes(ar) : aspectRatio === ar;
                    return (
                        <button
                            key={ar}
                            onClick={() => toggleRatio(ar)}
                            className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all ${isActive
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                                : 'bg-[#0a0a0a] border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                                }`}
                        >
                            <span className="text-[10px] font-bold">{ar}</span>
                            <span className="text-[8px] opacity-60 font-mono mt-0.5">
                                {RESOLUTION_MAP[ar].w}x{RESOLUTION_MAP[ar].h}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Resolution Controls */}
            {!randomAspectRatio && (
                <div className="bg-[#0a0a0a] rounded-lg p-2 border border-gray-800">
                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-2">Resolution (Pixels)</label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">W</span>
                            <input
                                type="number"
                                value={settings.width || 1024}
                                onChange={(e) => handleDimensionChange('width', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-2 pl-6 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                        <span className="text-gray-600 text-xs">×</span>
                        <div className="flex-1 relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">H</span>
                            <input
                                type="number"
                                value={settings.height || 1024}
                                onChange={(e) => handleDimensionChange('height', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-2 pl-6 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="mt-1 text-[9px] text-gray-600 text-center font-mono">
                        {(settings.width || 1024) * (settings.height || 1024) / 1000000} MP
                    </div>
                </div>
            )}
        </ConfigSection>
    );
};
