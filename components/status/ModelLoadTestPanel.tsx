import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminSettings } from '../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MoondreamLocalProvider } from '../../services/providers/moondream';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ==================== TYPES ====================

interface OtelMetrics {
    cpu: number;
    memory: number;
    device: string;
    gpus?: {
        id: number;
        name: string;
        load: number;
        memory_used: number;
        memory_total: number;
        temperature: number;
    }[];
    loaded_models?: {
        id: string;
        name: string;
        vram_mb: number;
        ram_mb: number;
        loaded_at: number;
    }[];
}

interface AvailableModel {
    id: string;
    name: string;
    description: string;
    type?: string;
    size_bytes?: number;
    last_known_vram_mb?: number;  // Static load usage
    last_peak_vram_mb?: number;   // Peak usage during generation
}

interface ModelLoadTestPanelProps {
    otelMetrics: OtelMetrics | null;
    settings: AdminSettings | null;
    onRefreshMetrics: () => Promise<void>;
}

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

interface TestResult {
    status: TestStatus;
    error?: string;
}

interface TestConfig {
    vramSetting: 'low' | 'balanced' | 'high';
    maxVramPct: number;
}

interface ModelTestResult {
    success: boolean;
    vramMb?: number;
    peakVramMb?: number;
    imageData?: string;
    error?: string;
}

// ==================== CONSTANTS ====================

const VRAM_THRESHOLDS = {
    low: 60,
    balanced: 75,
    high: 90
} as const;

const UNLOAD_VERIFICATION_WAIT_MS = 2000;
const POST_UNLOAD_DELAY_MS = 3000;
const POST_LOAD_DELAY_MS = 1000;

const TEST_IMAGE_CONFIG = {
    width: 1024,
    height: 1024,
    steps: 20,
    guidance_scale: 7.0,
    scheduler: 'dpm_pp_2m_karras'
} as const;

const SCROLLBAR_HIDE_STYLE = `
  .models-list-scroll::-webkit-scrollbar {
    display: none;
  }
`;

// ==================== COMPONENT ====================

export default function ModelLoadTestPanel({ otelMetrics, settings, onRefreshMetrics }: ModelLoadTestPanelProps) {
    const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
    const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
    const [modelLoadCounts, setModelLoadCounts] = useState<Record<string, number>>({});
    const [modelUnloadCounts, setModelUnloadCounts] = useState<Record<string, number>>({});
    const [testPrompt, setTestPrompt] = useState('The image features an attractive woman with blonde hair styled in a high ponytail. She is wearing minimal clothing, primarily denim shorts and a necklace. Her pose is suggestive and revealing, emphasizing her breasts. The lighting is controlled, highlighting the subject against a soft, professional studio background.');
    const [generatedImages, setGeneratedImages] = useState<Array<{ modelId: string; modelName: string; imageData: string }>>([]);
    const [currentlyLoadedModels, setCurrentlyLoadedModels] = useState<Set<string>>(new Set());

    const moondreamUrl = useMemo(() => {
        const url = settings?.providers.moondream_local.endpoint || 'http://localhost:2020';
        return url.replace(/\/$/, "").replace(/\/v1$/, "");
    }, [settings]);

    // ==================== DATA FETCHING ====================

    // Fetch available models on mount
    useEffect(() => {
        const fetchModels = async () => {
            if (!settings) return;
            try {
                const provider = new MoondreamLocalProvider();
                const models = await provider.getModels(settings); // Returns { id, name, type? }

                setAvailableModels(models.map(m => ({
                    id: m.id,
                    name: m.name,
                    description: m.type ? `${m.type} model` : 'AI Model',
                    type: m.type
                })));
            } catch (e) {
                console.error("[ModelLoadTestPanel] Failed to fetch models", e);
            }
        };
        fetchModels();
    }, [settings]);

    // Track model loads/unloads from backend metrics
    useEffect(() => {
        if (otelMetrics?.loaded_models) {
            const backendLoadedIds = new Set(otelMetrics.loaded_models.map(m => m.id));

            // Capture VRAM stats from live models into 'Last Known' history
            setAvailableModels(prev => {
                let changed = false;
                const newModels = prev.map(m => {
                    const loaded = otelMetrics.loaded_models?.find(lm => lm.id === m.id);
                    if (loaded && loaded.vram_mb > 0 && m.last_known_vram_mb !== loaded.vram_mb) {
                        changed = true;
                        return { ...m, last_known_vram_mb: loaded.vram_mb };
                    }
                    return m;
                });
                return changed ? newModels : prev;
            });

            // Detect new loads
            backendLoadedIds.forEach((modelId: string) => {
                if (!currentlyLoadedModels.has(modelId)) {
                    setModelLoadCounts(prev => ({
                        ...prev,
                        [modelId]: (prev[modelId] || 0) + 1
                    }));
                }
            });

            // Detect unloads
            currentlyLoadedModels.forEach((modelId) => {
                if (!backendLoadedIds.has(modelId)) {
                    setModelUnloadCounts(prev => ({
                        ...prev,
                        [modelId]: (prev[modelId] || 0) + 1
                    }));
                }
            });

            // Only update if the set actually changed
            const currentIds = Array.from(currentlyLoadedModels).sort().join(',');
            const newIds = Array.from(backendLoadedIds).sort().join(',');
            if (currentIds !== newIds) {
                setCurrentlyLoadedModels(backendLoadedIds);
            }
        }
    }, [otelMetrics, currentlyLoadedModels]);

    // ==================== MODEL TESTING ====================

    // Test a generation model by generating an image
    const testGenerationModel = useCallback(async (model: AvailableModel): Promise<ModelTestResult> => {
        console.log(`[Test] Testing generation model ${model.id} with prompt...`);

        try {
            const genRes = await fetch(`${moondreamUrl}/v1/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Model-ID': model.id
                },
                body: JSON.stringify({
                    prompt: testPrompt,
                    model: model.id,
                    ...TEST_IMAGE_CONFIG
                })
            });

            if (!genRes.ok) {
                const errorText = await genRes.text();
                return { success: false, error: `Generation failed: ${errorText}` };
            }

            const genData = await genRes.json();
            console.log(`[Test] ✓ Generation successful for ${model.id}`);

            // Extract image data
            let imageData: string | undefined;
            if (genData.image || genData.images?.[0]) {
                const rawImageData = genData.image || genData.images[0];
                imageData = rawImageData.startsWith('data:') ? rawImageData : `data:image/png;base64,${rawImageData}`;
            }

            // Get Peak VRAM from stats if available (New backend feature)
            let peakVramMb = genData.stats?.peak_vram_mb;

            // Get Static VRAM usage as fallback or supplementary
            let vramMb: number | undefined;
            if (!peakVramMb) {
                try {
                    const switchRes = await fetch(`${moondreamUrl}/v1/models/switch`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ model: model.id })
                    });
                    if (switchRes.ok) {
                        const switchData = await switchRes.json();
                        vramMb = switchData.vram_mb;
                    }
                } catch (e) {
                    console.warn(`[Test] Could not get VRAM for ${model.id}:`, e);
                }
            }

            return { success: true, vramMb, peakVramMb, imageData };
        } catch (error: any) {
            console.error(`[Test] ✗ Generation failed for ${model.id}:`, error.message);
            return { success: false, error: error.message };
        }
    }, [moondreamUrl, testPrompt]);

    // Test a vision/analysis model by switching to it
    const testVisionModel = useCallback(async (model: AvailableModel): Promise<ModelTestResult> => {
        try {
            const res = await fetch(`${moondreamUrl}/v1/models/switch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: model.id })
            });

            if (!res.ok) {
                const errorText = await res.text();
                let cleanError = errorText;
                try {
                    const jsonErr = JSON.parse(errorText);
                    if (jsonErr.detail) cleanError = jsonErr.detail;
                } catch { }
                return { success: false, error: cleanError };
            }

            const data = await res.json();
            console.log(`[Test] ✓ Loaded ${model.id}:`, data);
            return { success: true, vramMb: data.vram_mb };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }, [moondreamUrl]);

    // Test a single model based on its type
    const testSingleModel = useCallback(async (model: AvailableModel): Promise<ModelTestResult> => {
        if (model.type === 'generation') {
            return testGenerationModel(model);
        } else {
            return testVisionModel(model);
        }
    }, [testGenerationModel, testVisionModel]);

    // ==================== VRAM MANAGEMENT ====================

    // Determine if a model should be unloaded based on VRAM setting
    const shouldUnloadModel = useCallback((config: TestConfig, modelIndex: number, totalModels: number): boolean => {
        const { vramSetting } = config;

        if (vramSetting === 'low') {
            // Low VRAM: Unload each model immediately after testing
            return true;
        } else if (vramSetting === 'balanced' && modelIndex < totalModels - 1) {
            // Balanced: Unload if we have more models to test (keep last one)
            return true;
        } else {
            // High VRAM: Keep models loaded (no unload)
            return false;
        }
    }, []);

    // Enhanced unload verification function
    const verifyUnload = useCallback(async (model: AvailableModel): Promise<boolean> => {
        if (!otelMetrics?.gpus?.[0]) {
            console.warn(`[Test] No GPU metrics available for unload verification`);
            return false;
        }

        // 1. Capture VRAM before unload
        const vramBefore = otelMetrics.gpus[0].memory_used;

        // 2. Call unload endpoint
        const unloadRes = await fetch(`${moondreamUrl}/v1/system/unload`, { method: 'POST' });
        if (!unloadRes.ok) {
            console.error(`[Test] Unload failed for ${model.id}`);
            return false;
        }

        // 3. Wait for model to actually unload and VRAM to free
        await new Promise(resolve => setTimeout(resolve, UNLOAD_VERIFICATION_WAIT_MS));

        // 4. Trigger parent to fetch fresh metrics
        await onRefreshMetrics();

        // 5. Fetch fresh metrics directly to verify
        try {
            const metricsRes = await fetch(`${moondreamUrl}/metrics`);
            if (!metricsRes.ok) {
                console.error(`[Test] Failed to fetch metrics for verification`);
                return false;
            }

            const metricsAfter = await metricsRes.json();
            const vramAfter = metricsAfter.gpus?.[0]?.memory_used;
            const stillLoaded = metricsAfter.loaded_models?.some((m: any) => m.id === model.id);

            // 6. Only count as successful unload if verified
            // We use <= because if metrics were stale (didn't catch the load spike), before might equal after.
            if (!stillLoaded && vramAfter !== undefined && vramAfter <= vramBefore) {
                console.log(`[Test] ✓ Verified unload for ${model.id}: VRAM decreased by ${vramBefore - vramAfter}MB`);
                setModelUnloadCounts(prev => ({
                    ...prev,
                    [model.id]: (prev[model.id] || 0) + 1
                }));
                return true;
            } else {
                console.warn(`[Test] ⚠ Unload verification failed for ${model.id}: stillLoaded=${stillLoaded}, vramBefore=${vramBefore}, vramAfter=${vramAfter}`);
                setTestResults(prev => ({
                    ...prev,
                    [model.id]: { status: 'error', error: 'Unload verification failed' }
                }));
                return false;
            }
        } catch (error) {
            console.error(`[Test] Error during unload verification:`, error);
            return false;
        }
    }, [otelMetrics, moondreamUrl, onRefreshMetrics]);

    // ==================== TEST ORCHESTRATION ====================

    // Get test configuration from settings
    const getTestConfiguration = useCallback((): TestConfig => {
        const vramSetting = settings?.performance?.vramUsage || 'balanced';
        const maxVramPct = VRAM_THRESHOLDS[vramSetting];
        return { vramSetting, maxVramPct };
    }, [settings]);

    // Check if VRAM limit has been reached
    const isVramLimitReached = useCallback((config: TestConfig): boolean => {
        if (!otelMetrics?.gpus?.[0]) return false;

        const gpu = otelMetrics.gpus[0];
        const vramUsedPct = (gpu.memory_used / gpu.memory_total) * 100;

        if (vramUsedPct >= config.maxVramPct) {
            console.log(`[Test] VRAM limit reached (${vramUsedPct.toFixed(1)}% >= ${config.maxVramPct}%). Stopping test.`);
            return true;
        }

        return false;
    }, [otelMetrics]);

    // Process a single model test (load, test, optionally unload)
    const processModelTest = useCallback(async (
        model: AvailableModel,
        index: number,
        config: TestConfig
    ): Promise<{ success: boolean }> => {
        console.log(`[Test] [${index + 1}/${availableModels.length}] Loading ${model.id}...`);

        setTestResults(prev => ({
            ...prev,
            [model.id]: { status: 'loading' }
        }));

        // Test the model
        const result = await testSingleModel(model);

        if (!result.success) {
            // Handle test failure
            setTestResults(prev => ({
                ...prev,
                [model.id]: { status: 'error', error: result.error }
            }));
            return { success: false };
        }

        // Handle test success
        setTestResults(prev => ({
            ...prev,
            [model.id]: { status: 'success' }
        }));

        // Store generated image if available
        if (result.imageData) {
            setGeneratedImages(prev => [...prev, {
                modelId: model.id,
                modelName: model.name,
                imageData: result.imageData!
            }]);
        }

        // Update load count and VRAM history
        if (result.vramMb !== undefined || result.peakVramMb !== undefined) {
            setModelLoadCounts(prev => ({
                ...prev,
                [model.id]: (prev[model.id] || 0) + 1
            }));

            setAvailableModels(prev => prev.map(m =>
                m.id === model.id ? {
                    ...m,
                    last_known_vram_mb: result.vramMb ?? m.last_known_vram_mb,
                    last_peak_vram_mb: result.peakVramMb ?? m.last_peak_vram_mb
                } : m
            ));
        }

        // Handle unloading based on VRAM strategy
        if (shouldUnloadModel(config, index, availableModels.length)) {
            console.log(`[Test] ${config.vramSetting} VRAM mode: Unloading ${model.id} with verification`);
            await verifyUnload(model);
            await new Promise(resolve => setTimeout(resolve, POST_UNLOAD_DELAY_MS));
        } else {
            console.log(`[Test] ${config.vramSetting} VRAM mode: Keeping ${model.id} loaded`);
            await new Promise(resolve => setTimeout(resolve, POST_LOAD_DELAY_MS));
        }

        return { success: true };
    }, [availableModels.length, testSingleModel, shouldUnloadModel, verifyUnload]);

    // Main test handler
    const handleTestLoad = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
        const button = e.currentTarget;
        const originalText = button.innerHTML;

        // Reset previous results
        setTestResults({});
        setGeneratedImages([]);

        try {
            button.disabled = true;
            button.innerHTML = '<span class="flex items-center gap-1.5"><svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Initializing...</span>';

            console.log('[Test] Starting model load cycle...');
            const config = getTestConfiguration();
            console.log(`[Test] VRAM limit: ${config.maxVramPct}% (${config.vramSetting} mode)`);

            let successCount = 0;
            let failCount = 0;

            // Test each model
            for (let i = 0; i < availableModels.length; i++) {
                // Check VRAM before loading next model (skip first model)
                if (i > 0 && isVramLimitReached(config)) {
                    break;
                }

                const model = availableModels[i];

                // Update button with progress
                button.innerHTML = `<span class="flex items-center gap-1.5"><svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>${i + 1}/${availableModels.length}</span>`;

                try {
                    const result = await processModelTest(model, i, config);
                    if (result.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (e) {
                    console.error(`[Test] ✗ Error processing ${model.id}:`, e);
                    failCount++;
                    const errMsg = e instanceof Error ? e.message : String(e);
                    setTestResults(prev => ({
                        ...prev,
                        [model.id]: { status: 'error', error: errMsg }
                    }));
                }
            }

            // Show completion summary
            console.log('[Test] ✓ Cycle complete!');
            alert(`Test Load Complete\n------------------\nSuccess: ${successCount}\nFailed: ${failCount}\n\nVRAM Mode: ${config.vramSetting}\n${config.vramSetting === 'low' ? 'All models unloaded after test' : config.vramSetting === 'balanced' ? 'Last model kept loaded' : 'All models kept in memory'}\n\nCheck the table for details.`);

            button.innerHTML = '<span class="flex items-center gap-1.5"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Complete</span>';
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (e) {
            console.error('[Test] Fatal error:', e);
            button.innerHTML = '<span class="flex items-center gap-1.5">Error</span>';
            await new Promise(resolve => setTimeout(resolve, 2000));
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }, [availableModels, getTestConfiguration, isVramLimitReached, processModelTest]);

    // ==================== RENDER HELPERS ====================

    const sortedModels = useMemo(() => {
        return availableModels.sort((a, b) => {
            const aLoaded = currentlyLoadedModels.has(a.id);
            const bLoaded = currentlyLoadedModels.has(b.id);
            if (aLoaded && !bLoaded) return -1;
            if (!aLoaded && bLoaded) return 1;
            return 0;
        });
    }, [availableModels, currentlyLoadedModels]);

    const getModelDisplayInfo = useCallback((model: AvailableModel) => {
        const isLoaded = currentlyLoadedModels.has(model.id);
        const loadCount = modelLoadCounts[model.id] || 0;
        const unloadCount = modelUnloadCounts[model.id] || 0;
        const testRes = testResults[model.id];

        const loadedModel = otelMetrics?.loaded_models?.find(m => m.id === model.id);
        let vramUsage = '—';
        let ramUsage = '—';
        let sizeDisplay = '—';
        let isHistorical = false;

        if (model.size_bytes) {
            sizeDisplay = `${(model.size_bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
        }

        if (loadedModel) {
            vramUsage = `${(loadedModel.vram_mb / 1024).toFixed(1)}GB`;
            ramUsage = `${(loadedModel.ram_mb / 1024).toFixed(1)}GB`;
        } else if (model.last_peak_vram_mb && model.last_peak_vram_mb > 0) {
            vramUsage = `${(model.last_peak_vram_mb / 1024).toFixed(1)}GB`;
            isHistorical = true;
        } else if (model.last_known_vram_mb && model.last_known_vram_mb > 0) {
            vramUsage = `${(model.last_known_vram_mb / 1024).toFixed(1)}GB`;
            isHistorical = true;
        }

        let typeColor = "text-neutral-500";
        if (model.type === 'vision') typeColor = "text-violet-400";
        else if (model.type === 'generation') typeColor = "text-blue-400";
        else if (model.type === 'analysis') typeColor = "text-amber-400";

        return {
            isLoaded,
            loadCount,
            unloadCount,
            testRes,
            vramUsage,
            ramUsage,
            sizeDisplay,
            isHistorical,
            typeColor
        };
    }, [currentlyLoadedModels, modelLoadCounts, modelUnloadCounts, testResults, otelMetrics]);

    // ==================== RENDER ====================

    return (
        <div className="space-y-2 pt-2 border-t border-white/10">
            <style>{SCROLLBAR_HIDE_STYLE}</style>

            {/* Test Prompt Input */}
            <div className="mb-3">
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Models test prompt</label>
                <textarea
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    className="w-full bg-neutral-800/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500/50 resize-none"
                    rows={3}
                    placeholder="Enter a test prompt for generation models..."
                />
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-400 font-semibold mb-1">
                <div className="flex items-center gap-2">
                    <span>Available Models ({availableModels.length})</span>
                </div>

                {/* Test Button */}
                <button
                    onClick={handleTestLoad}
                    className="group relative px-2.5 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-[10px] font-semibold rounded-md transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Test Load
                    </span>
                </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[24px_1fr_60px_80px_60px_50px_50px_1fr] gap-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider pb-2 border-b border-white/10 mb-2">
                <div className="text-center">●</div>
                <div>Model</div>
                <div>Type</div>
                <div className="text-right">Size</div>
                <div className="text-right">VRAM</div>
                <div className="text-right">Load</div>
                <div className="text-right">Unload</div>
                <div className="text-left">Status/Error</div>
            </div>

            {/* Models List */}
            <div
                className="models-list-scroll space-y-0.5 max-h-48 overflow-y-auto"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                {sortedModels.map(model => {
                    const info = getModelDisplayInfo(model);

                    return (
                        <div
                            key={model.id}
                            className="grid grid-cols-[24px_1fr_60px_80px_60px_50px_50px_1fr] gap-3 text-xs items-center py-1 hover:bg-white/5 rounded transition-colors"
                        >
                            {/* Status Indicator */}
                            <div className="text-center text-base leading-none" title={info.testRes?.error || (info.isLoaded ? 'Loaded' : 'Idle')}>
                                {(() => {
                                    if (info.testRes?.status === 'loading') return '🟡';
                                    if (info.testRes?.status === 'error') return info.testRes.error?.includes('Unload') ? '🟡' : '🔴';
                                    if (info.testRes?.status === 'success') {
                                        const hasVram = (model.last_peak_vram_mb || 0) > 0;
                                        return hasVram ? '🟢' : '🟡';
                                    }
                                    return info.isLoaded ? '🟢' : '⚪';
                                })()}
                            </div>

                            {/* Model Name */}
                            <div className="flex-1 min-w-0">
                                <div className={`text-sm leading-tight truncate ${info.isLoaded ? 'text-white font-medium' : 'text-neutral-300'}`}>
                                    {model.name}
                                </div>
                            </div>

                            {/* Type */}
                            <div className={`text-[10px] uppercase font-bold tracking-wider ${info.typeColor}`}>
                                {model.type || 'UNK'}
                            </div>

                            {/* Size */}
                            <div className="text-right text-xs tabular-nums text-neutral-400">
                                {info.sizeDisplay}
                            </div>

                            {/* VRAM Usage */}
                            <div
                                className={`text-right text-xs tabular-nums ${info.vramUsage !== '—'
                                    ? 'text-white font-medium'
                                    : 'text-neutral-500'
                                    }`}
                                title={
                                    info.isLoaded && !info.isHistorical
                                        ? `RAM: ${info.ramUsage}`
                                        : info.isHistorical && model.last_peak_vram_mb
                                            ? 'Peak VRAM usage during generation'
                                            : info.isHistorical
                                                ? 'Last known VRAM usage'
                                                : ''
                                }
                            >
                                {info.vramUsage}
                            </div>

                            {/* Load Count */}
                            <div className={`text-right text-xs tabular-nums ${info.loadCount > 0 ? 'text-green-400 font-semibold' : 'text-neutral-500'}`}>
                                {info.loadCount}
                            </div>

                            {/* Unload Count */}
                            <div className={`text-right text-xs tabular-nums ${info.unloadCount > 0 ? 'text-blue-400 font-semibold' : 'text-neutral-500'}`}>
                                {info.unloadCount}
                            </div>

                            {/* Status / Error */}
                            <div className="text-xs min-w-0 truncate">
                                {info.testRes?.status === 'loading' && <span className="text-yellow-400 font-medium">Loading</span>}
                                {info.testRes?.status === 'success' && (
                                    info.isLoaded
                                        ? <span className="text-green-400 font-medium">Loaded</span>
                                        : <span className="text-neutral-500">Unloaded</span>
                                )}
                                {info.testRes?.status === 'error' && (
                                    info.testRes.error?.includes('Unload')
                                        ? <span className="text-yellow-400 font-medium" title={info.testRes.error}>{info.testRes.error}</span>
                                        : <span className="text-red-400 font-medium" title={info.testRes.error}>{info.testRes.error || 'Error'}</span>
                                )}
                                {!info.testRes && (
                                    info.isLoaded
                                        ? <span className="text-green-400 font-medium">Loaded</span>
                                        : <span className="text-neutral-500">—</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Generated Images Display */}
            {generatedImages.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs font-semibold text-neutral-400 mb-3">
                        Generated Test Images ({generatedImages.length})
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {generatedImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                                <img
                                    src={img.imageData}
                                    alt={`Generated by ${img.modelName}`}
                                    className="w-full h-auto rounded-lg border border-white/10 hover:border-blue-500/50 transition-all"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b-lg">
                                    <div className="text-[10px] text-white font-medium truncate">{img.modelName}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
