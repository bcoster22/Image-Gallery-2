import React, { useState } from 'react';
import { Info, Maximize2, Layers, Zap } from 'lucide-react';

interface PromptConfigProps {
    prompt: string;
    setPrompt: (value: string) => void;
    selectedScheduler: string;
    setSelectedScheduler: (value: string) => void;
    selectedResolution: string;
    setSelectedResolution: (value: string) => void;
}

// Resolution presets
const RESOLUTIONS = [
    // SDXL
    { value: '512x896', label: '512×896 SDXL', type: 'SDXL', orientation: 'portrait' },
    { value: '640x1536', label: '640×1536 SDXL', type: 'SDXL', orientation: 'portrait' },
    { value: '896x512', label: '896×512 SDXL', type: 'SDXL', orientation: 'landscape' },
    { value: '1536x640', label: '1536×640 SDXL', type: 'SDXL', orientation: 'landscape' },
    { value: '1024x1024', label: '1024×1024 SDXL', type: 'SDXL', orientation: 'square' },
    // FLUX
    { value: '896x1152', label: '896×1152 FLUX', type: 'FLUX', orientation: 'portrait' },
    { value: '1152x896', label: '1152×896 FLUX', type: 'FLUX', orientation: 'landscape' },
    { value: '1344x768', label: '1344×768 FLUX', type: 'FLUX', orientation: 'landscape' },
    { value: '1024x1024', label: '1024×1024 FLUX', type: 'FLUX', orientation: 'square' },
    // SD1.5
    { value: '512x768', label: '512×768 SD1.5', type: 'SD1.5', orientation: 'portrait' },
    { value: '768x512', label: '768×512 SD1.5', type: 'SD1.5', orientation: 'landscape' },
    { value: '512x512', label: '512×512 SD1.5', type: 'SD1.5', orientation: 'square' },
    // HD
    { value: '1536x1024', label: '1536×1024 2K', type: 'HD', orientation: 'landscape' },
    { value: '2048x2048', label: '2048×2048 4K', type: 'HD', orientation: 'square' },
];

const BASE_SCHEDULERS = ['euler', 'euler_a', 'dpm++', 'dpm2', 'ddim', 'pndm', 'lms'];
const VARIANTS = ['normal', 'karras', 'exponential', 'sgm_uniform'];

export function PromptConfig({
    prompt, setPrompt, selectedScheduler, setSelectedScheduler,
    selectedResolution, setSelectedResolution
}: PromptConfigProps) {
    const [showLandscape, setShowLandscape] = useState(false);

    // Parse current scheduler into base + variant
    const parseScheduler = (fullScheduler: string) => {
        const lower = fullScheduler.toLowerCase();
        const variant = VARIANTS.find(v => v !== 'normal' && lower.includes(v));
        const base = variant ? lower.replace(` ${variant}`, '').trim() : lower;
        return { base: base || 'euler', variant: variant || 'normal' };
    };

    const { base: baseScheduler, variant: schedulerVariant } = parseScheduler(selectedScheduler);

    const updateScheduler = (base: string, variant: string) => {
        const combined = variant === 'normal' ? base : `${base} ${variant}`;
        setSelectedScheduler(combined);
    };

    const filtered = RESOLUTIONS.filter(r =>
        r.orientation === 'square' || r.orientation === 'portrait' || (showLandscape && r.orientation === 'landscape')
    );

    const grouped = {
        SDXL: filtered.filter(r => r.type === 'SDXL'),
        FLUX: filtered.filter(r => r.type === 'FLUX'),
        SD15: filtered.filter(r => r.type === 'SD1.5'),
        HD: filtered.filter(r => r.type === 'HD'),
    };

    return (
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Info className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Test Configuration</h2>
                        <p className="text-sm text-neutral-400">Prompt, resolution, and scheduler</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Landscape Toggle */}
                    <label className="flex items-center gap-2 bg-neutral-800/50 p-2 rounded-lg border border-white/5 cursor-pointer hover:bg-neutral-800 transition-colors">
                        <Layers className="w-4 h-4 text-neutral-400" />
                        <input type="checkbox" checked={showLandscape} onChange={(e) => setShowLandscape(e.target.checked)}
                            className="rounded border-neutral-600 bg-neutral-900 text-blue-600 focus:ring-2 focus:ring-blue-500" />
                        <span className="text-xs font-medium text-neutral-400">Landscape</span>
                    </label>

                    {/* Resolution */}
                    <div className="flex items-center gap-2 bg-neutral-800/50 p-2 rounded-lg border border-white/5">
                        <Maximize2 className="w-4 h-4 text-neutral-400" />
                        <select value={selectedResolution} onChange={(e) => setSelectedResolution(e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 min-w-[150px]">
                            {grouped.SDXL.length > 0 && <optgroup label="SDXL">{grouped.SDXL.map(r => <option key={r.value + r.type} value={r.value}>{r.label}</option>)}</optgroup>}
                            {grouped.FLUX.length > 0 && <optgroup label="FLUX">{grouped.FLUX.map(r => <option key={r.value + r.type} value={r.value}>{r.label}</option>)}</optgroup>}
                            {grouped.SD15.length > 0 && <optgroup label="SD 1.5">{grouped.SD15.map(r => <option key={r.value + r.type} value={r.value}>{r.label}</option>)}</optgroup>}
                            {grouped.HD.length > 0 && <optgroup label="High Res">{grouped.HD.map(r => <option key={r.value + r.type} value={r.value}>{r.label}</option>)}</optgroup>}
                        </select>
                    </div>

                    {/* Base Scheduler */}
                    <div className="flex items-center gap-2 bg-neutral-800/50 p-2 rounded-lg border border-white/5">
                        <select value={baseScheduler} onChange={(e) => updateScheduler(e.target.value, schedulerVariant)}
                            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 min-w-[100px]">
                            {BASE_SCHEDULERS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Scheduler Variant */}
                    <div className="flex items-center gap-2 bg-neutral-800/50 p-2 rounded-lg border border-white/5">
                        <Zap className="w-4 h-4 text-neutral-400" />
                        <select value={schedulerVariant} onChange={(e) => updateScheduler(baseScheduler, e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 min-w-[110px]">
                            {VARIANTS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Enter test prompt..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3} />
            <p className="text-xs text-neutral-500 mt-2">
                💡 Generation models create images from this prompt. Vision models verify accuracy.
            </p>
        </div>
    );
}
