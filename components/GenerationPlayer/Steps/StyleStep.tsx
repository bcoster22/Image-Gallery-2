import React from 'react';
import { PaintBrushIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import ConfigSection from '../ConfigSection';
import { GenerationSettings } from '../../../types';
import PresetSelector from '../../PresetSelector';
import { UiProvider } from '../GenerationPlayer.types';

interface StyleStepProps {
    availableProviders: UiProvider[];
    selectedProvider: string;
    onProviderChange: (providerId: string) => void;
    settings: GenerationSettings;
    onSettingsChange: (settings: GenerationSettings) => void;
    prompt: string;
}

export const StyleStep: React.FC<StyleStepProps> = ({
    availableProviders,
    selectedProvider,
    onProviderChange,
    settings,
    onSettingsChange,
    prompt
}) => {

    const updateSetting = (key: keyof GenerationSettings, value: any) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    const currentProviderObj = availableProviders.find(p => p.id === selectedProvider);
    const modelOptions = currentProviderObj?.models?.map(m => ({ value: m, label: m.split('/').pop()?.replace(/-/g, ' ') || m })) || [];

    return (
        <ConfigSection number={3} title="Style" icon={PaintBrushIcon}>
            <div className="space-y-4">
                {/* Provider Selection */}
                <div>
                    <label className="block text-left text-[10px] uppercase text-gray-500 font-bold mb-1">Model Provider</label>
                    <div className="relative">
                        <select
                            value={selectedProvider}
                            onChange={e => onProviderChange(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg py-2 pl-3 pr-8 text-xs text-white appearance-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        >
                            {availableProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <ChevronDownIcon className="w-3 h-3 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                {/* Model Selection Dropdown */}
                <div>
                    <label className="block text-left text-[10px] uppercase text-gray-500 font-bold mb-1">Model Selection</label>
                    <div className="relative">
                        <select
                            value={settings.model}
                            onChange={e => updateSetting('model', e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg py-2 pl-3 pr-8 text-xs text-white appearance-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            disabled={!modelOptions || modelOptions.length === 0}
                        >
                            {(!modelOptions || modelOptions.length === 0) && <option value="">No models available</option>}
                            {modelOptions?.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <ChevronDownIcon className="w-3 h-3 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                <div className="pt-2 border-t border-gray-800">
                    <label className="block text-left text-[10px] uppercase text-gray-500 font-bold mb-2">Style Presets</label>
                    <PresetSelector
                        prompt={prompt}
                        currentPreset={settings.model}
                        onPresetSelect={(presetId, preset) => {
                            onSettingsChange({
                                ...settings,
                                model: preset.model,
                                scheduler: preset.scheduler,
                                steps: preset.steps,
                                cfg_scale: preset.cfg
                            });
                        }}
                    />
                </div>
            </div>
        </ConfigSection>
    );
};
