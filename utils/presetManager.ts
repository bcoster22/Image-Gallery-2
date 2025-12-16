import { GenerationPreset, GenerationSettings, UpscaleSettings } from '../types';

const PRESETS_STORAGE_KEY = 'generation_presets';
const DEFAULT_PRESET_KEY_PREFIX = 'default_preset_';

// Default presets for each task type
export const DEFAULT_PRESETS: GenerationPreset[] = [
    {
        id: 'quick-gen',
        name: 'Quick (Lightning)',
        taskType: 'img2img',
        generation: {
            provider: 'moondream_local',
            model: 'sdxl-lightning',
            steps: 4,
            denoise: 75,
            cfg_scale: 7,
            seed: -1,
        },
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: 'quality-gen',
        name: 'Quality (Standard)',
        taskType: 'img2img',
        generation: {
            provider: 'moondream_local',
            model: 'sdxl-realism',
            steps: 30,
            denoise: 75,
            cfg_scale: 8,
            seed: -1,
        },
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: 'quick-upscale',
        name: 'Quick 4MP',
        taskType: 'upscale',
        upscale: {
            provider: 'moondream_local',
            model: 'real-esrgan-x4plus',
            method: 'real-esrgan',
            targetMegapixels: 4,
            tiled: false,
            tile_size: 512,
            tile_overlap: 16,
            denoise: 0,
        },
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: '4k-upscale',
        name: '8MP High Quality',
        taskType: 'upscale',
        upscale: {
            provider: 'moondream_local',
            model: 'real-esrgan-x4plus',
            method: 'real-esrgan',
            targetMegapixels: 8,
            tiled: true,
            tile_size: 512,
            tile_overlap: 32,
            denoise: 0,
        },
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
];

/**
 * Load all presets from localStorage, merge with defaults
 */
export const loadPresets = (): GenerationPreset[] => {
    try {
        const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
        if (!stored) {
            // First time - save defaults
            savePresets(DEFAULT_PRESETS);
            return DEFAULT_PRESETS;
        }

        const userPresets: GenerationPreset[] = JSON.parse(stored);
        // Merge user presets with defaults (user presets take precedence)
        const defaultIds = DEFAULT_PRESETS.map(p => p.id);
        const userPresetIds = userPresets.map(p => p.id);

        const missingDefaults = DEFAULT_PRESETS.filter(dp => !userPresetIds.includes(dp.id));
        const allPresets = [...userPresets, ...missingDefaults];

        return allPresets;
    } catch (error) {
        console.error('Failed to load presets:', error);
        return DEFAULT_PRESETS;
    }
};

/**
 * Save presets to localStorage
 */
export const savePresets = (presets: GenerationPreset[]): void => {
    try {
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
        console.error('Failed to save presets:', error);
    }
};

/**
 * Create a new preset
 */
export const createPreset = (
    name: string,
    taskType: 'img2img' | 'txt2img' | 'upscale',
    settings: GenerationSettings | UpscaleSettings
): GenerationPreset => {
    const now = Date.now();
    const preset: GenerationPreset = {
        id: `user-${now}`,
        name,
        taskType,
        generation: 'steps' in settings ? settings : undefined,
        upscale: 'method' in settings ? settings : undefined,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
    };

    const presets = loadPresets();
    presets.push(preset);
    savePresets(presets);

    return preset;
};

/**
 * Update an existing preset
 */
export const updatePreset = (
    id: string,
    updates: Partial<Omit<GenerationPreset, 'id' | 'createdAt'>>
): void => {
    const presets = loadPresets();
    const index = presets.findIndex(p => p.id === id);

    if (index === -1) return;

    presets[index] = {
        ...presets[index],
        ...updates,
        updatedAt: Date.now(),
    };

    savePresets(presets);
};

/**
 * Delete a preset
 */
export const deletePreset = (id: string): void => {
    const presets = loadPresets();
    const filtered = presets.filter(p => p.id !== id);
    savePresets(filtered);
};

/**
 * Get default preset for a task type
 */
export const getDefaultPreset = (taskType: 'img2img' | 'txt2img' | 'upscale'): GenerationPreset | null => {
    const presets = loadPresets();

    // First check localStorage for user-set default
    const defaultId = localStorage.getItem(`${DEFAULT_PRESET_KEY_PREFIX}${taskType}`);
    if (defaultId) {
        const preset = presets.find(p => p.id === defaultId);
        if (preset) return preset;
    }

    // Fallback to first preset marked as default
    const defaultPreset = presets.find(p => p.taskType === taskType && p.isDefault);
    if (defaultPreset) return defaultPreset;

    // Ultimate fallback: first preset of this type
    return presets.find(p => p.taskType === taskType) || null;
};

/**
 * Set a preset as default for its task type
 */
export const setDefaultPreset = (id: string): void => {
    const presets = loadPresets();
    const preset = presets.find(p => p.id === id);

    if (!preset) return;

    // Save to localStorage
    localStorage.setItem(`${DEFAULT_PRESET_KEY_PREFIX}${preset.taskType}`, id);

    // Update all presets of this task type
    const updated = presets.map(p => ({
        ...p,
        isDefault: p.id === id && p.taskType === preset.taskType,
    }));

    savePresets(updated);
};

/**
 * Get presets for a specific task type
 */
export const getPresetsForTaskType = (taskType: 'img2img' | 'txt2img' | 'upscale'): GenerationPreset[] => {
    const presets = loadPresets();
    return presets.filter(p => p.taskType === taskType);
};

/**
 * Apply a preset to current settings
 */
export const applyPreset = (preset: GenerationPreset): GenerationSettings | UpscaleSettings => {
    if (preset.generation) {
        return { ...preset.generation };
    } else if (preset.upscale) {
        return { ...preset.upscale };
    }

    // Fallback default
    return {
        provider: 'moondream_local',
        model: 'sdxl-realism',
        steps: 8,
        denoise: 75,
        cfg_scale: 7,
        seed: -1,
    } as GenerationSettings;
};
