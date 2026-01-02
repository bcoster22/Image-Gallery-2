import React, { useState, useEffect } from 'react';
import { Activity, ArrowLeft } from 'lucide-react';
import { AdminSettings } from '../types';
import { ModelInfo } from './PerformanceOverview/types';
import { usePerformanceTest } from '../hooks/usePerformanceTest';
import { useAutoTestRunner } from '../hooks/useAutoTestRunner';
import { ModelList } from './PerformanceOverview/ModelList';
import { PromptConfig } from './PerformanceOverview/PromptConfig';
import { ImageUpload } from './PerformanceOverview/ImageUpload';
import { TestResultModal } from './PerformanceOverview/TestResultModal';

interface PerformanceOverviewProps {
    settings: AdminSettings | null;
    onBack: () => void;
    addToQueue: (items: any[]) => void;
    generationResults: { id: string, url: string }[];
}

export default function PerformanceOverview({ settings, onBack, addToQueue, generationResults }: PerformanceOverviewProps) {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [testPrompt, setTestPrompt] = useState("hot sexy 22 yo woman in bikini posing for sports illustrated model photo shots. long red hair and hazel-green eyes. big teardrop breasts, attention grabbing cleavage.");
    const [testImage, setTestImage] = useState<string | null>(null);
    const [schedulers, setSchedulers] = useState<string[]>([]);
    const [selectedScheduler, setSelectedScheduler] = useState("dpm++");

    const moondreamUrl = settings?.providers.moondream_local.endpoint || 'http://localhost:2020';
    const cleanUrl = moondreamUrl.replace(/\/$/, "").replace(/\/v1$/, "");

    // Custom Hooks
    const { useAutoTestRunner } = require('../hooks/useAutoTestRunner'); // Dynamic import to avoid top-Level if not exists yet? No, just standard import.
    // I will fix imports in next block.


    const { testResult, showResultModal, setShowResultModal, runTest } = usePerformanceTest(settings);
    const { testStatuses, startAutoTest, isAutoTesting } = useAutoTestRunner({ addToQueue, settings, generationResults });

    useEffect(() => {
        fetchModels();
        fetchSchedulers();
    }, [cleanUrl]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showResultModal) {
                    setShowResultModal(false);
                } else {
                    onBack();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showResultModal, onBack]);

    const fetchSchedulers = async () => {
        try {
            const res = await fetch(`${cleanUrl}/v1/schedulers`);
            if (res.ok) {
                const data = await res.json();
                setSchedulers(data.schedulers || []);
                if (data.schedulers?.includes("dpm++")) setSelectedScheduler("dpm++");
                else if (data.schedulers?.length > 0) setSelectedScheduler(data.schedulers[0]);
            }
        } catch (e) {
            console.warn("Failed to fetch schedulers", e);
        }
    };

    const fetchModels = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${cleanUrl}/v1/models`);
            if (res.ok) {
                const data = await res.json();
                setModels(data.models || []);
            }
        } catch (e) {
            console.error("Failed to fetch models", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-3 hover:bg-white/10 rounded-xl transition-colors" title="Back to Dashboard">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <Activity className="w-8 h-8 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Performance Overview</h1>
                            <p className="text-neutral-400">Validate model integrity and generation benchmarks</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => startAutoTest(models, testPrompt)}
                            disabled={loading || isAutoTesting}
                            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${isAutoTesting ? 'bg-indigo-600/50 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500'
                                }`}
                        >
                            {isAutoTesting ? 'Testing All Models...' : 'Auto Test All'}
                        </button>
                        <button onClick={fetchModels} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors">
                            Refresh List
                        </button>
                    </div>
                </div>

                {/* Sub-Components */}
                <ModelList
                    models={models}
                    loading={loading}
                    testStatuses={testStatuses}
                    onTestLoad={(model) => runTest(model, testPrompt, testImage, selectedScheduler)}
                />

                <PromptConfig
                    prompt={testPrompt}
                    setPrompt={setTestPrompt}
                    schedulers={schedulers}
                    selectedScheduler={selectedScheduler}
                    setSelectedScheduler={setSelectedScheduler}
                />

                <ImageUpload
                    testImage={testImage}
                    setTestImage={setTestImage}
                />

                <TestResultModal
                    testResult={testResult}
                    show={showResultModal}
                    onClose={() => setShowResultModal(false)}
                />
            </div>
        </div>
    );
}
