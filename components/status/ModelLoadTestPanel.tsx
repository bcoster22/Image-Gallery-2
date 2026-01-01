import React, { useEffect, useState, useMemo } from 'react';
import { AdminSettings } from '../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ModelSelector } from './ModelLoadTest/ModelSelector';

import { TestStatusDisplay } from './ModelLoadTest/TestStatusDisplay';
import { AvailableModel } from './ModelLoadTest/types';
import { useModelTest } from '../../hooks/useModelTest';
import { Beaker } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Re-defining OtelMetrics interface locally if not exported from types
// or import it if better. Assuming similar shape usage for now.
interface OtelMetrics {
    gpus?: {
        memory_used: number;
        memory_total: number;
    }[];
    memory: number; // RAM used bytes
    memory_total?: number; // RAM total bytes (inferred or needed)
}

interface ModelLoadTestPanelProps {
    otelMetrics: any | null; // Typed loosely to match existing usage if strict type is complex
    settings: AdminSettings | null;
    onRefreshMetrics: () => Promise<void>;
}

export default function ModelLoadTestPanel({ otelMetrics, settings, onRefreshMetrics }: ModelLoadTestPanelProps) {
    const {
        testStatus,
        modelTestResult,
        isTestRunning,
        selectedModelId,
        setSelectedModelId,
        startModelTest,
        testConfig
    } = useModelTest(settings, otelMetrics, onRefreshMetrics);

    const [models, setModels] = useState<AvailableModel[]>([]);

    useEffect(() => {
        // Fetch models manually or reuse existing logic. 
        // Ideally this should be in the hook or separate service call
        const fetchModels = async () => {
            const moondreamUrl = settings?.providers.moondream_local.endpoint || 'http://localhost:2020';
            const cleanUrl = moondreamUrl.replace(/\/$/, "").replace(/\/v1$/, "");
            try {
                const res = await fetch(`${cleanUrl}/v1/models`);
                if (res.ok) {
                    const data = await res.json();
                    setModels((data.models || []) as AvailableModel[]);
                }
            } catch (e) { console.warn("Failed to fetch models for panel", e); }
        };
        fetchModels();
    }, [settings]);



    return (
        <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
            <div className="p-4 border-b border-white/5 bg-neutral-800/50 flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Beaker className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h2 className="font-bold text-white">Model Load Testing</h2>
                    <p className="text-xs text-neutral-400">Verify VRAM impact & inference stability</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">



                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Col: Selector */}
                    <div className="space-y-4">
                        <ModelSelector
                            models={models}
                            selectedModelId={selectedModelId}
                            isTestRunning={isTestRunning}
                            onSelectModel={setSelectedModelId}
                            onRunTest={startModelTest}
                        />
                    </div>

                    {/* Right Col: Status and Results */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Test Progress</h3>
                        <TestStatusDisplay
                            status={testStatus}
                            modelTestResult={modelTestResult}
                            currentModelId={selectedModelId}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
