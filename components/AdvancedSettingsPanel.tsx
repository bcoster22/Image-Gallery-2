import React, { useState, useEffect } from 'react';
import { GenerationSettings, UpscaleSettings, AiProvider, GenerationPreset } from '../types';
import {
    loadPresets,
    getPresetsForTaskType,
    applyPreset,
    createPreset,
    setDefaultPreset,
    deletePreset
} from '../utils/presetManager';

interface AdvancedSettingsPanelProps {
    taskType: 'img2img' | 'txt2img' | 'upscale';
    provider: AiProvider | 'auto';
    settings: GenerationSettings | UpscaleSettings;
    onSettingsChange: (settings: GenerationSettings | UpscaleSettings) => void;
    availableModels: string[]; // Model IDs from the selected provider
}

const AdvancedSettingsPanel: React.FC<AdvancedSettingsPanelProps> = ({
    taskType,
    provider,
    settings,
    onSettingsChange,
    availableModels,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [presets, setPresets] = useState<GenerationPreset[]>([]);
    const [selectedPreset, setSelectedPreset] = useState<string>('custom');
    const [showSavePreset, setShowSavePreset] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [availableSchedulers, setAvailableSchedulers] = useState<Array<{
        id: string;
        name: string;
        description: string;
        recommended: boolean;
        optimal_steps_min?: number;
        optimal_steps_max?: number;
    }>>([
        // Fallback defaults
        { id: 'dpm_pp_2m_karras', name: 'DPM++ 2M Karras', description: 'Best quality, works great with 20-35 steps', recommended: true },
        { id: 'euler', name: 'Euler', description: 'Fast and reliable', recommended: false }
    ]);

    // Load presets on mount and when taskType changes
    useEffect(() => {
        const allPresets = getPresetsForTaskType(taskType);
        setPresets(allPresets);
    }, [taskType]);

    // Fetch available schedulers from backend
    useEffect(() => {
        const fetchSchedulers = async () => {
            try {
                const response = await fetch('http://127.0.0.1:2020/v1/schedulers');
                if (response.ok) {
                    const data = await response.json();
                    if (data.schedulers && Array.isArray(data.schedulers)) {
                        setAvailableSchedulers(data.schedulers);
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch schedulers from backend, using defaults:', error);
            }
        };
        fetchSchedulers();
    }, []);

    const isGenerationSettings = (s: any): s is GenerationSettings => {
        return 'steps' in s && 'cfg_scale' in s;
    };

    const isUpscaleSettings = (s: any): s is UpscaleSettings => {
        return 'method' in s && 'scale' in s;
    };

    const updateGeneration = (updates: Partial<GenerationSettings>) => {
        if (isGenerationSettings(settings)) {
            onSettingsChange({ ...settings, ...updates });
            setSelectedPreset('custom'); // Changed from preset
        }
    };

    const updateUpscale = (updates: Partial<UpscaleSettings>) => {
        if (isUpscaleSettings(settings)) {
            onSettingsChange({ ...settings, ...updates });
            setSelectedPreset('custom');
        }
    };

    const handlePresetChange = (presetId: string) => {
        if (presetId === 'custom') {
            setSelectedPreset('custom');
            return;
        }

        const preset = presets.find(p => p.id === presetId);
        if (preset) {
            const newSettings = applyPreset(preset);
            onSettingsChange(newSettings);
            setSelectedPreset(presetId);
        }
    };

    const handleSavePreset = () => {
        if (!presetName.trim()) return;

        const newPreset = createPreset(presetName, taskType, settings);
        setPresets(getPresetsForTaskType(taskType));
        setPresetName('');
        setShowSavePreset(false);
        alert(`Preset "${presetName}" saved!`);
    };

    const handleSetDefault = () => {
        if (selectedPreset !== 'custom') {
            setDefaultPreset(selectedPreset);
            alert('Set as default preset!');
        }
    };

    // Get current scheduler or recommended default
    const getCurrentScheduler = () => {
        if (isGenerationSettings(settings) && settings.scheduler) {
            return settings.scheduler;
        }
        const recommended = availableSchedulers.find(s => s.recommended);
        return recommended?.id || 'dpm_pp_2m_karras';
    };

    const getSchedulerDescription = (schedulerId: string) => {
        const scheduler = availableSchedulers.find(s => s.id === schedulerId);
        return scheduler?.description || '';
    };

    return (
        <div className="border-t border-gray-700 mt-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between text-gray-300 hover:text-white transition-colors"
            >
                <span className="font-medium">⚙️ Advanced Settings</span>
                <span className="text-sm">{isExpanded ? '▼' : '▶'}</span>
            </button>

            {isExpanded && (
                <div className="p-4 space-y-4 bg-gray-900/50">
                    {/* Preset Selector */}
                    <div className="pb-4 border-b border-gray-700">
                        <div className="flex gap-2 mb-2">
                            <select
                                value={selectedPreset}
                                onChange={(e) => handlePresetChange(e.target.value)}
                                className="flex-grow bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="custom">Custom Settings</option>
                                {presets.map((preset) => (
                                    <option key={preset.id} value={preset.id}>
                                        {preset.isDefault ? '⭐ ' : ''}{preset.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => setShowSavePreset(!showSavePreset)}
                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                                title="Save current settings as preset"
                            >
                                💾
                            </button>
                            {selectedPreset !== 'custom' && (
                                <button
                                    onClick={handleSetDefault}
                                    className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                                    title="Set as default"
                                >
                                    ⭐
                                </button>
                            )}
                        </div>

                        {/* Save Preset Form */}
                        {showSavePreset && (
                            <div className="mt-2 flex gap-2">
                                <input
                                    type="text"
                                    value={presetName}
                                    onChange={(e) => setPresetName(e.target.value)}
                                    placeholder="Preset name..."
                                    className="flex-grow bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                    onKeyPress={(e) => e.key === 'Enter' && handleSavePreset()}
                                />
                                <button
                                    onClick={handleSavePreset}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                                >
                                    Save
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Model Selection */}
                    {availableModels.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Model
                            </label>
                            <select
                                value={settings.model}
                                onChange={(e) => {
                                    if (isGenerationSettings(settings)) {
                                        updateGeneration({ model: e.target.value });
                                    } else {
                                        updateUpscale({ model: e.target.value });
                                    }
                                }}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                {availableModels.map((modelId) => (
                                    <option key={modelId} value={modelId}>
                                        {modelId}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Generation Settings (img2img, txt2img) */}
                    {isGenerationSettings(settings) && (
                        <>
                            {/* Steps Slider */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Steps: <span className="text-indigo-400 font-mono">{settings.steps}</span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="250"
                                    value={settings.steps}
                                    onChange={(e) => updateGeneration({ steps: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>1 (Fast)</span>
                                    <span>125</span>
                                    <span>250 (Quality)</span>
                                </div>
                            </div>

                            {/* Scheduler Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Scheduler
                                    <span className="ml-2 text-xs text-gray-500" title="Noise scheduling algorithm">ℹ️</span>
                                </label>
                                <select
                                    value={getCurrentScheduler()}
                                    onChange={(e) => updateGeneration({ scheduler: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    {availableSchedulers.map((scheduler) => (
                                        <option key={scheduler.id} value={scheduler.id}>
                                            {scheduler.recommended ? '⭐ ' : ''}{scheduler.name}
                                            {scheduler.recommended ? ' (Recommended)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {getSchedulerDescription(getCurrentScheduler())}
                                </p>
                            </div>

                            {/* Sampler Selection (Note: In diffusers, samplers are tied to schedulers) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Sampler Type
                                    <span className="ml-2 text-xs text-gray-500" title="Override preset sampler">🔧</span>
                                </label>
                                <select
                                    value={settings.sampler || 'auto'}
                                    onChange={(e) => updateGeneration({ sampler: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="auto">Auto (from preset/model)</option>
                                    <option value="dpmpp_2m_sde_gpu">DPM++ 2M SDE ⭐ (Texture)</option>
                                    <option value="dpmpp_2m">DPM++ 2M ⭐ (Structure)</option>
                                    <option value="dpmpp_3m_sde_gpu">DPM++ 3M SDE (Detail)</option>
                                    <option value="dpmpp_sde_gpu">DPM++ SDE (Lightning)</option>
                                    <option value="euler">Euler (Basic)</option>
                                    <option value="euler_ancestral">Euler Ancestral (Creative)</option>
                                    <option value="restart">Restart (Anatomy Fix)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Note: Some samplers require specific schedulers to work properly
                                </p>
                            </div>

                            {/* Denoise Slider (for img2img only) */}
                            {taskType === 'img2img' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Denoise Strength: <span className="text-indigo-400 font-mono">{settings.denoise}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={settings.denoise}
                                        onChange={(e) => updateGeneration({ denoise: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>0% (Keep original)</span>
                                        <span>50%</span>
                                        <span>100% (Full change)</span>
                                    </div>
                                </div>
                            )}

                            {/* CFG Scale Slider */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    CFG Scale: <span className="text-indigo-400 font-mono">{settings.cfg_scale}</span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    step="0.5"
                                    value={settings.cfg_scale}
                                    onChange={(e) => updateGeneration({ cfg_scale: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>1 (Artistic)</span>
                                    <span>7 (Balanced)</span>
                                    <span>20 (Exact prompt)</span>
                                </div>
                            </div>

                            {/* Seed Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Seed <span className="text-gray-500 text-xs">(-1 for random)</span>
                                </label>
                                <input
                                    type="number"
                                    min="-1"
                                    max="4294967295"
                                    value={settings.seed}
                                    onChange={(e) => updateGeneration({ seed: parseInt(e.target.value) || -1 })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="-1"
                                />
                            </div>
                        </>
                    )}

                    {/* Upscale Settings */}
                    {isUpscaleSettings(settings) && (
                        <>
                            {/* Upscale Method */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Upscale Method
                                    <span className="ml-2 text-xs text-gray-500" title="Choose the AI algorithm for upscaling">ℹ️</span>
                                </label>
                                <select
                                    value={settings.method}
                                    onChange={(e) => updateUpscale({ method: e.target.value as any })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="real-esrgan">Real-ESRGAN (Fast, Photos) ⚡</option>
                                    <option value="sd-upscale">SD Upscale (Best Quality, High VRAM) 🎨</option>
                                    <option value="latent">Latent Upscale (Balanced) ⚖️</option>
                                    <option value="esrgan">ESRGAN (Classic) 📸</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {settings.method === 'real-esrgan' && '⚡ Fastest option, great for photos and realistic images'}
                                    {settings.method === 'sd-upscale' && '🎨 Best quality but slowest and requires most VRAM'}
                                    {settings.method === 'latent' && '⚖️ Good balance between speed and quality'}
                                    {settings.method === 'esrgan' && '📸 Original ESRGAN, reliable for general use'}
                                </p>
                            </div>

                            {/* Target Megapixels Slider */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Target Resolution: <span className="text-purple-400 font-mono">{settings.targetMegapixels}MP</span>
                                    <span className="ml-2 text-xs text-gray-500" title="Output image resolution in megapixels">ℹ️</span>
                                </label>
                                <input
                                    type="range"
                                    min="2"
                                    max="42"
                                    step="1"
                                    value={settings.targetMegapixels}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        // Snap to valid values
                                        const validValues = [2, 4, 6, 8, 16, 24, 32, 42];
                                        const closest = validValues.reduce((prev, curr) =>
                                            Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
                                        );
                                        updateUpscale({ targetMegapixels: closest as any });
                                    }}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                                <div className="grid grid-cols-8 text-xs text-gray-500 mt-1">
                                    <span className="text-center">2MP</span>
                                    <span className="text-center">4MP</span>
                                    <span className="text-center">6MP</span>
                                    <span className="text-center">8MP</span>
                                    <span className="text-center">16MP</span>
                                    <span className="text-center">24MP</span>
                                    <span className="text-center">32MP</span>
                                    <span className="text-center">42MP</span>
                                </div>
                                <div className="text-xs mt-2 text-gray-400">
                                    {settings.targetMegapixels <= 4 && '💡 Perfect for web and social media'}
                                    {settings.targetMegapixels > 4 && settings.targetMegapixels <= 8 && '💡 Good for 4K displays and small prints'}
                                    {settings.targetMegapixels > 8 && settings.targetMegapixels <= 16 && '💡 Professional quality, enable tiling recommended'}
                                    {settings.targetMegapixels > 16 && settings.targetMegapixels <= 24 && '💡 High-end photography, tiling required'}
                                    {settings.targetMegapixels > 24 && '⚠️ Large format - Expect 3-8min, tiling mandatory'}
                                </div>
                            </div>

                            {/* Tiled Upscaling */}
                            <div>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <div className="text-sm font-medium text-gray-300">
                                            Tiled Upscaling
                                            <span className="ml-2 text-xs text-gray-500" title="Process image in smaller tiles to reduce VRAM usage">ℹ️</span>
                                        </div>
                                        <div className="text-xs text-gray-500">Enable for GPUs with &lt;12GB VRAM</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.tiled}
                                        onChange={(e) => updateUpscale({ tiled: e.target.checked })}
                                        className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-purple-600 focus:ring-purple-500"
                                    />
                                </label>
                                <p className="text-xs text-gray-400 mt-1">
                                    {!settings.tiled && settings.targetMegapixels > 16 && '⚠️ Tiling recommended for 16MP+'}
                                    {settings.tiled && '✓ Slower but prevents out-of-memory errors'}
                                </p>
                            </div>

                            {/* Tile Settings (conditional) */}
                            {settings.tiled && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Tile Size: <span className="text-purple-400 font-mono">{settings.tile_size}px</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateUpscale({ tile_size: 512 })}
                                                className={`flex-1 py-2 text-sm rounded-lg transition-colors ${settings.tile_size === 512
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                    }`}
                                            >
                                                512px (4GB)
                                            </button>
                                            <button
                                                onClick={() => updateUpscale({ tile_size: 1024 })}
                                                className={`flex-1 py-2 text-sm rounded-lg transition-colors ${settings.tile_size === 1024
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                    }`}
                                            >
                                                1024px (8GB+)
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Tile Overlap: <span className="text-purple-400 font-mono">{settings.tile_overlap}px</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="8"
                                            max="32"
                                            step="8"
                                            value={settings.tile_overlap}
                                            onChange={(e) => updateUpscale({ tile_overlap: parseInt(e.target.value) as any })}
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>8px (Fast)</span>
                                            <span>16px</span>
                                            <span>32px (Seamless)</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Denoise for SD Upscale */}
                            {settings.method === 'sd-upscale' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Denoise: <span className="text-purple-400 font-mono">{settings.denoise}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={settings.denoise}
                                        onChange={(e) => updateUpscale({ denoise: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* Hints */}
                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg text-xs text-blue-300">
                        <div className="font-medium mb-1">💡 Tips:</div>
                        <ul className="space-y-1 list-disc list-inside">
                            {isGenerationSettings(settings) && (
                                <>
                                    <li>Steps 4-8 for Lightning models, 20-50 for quality</li>
                                    <li>Lower denoise preserves more of original (30-50%)</li>
                                    <li>CFG 7-9 for balanced, 3-5 for creative freedom</li>
                                </>
                            )}
                            {isUpscaleSettings(settings) && (
                                <>
                                    <li>Real-ESRGAN is fastest for photos</li>
                                    <li>Enable tiling if you have &lt;6GB VRAM</li>
                                    <li>32px overlap prevents visible seams</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedSettingsPanel;
