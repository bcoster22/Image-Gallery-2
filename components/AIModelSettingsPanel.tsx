import React from 'react';
import { AIModelSettings, AiProvider } from '../types';
import NegativePromptSelector from './NegativePromptSelector';

interface AIModelSettingsPanelProps {
    settings: AIModelSettings;
    onChange: (settings: AIModelSettings) => void;
    preset?: 'quick' | 'standard' | 'premium' | 'portrait' | 'landscape';
    availableProviders?: { id: string; name: string }[];
    promptHistory?: string[];
    autoSave?: boolean;
    onAutoSaveChange?: (enabled: boolean) => void;
}

const AIModelSettingsPanel: React.FC<AIModelSettingsPanelProps> = ({ settings, onChange, preset, availableProviders, promptHistory, autoSave, onAutoSaveChange }) => {
    const [showHistory, setShowHistory] = React.useState(false);

    const updateSetting = (key: keyof AIModelSettings, value: any) => {
        onChange({ ...settings, [key]: value });
    };

    // Preset configurations
    const presets = {
        quick: { steps: 6, cfg_scale: 2.0, denoise_strength: 25, model: 'sdxl-lightning' as const, target_megapixels: 4, tiled: false },
        standard: { steps: 30, cfg_scale: 6.5, denoise_strength: 30, model: 'sdxl' as const, target_megapixels: 8, tiled: true },
        premium: { steps: 50, cfg_scale: 7.0, denoise_strength: 35, model: 'sdxl' as const, target_megapixels: 16, tiled: true },
        portrait: { steps: 32, cfg_scale: 7.0, denoise_strength: 25, model: 'sdxl' as const, target_megapixels: 8, tiled: true },
        landscape: { steps: 35, cfg_scale: 7.5, denoise_strength: 35, model: 'sdxl' as const, target_megapixels: 12, tiled: true },
    };

    const examples = [
        "Professional quality, high resolution, sharp focus",
        "Cinematic lighting, 8k, highly detailed",
        "Anime style, vibrant colors, 4k",
        "Old photo restoration, remove scratches, sharpen",
        "Watercolor painting style, artistic, soft edges"
    ];

    const applyPreset = (presetName: keyof typeof presets) => {
        onChange({
            ...settings,
            ...presets[presetName],
        });
    };

    // ... (Helpers omitted for brevity if unchanged, but I need to include them to keep file valid if I replaced the whole simplified component. 
    // Wait, replacing from line 7 means I'm replacing the whole component body basically.
    // I should rewrite the helpers in the replacement content to be safe)

    // Helper for quality indicator
    const getQualityIndicator = (steps: number) => {
        if (steps < 20) return { label: 'Fast', color: 'text-yellow-400' };
        if (steps < 35) return { label: 'Balanced', color: 'text-green-400' };
        return { label: 'Premium', color: 'text-blue-400' };
    };

    const getCFGIndicator = (cfg: number) => {
        if (cfg < 5) return { label: 'Subtle', color: 'text-gray-400' };
        if (cfg < 8) return { label: 'Balanced', color: 'text-green-400' };
        if (cfg < 12) return { label: 'Strong', color: 'text-yellow-400' };
        return { label: 'Very Strong', color: 'text-red-400' };
    };

    const getDenoiseIndicator = (denoise: number) => {
        if (denoise < 25) return { label: 'Minimal', color: 'text-gray-400' };
        if (denoise < 40) return { label: 'Light', color: 'text-green-400' };
        if (denoise < 60) return { label: 'Medium', color: 'text-yellow-400' };
        return { label: 'Heavy', color: 'text-red-400' };
    };

    const qualityIndicator = getQualityIndicator(settings.steps || 30);
    const cfgIndicator = getCFGIndicator(settings.cfg_scale || 7);
    const denoiseIndicator = getDenoiseIndicator(settings.denoise_strength || 30);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                <h3 className="text-sm font-medium text-gray-300">Generation Settings</h3>
                <span className="text-xs text-gray-500">Dec 2025 Standard</span>
            </div>

            {/* Presets */}
            <div>
                <label className="block text-xs text-gray-400 mb-2">Restoration Presets</label>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => applyPreset('quick')} className="px-2 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded transition-colors flex items-center justify-center gap-2">
                        <span>⚡</span> Quick Fix
                    </button>
                    <button onClick={() => applyPreset('standard')} className="px-2 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded transition-colors flex items-center justify-center gap-2">
                        <span>⚖️</span> Standard
                    </button>
                    <button onClick={() => applyPreset('portrait')} className="px-2 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded transition-colors flex items-center justify-center gap-2">
                        <span>👤</span> Portrait
                    </button>
                    <button onClick={() => applyPreset('premium')} className="px-2 py-2 text-xs bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-500/30 rounded transition-colors flex items-center justify-center gap-2">
                        <span>💎</span> 4K Remaster
                    </button>
                </div>
            </div>

            {/* Provider & Model */}
            <div className="space-y-3">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Processing Provider</label>
                    <select
                        value={settings.provider || 'moondream_local'}
                        onChange={(e) => updateSetting('provider', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        {availableProviders && availableProviders.length > 0 ? (
                            availableProviders.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))
                        ) : (
                            <>
                                <option value="moondream_local">Local Workstation (GPU)</option>
                                <option value="gemini">Google Gemini Vision</option>
                                <option value="openai">OpenAI DALL-E 3</option>
                                <option value="comfyui">ComfyUI (Custom)</option>
                            </>
                        )}
                    </select>
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1">
                        AI Architecture
                        <span className="ml-2 text-gray-600" title="Choose the AI model for enhancement">ℹ️</span>
                    </label>
                    <select
                        value={settings.model}
                        onChange={(e) => updateSetting('model', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        {(settings.provider === 'moondream_local' || !settings.provider) ? (
                            <>
                                <optgroup label="Photorealistic">
                                    <option value="sdxl-realism">SDXL Realism (Juggernaut Lightning)</option>
                                </optgroup>
                                <optgroup label="Anime & Illustration">
                                    <option value="sdxl-anime">SDXL Anime (Animagine XL)</option>
                                </optgroup>
                                <optgroup label="Artistic & Surreal">
                                    <option value="sdxl-surreal">SDXL Surreal (DreamShaper Lightning)</option>
                                </optgroup>
                            </>
                        ) : settings.provider === 'gemini' ? (
                            <optgroup label="Google DeepMind">
                                <option value="imagen-3">Imagen 3 (Highest Quality)</option>
                                <option value="imagen-3-fast">Imagen 3 Fast</option>
                            </optgroup>
                        ) : settings.provider === 'openai' ? (
                            <optgroup label="OpenAI">
                                <option value="dall-e-3">DALL-E 3 (Standard)</option>
                                <option value="dall-e-3-hd">DALL-E 3 HD</option>
                            </optgroup>
                        ) : (
                            <optgroup label="Custom">
                                <option value="custom">Custom Workflow</option>
                            </optgroup>
                        )}
                    </select>
                </div>
            </div>

            {/* Resolution & Performance */}
            <div className="space-y-4 pt-2 border-t border-gray-800">
                {/* Target Megapixels */}
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <label className="text-xs text-gray-400">Target Resolution</label>
                        <span className="text-sm font-mono text-indigo-400 font-bold">{settings.target_megapixels || 8} MP</span>
                    </div>
                    <input
                        type="range"
                        min="2"
                        max="42"
                        step="2"
                        value={settings.target_megapixels || 8}
                        onChange={(e) => updateSetting('target_megapixels', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                        <span>2MP (HD)</span>
                        <span>8MP (4K)</span>
                        <span>42MP (8K+)</span>
                    </div>
                </div>

                {/* Tiled Processing */}
                <div className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between border border-gray-700/50">
                    <div>
                        <div className="text-sm text-gray-200">Values Tiled Processing</div>
                        <div className="text-[10px] text-gray-500">Enable for Low VRAM (&lt; 12GB)</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.tiled ?? true}
                            onChange={(e) => updateSetting('tiled', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="pt-2 border-t border-gray-800 space-y-4">

                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Diffusion Parameters</span>
                </div>

                {/* Steps */}
                <div>
                    <label className="block text-xs text-gray-400 mb-2">
                        Steps: <span className="text-white font-mono">{settings.steps}</span>
                        <span className={`ml-2 ${qualityIndicator.color}`}>({qualityIndicator.label})</span>
                    </label>
                    <input
                        type="range"
                        min={settings.model?.includes('lightning') || settings.model?.includes('schnell') ? 4 : 10}
                        max="250"
                        step="1"
                        value={settings.steps || 30}
                        onChange={(e) => updateSetting('steps', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                {/* CFG Scale */}
                <div>
                    <label className="block text-xs text-gray-400 mb-2">
                        CFG Scale: <span className="text-white font-mono">{settings.cfg_scale?.toFixed(1) || 7}</span>
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="16"
                        step="0.5"
                        value={settings.cfg_scale || 7}
                        onChange={(e) => updateSetting('cfg_scale', parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                </div>

                {/* Denoise Strength */}
                <div>
                    <label className="block text-xs text-gray-400 mb-2">
                        Denoise: <span className="text-white font-mono">{settings.denoise_strength || 30}%</span>
                        <span className={`ml-2 ${denoiseIndicator.color}`}>({denoiseIndicator.label})</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={settings.denoise_strength || 30}
                        onChange={(e) => updateSetting('denoise_strength', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>
            </div>

            {/* Prompt */}
            <div className="pt-2 border-t border-gray-800 relative space-y-2">
                <div className="flex items-center justify-between">
                    <label className="block text-xs text-gray-400">Enhancement Prompt (Optional)</label>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-[10px] uppercase font-bold text-indigo-400 hover:text-indigo-300"
                    >
                        {showHistory ? 'Hide Suggestions' : 'View Examples & History'}
                    </button>
                </div>

                {showHistory && (
                    <div className="bg-gray-800 rounded-lg border border-gray-700 p-2 mb-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Examples</div>
                            <div className="space-y-1">
                                {examples.map((ex, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            updateSetting('enhancement_prompt', ex);
                                            setShowHistory(false);
                                        }}
                                        className="block w-full text-left text-xs text-gray-300 hover:text-white hover:bg-white/5 p-1 rounded truncate"
                                    >
                                        {ex}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {promptHistory && promptHistory.length > 0 && (
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 border-t border-gray-700 pt-1">Recent History</div>
                                <div className="space-y-1">
                                    {promptHistory.slice(0, 5).map((p, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                updateSetting('enhancement_prompt', p);
                                                setShowHistory(false);
                                            }}
                                            className="block w-full text-left text-xs text-gray-300 hover:text-white hover:bg-white/5 p-1 rounded truncate"
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <textarea
                    value={settings.enhancement_prompt || ''}
                    onChange={(e) => updateSetting('enhancement_prompt', e.target.value)}
                    placeholder="highly detailed, 8k, sharp focus..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 resize-none min-h-[60px]"
                />

                {/* Negative Prompt */}
                <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Negative Prompt</label>
                    </div>
                    <textarea
                        value={settings.negative_prompt || ''}
                        onChange={(e) => updateSetting('negative_prompt', e.target.value)}
                        placeholder="Things to avoid..."
                        className="w-full h-16 bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-gray-400 placeholder-gray-600 resize-none focus:border-red-900 focus:outline-none transition-colors"
                    />
                    <div className="mt-2">
                        <NegativePromptSelector
                            currentPrompt={settings.negative_prompt || ''}
                            onSelectTemplate={(val) => updateSetting('negative_prompt', val)}
                            onSaveCustom={(val) => updateSetting('negative_prompt', val)}
                            customTemplates={[]} // We don't have history passed down here yet
                        />
                    </div>
                </div>

                {/* Auto Save Toggle */}
                {onAutoSaveChange && (
                    <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-gray-400">
                            Auto Save to Gallery
                            <div className="text-[10px] text-gray-600">Automatically save enhancements</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={autoSave}
                                onChange={(e) => onAutoSaveChange(e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIModelSettingsPanel;
