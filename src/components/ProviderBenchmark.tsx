import React, { useState } from 'react';
import { AdminSettings, AiProvider, ProviderStats } from '../../types';
import { registry } from '../../services/providerRegistry';
import { CheckCircle, XCircle, Play, Loader, Activity } from 'lucide-react';

// A small 1x1 transparent GIF base64 for testing
const TEST_IMAGE_DATA_URL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

interface BenchmarkResult {
    providerId: AiProvider;
    status: 'idle' | 'running' | 'success' | 'error';
    stats?: ProviderStats;
    error?: string;
}

interface ProviderBenchmarkProps {
    settings: AdminSettings | null;
}

export const ProviderBenchmark: React.FC<ProviderBenchmarkProps> = ({ settings }) => {
    const [results, setResults] = useState<Record<string, BenchmarkResult>>({});
    const [isRunningAll, setIsRunningAll] = useState(false);

    const providers = registry.getProviders();

    const runBenchmark = async (providerId: AiProvider) => {
        if (!settings) return;
        setResults(prev => ({
            ...prev,
            [providerId]: { providerId, status: 'running' }
        }));

        const provider = registry.getProvider(providerId);
        if (!provider) return;

        // We primarily benchmark Vision capabilities as requested
        // If a provider doesn't support vision, we might skip or try a connection test?
        // For now, let's stick to the user's request "tested with an image"
        if (!provider.capabilities.vision) {
            setResults(prev => ({
                ...prev,
                [providerId]: {
                    providerId,
                    status: 'error',
                    error: 'Vision capability not supported'
                }
            }));
            return;
        }

        const startTime = Date.now();
        try {
            // Create a dummy ImageInfo
            const dummyImage = {
                id: 'benchmark-test',
                fileName: 'benchmark.gif',
                file: new File([], "benchmark.gif"),
                dataUrl: TEST_IMAGE_DATA_URL,
                width: 1,
                height: 1
            };

            // We call the provider directly to bypass routing logic and test specific provider
            // But analyzeImage in aiService uses routing. 
            // We should use the provider instance directly if possible, or force routing?
            // The registry gives us the instance. We can call analyzeImage on it directly.
            // However, we need to cast it or ensure it has the method.
            // IAiProvider has optional analyzeImage.

            if (!provider.analyzeImage) {
                throw new Error("analyzeImage method not implemented");
            }

            const result = await provider.analyzeImage(dummyImage, settings);

            // If provider didn't return stats, we calculate duration at least
            const duration = (Date.now() - startTime) / 1000;
            const finalStats = result.stats || { duration };

            setResults(prev => ({
                ...prev,
                [providerId]: {
                    providerId,
                    status: 'success',
                    stats: finalStats
                }
            }));

        } catch (error: any) {
            setResults(prev => ({
                ...prev,
                [providerId]: {
                    providerId,
                    status: 'error',
                    error: error.message || 'Unknown error'
                }
            }));
        }
    };

    const runAllBenchmarks = async () => {
        setIsRunningAll(true);
        for (const provider of providers) {
            if (provider.capabilities.vision) {
                await runBenchmark(provider.id);
            }
        }
        setIsRunningAll(false);
    };

    return (
        <div className="bg-gray-900 rounded-lg p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Provider Benchmark
                </h2>
                <button
                    onClick={runAllBenchmarks}
                    disabled={isRunningAll}
                    className={`px - 4 py - 2 rounded - md font - medium transition - colors flex items - center gap - 2 ${isRunningAll
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                        } `}
                >
                    {isRunningAll ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Run All
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.map(provider => {
                    const result = results[provider.id];
                    const isVision = provider.capabilities.vision;

                    return (
                        <div key={provider.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-medium text-gray-200">{provider.name}</h3>
                                    <p className="text-xs text-gray-500">{provider.id}</p>
                                </div>
                                {result?.status === 'running' && <Loader className="w-5 h-5 text-blue-400 animate-spin" />}
                                {result?.status === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
                                {result?.status === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
                            </div>

                            {!isVision && (
                                <div className="text-xs text-gray-500 italic">Vision not supported</div>
                            )}

                            {result?.status === 'success' && result.stats && (
                                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                    <div className="bg-gray-700/50 p-2 rounded">
                                        <span className="text-gray-400 text-xs block">Latency</span>
                                        <span className={`font - mono ${result.stats.duration < 2 ? 'text-green-400' : 'text-yellow-400'} `}>
                                            {result.stats.duration.toFixed(2)}s
                                        </span>
                                    </div>
                                    {result.stats.totalTokens !== undefined && (
                                        <div className="bg-gray-700/50 p-2 rounded">
                                            <span className="text-gray-400 text-xs block">Tokens</span>
                                            <span className="font-mono text-gray-200">{result.stats.totalTokens}</span>
                                        </div>
                                    )}
                                    {result.stats.tokensPerSec !== undefined && (
                                        <div className="bg-gray-700/50 p-2 rounded">
                                            <span className="text-gray-400 text-xs block">Speed</span>
                                            <span className="font-mono text-blue-400">{result.stats.tokensPerSec.toFixed(1)} t/s</span>
                                        </div>
                                    )}
                                    {result.stats.device && (
                                        <div className="bg-gray-700/50 p-2 rounded">
                                            <span className="text-gray-400 text-xs block">Device</span>
                                            <span className="font-mono text-purple-400 truncate" title={result.stats.device}>
                                                {result.stats.device}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {result?.status === 'error' && (
                                <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded mt-2 break-words">
                                    {result.error}
                                </div>
                            )}

                            {isVision && (
                                <button
                                    onClick={() => runBenchmark(provider.id)}
                                    disabled={result?.status === 'running'}
                                    className="mt-auto w-full py-1.5 px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
                                >
                                    {result ? 'Re-run' : 'Run Test'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
