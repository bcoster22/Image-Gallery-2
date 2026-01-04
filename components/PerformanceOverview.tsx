/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Activity, ArrowLeft } from 'lucide-react';
import { QueueMonitor } from './StatusPage/QueueMonitor';
import { AdminSettings } from '../types';
import { ModelInfo } from './PerformanceOverview/types';
import { usePerformanceTest } from '../hooks/usePerformanceTest';
import { useAutoTestRunner } from '../hooks/useAutoTestRunner';
import { ModelList } from './PerformanceOverview/ModelList';
import { PromptConfig } from './PerformanceOverview/PromptConfig';
import { ImageUpload } from './PerformanceOverview/ImageUpload';
import { TestResultModal } from './PerformanceOverview/TestResultModal';
import { ConsoleProgressBar } from './PerformanceOverview/ConsoleProgressBar';

interface PerformanceOverviewProps {
    settings: AdminSettings | null;
    onBack: () => void;
    addToQueue: (items: any[]) => void;

    generationResults: { id: string, url: string }[];
    queueStatus: any; // QueueStatus type
    onPauseQueue?: (paused: boolean) => void;
    onClearQueue?: () => void;
    onRemoveFromQueue?: (ids: string[]) => void;
}

export default function PerformanceOverview({ settings, onBack, addToQueue, generationResults, queueStatus, onPauseQueue, onClearQueue, onRemoveFromQueue }: PerformanceOverviewProps) {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [testPrompt, setTestPrompt] = useState("hot sexy 22 yo woman in bikini posing for sports illustrated model photo shots. long red hair and hazel-green eyes. big teardrop breasts, attention grabbing cleavage.");
    const [testImage, setTestImage] = useState<string | null>(null);
    const [selectedScheduler, setSelectedScheduler] = useState("euler");
    const [selectedResolution, setSelectedResolution] = useState("512x896"); // Portrait default

    const moondreamUrl = settings?.providers.moondream_local.endpoint || 'http://localhost:2020';
    const cleanUrl = moondreamUrl.replace(/\/$/, "").replace(/\/v1$/, "");

    // Unified test state management
    const [testStatuses, setTestStatuses] = useState<Record<string, any>>({});

    // Custom Hooks
    const { testResult, showResultModal, setShowResultModal } = usePerformanceTest(settings);
    const { testStatuses: autoTestStatuses, startAutoTest, runSingleTest, isAutoTesting } = useAutoTestRunner({ addToQueue, settings, generationResults });

    // Merge single test results into table state
    useEffect(() => {
        if (testResult && testResult.modelId) {
            setTestStatuses(prev => ({
                ...prev,
                [testResult.modelId]: testResult
            }));
        }
    }, [testResult]);

    // Merge auto-test results into table state
    useEffect(() => {
        setTestStatuses(prev => ({
            ...prev,
            ...autoTestStatuses
        }));
    }, [autoTestStatuses]);


    useEffect(() => {
        fetchModels();
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
                            onClick={() => {
                                // Auto-clear logs if enabled
                                if ((window as any).__clearConsoleLogs) {
                                    (window as any).__clearConsoleLogs();
                                }
                                startAutoTest(models, testPrompt, selectedScheduler, selectedResolution);
                            }}
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

                {/* Queue Monitor Integration */}
                <div className="mb-6">
                    <QueueMonitor
                        queueStatus={queueStatus}
                        onPauseQueue={onPauseQueue}
                        onClearQueue={onClearQueue}
                        onRemoveFromQueue={onRemoveFromQueue}
                    />
                </div>

                {/* Sub-Components */}
                <ConsoleProgressBar />

                <ModelList
                    models={models}
                    loading={loading}
                    testStatuses={testStatuses}
                    onTestLoad={(model) => {
                        // Queue the single test
                        runSingleTest(model, testPrompt, selectedScheduler, selectedResolution);
                    }}
                />

                <PromptConfig
                    prompt={testPrompt}
                    setPrompt={setTestPrompt}
                    selectedScheduler={selectedScheduler}
                    setSelectedScheduler={setSelectedScheduler}
                    selectedResolution={selectedResolution}
                    setSelectedResolution={setSelectedResolution}
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
