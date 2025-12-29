import React, { useState, useEffect } from 'react';
import { Activity, Play, CheckCircle, XCircle, Clock, Eye, Download, Info } from 'lucide-react';
import { AdminSettings } from '../types';

interface ModelInfo {
    id: string;
    name: string;
    description: string;
    version: string;
    last_known_vram_mb?: number;
    type: 'generation' | 'analysis' | 'vision';
    is_downloaded?: boolean;
}

interface TestResult {
    modelId: string;
    status: 'idle' | 'loading' | 'generating' | 'verifying' | 'success' | 'failure';
    generationTimeMs?: number;
    generatedImageUrl?: string;
    verificationResult?: string;
    error?: string;
}

interface PerformanceOverviewProps {
    settings: AdminSettings | null;
    onBack: () => void;
}

export default function PerformanceOverview({ settings, onBack }: PerformanceOverviewProps) {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [testPrompt, setTestPrompt] = useState("hot sexy 22 yo woman in bikini posing for sports illustrated model photo shots. long red hair and hazel-green eyes. big teardrop breasts, attention grabbing cleavage.");

    const moondreamUrl = settings?.providers.moondream_local.endpoint || 'http://localhost:2020';
    const cleanUrl = moondreamUrl.replace(/\/$/, "").replace(/\/v1$/, "");

    useEffect(() => {
        fetchModels();
    }, [cleanUrl]);

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

    const handleTestLoad = async (model: ModelInfo) => {
        setTestResult({
            modelId: model.id,
            status: 'loading',
        });
        setShowResultModal(true);

        const startTime = Date.now();

        try {
            // 1. Trigger Generation (360x720) using custom prompt
            const prompt = testPrompt;

            let imageUrl: string | undefined;

            if (model.type === 'generation') {
                setTestResult(prev => ({ ...prev!, status: 'generating' }));

                const genRes = await fetch(`${cleanUrl}/v1/images/generations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: model.id,
                        prompt: prompt,
                        n: 1,
                        size: "360x720", // Custom size as requested
                        response_format: "b64_json"
                    })
                });

                if (!genRes.ok) throw new Error("Generation failed");

                const genData = await genRes.json();
                if (genData.data && genData.data[0]) {
                    imageUrl = `data:image/png;base64,${genData.data[0].b64_json}`;
                } else {
                    throw new Error("No image returned");
                }

            } else {
                // For vision models, we might skip generation or use a placeholder to test their analysis
                // But user asked to test generation. If it's a vision model, we can't generate.
                // We'll skip generation for vision models and just test basic checking?
                // Actually the prompt implies testing GENERATION models.
                // If it's a vision model, we might just ping it.
                imageUrl = undefined;
            }

            const genTime = Date.now() - startTime;

            // 2. Verification (Using Vision Model)
            // Only verify if we have an image
            let verification = "Skipped";
            if (imageUrl) {
                setTestResult(prev => ({ ...prev!, status: 'verifying', generationTimeMs: genTime, generatedImageUrl: imageUrl }));

                // Assuming moondream-2 is available for verification or we use the current model if it's dual?
                // We call the default vision endpoint
                try {
                    const verifyRes = await fetch(`${cleanUrl}/v1/chat/completions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: "moondream-2", // Use a known stable validator if possible, or 'moondream-local'
                            messages: [
                                {
                                    role: "user",
                                    content: [
                                        { type: "text", text: `Does this image match the prompt: "${prompt}"? Describe what you see.` },
                                        { type: "image_url", image_url: { url: imageUrl } }
                                    ]
                                }
                            ],
                            max_tokens: 50
                        })
                    });

                    if (verifyRes.ok) {
                        const vData = await verifyRes.json();
                        verification = vData.choices?.[0]?.message?.content || "Verified";
                    } else {
                        verification = "Verification Service Unavailable";
                    }
                } catch (e) {
                    verification = "Verification Failed: " + String(e);
                }
            }

            setTestResult({
                modelId: model.id,
                status: 'success',
                generationTimeMs: genTime,
                generatedImageUrl: imageUrl,
                verificationResult: verification
            });

            // trigger unload after test?
            // fetch(`${cleanUrl}/v1/system/unload`, { method: 'POST' });

        } catch (e: any) {
            console.error(e);
            setTestResult({
                modelId: model.id,
                status: 'failure',
                error: e.message
            });
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-3 hover:bg-white/10 rounded-xl transition-colors">
                            <Clock className="w-6 h-6 rotate-180" /> {/* Conceptually 'Back' arrow, utilizing existing icon for now */}
                        </button>
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <Activity className="w-8 h-8 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Performance Overview</h1>
                            <p className="text-neutral-400">Validate model integrity and generation benchmarks</p>
                        </div>
                    </div>
                    <button onClick={fetchModels} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors">
                        Refresh List
                    </button>
                </div>

                {/* Model List */}
                <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        <div className="col-span-4">Model Name</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-1 text-right">VRAM</div>
                        <div className="col-span-1 text-center">Config</div>
                        <div className="col-span-2 text-right">Action</div>
                    </div>

                    <div className="divide-y divide-white/5">
                        {models.map(model => (
                            <div key={model.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors">
                                <div className="col-span-4">
                                    <div className="font-medium text-white">{model.name}</div>
                                    <div className="text-xs text-neutral-500 truncate">{model.id}</div>
                                </div>

                                <div className="col-span-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${model.type === 'generation' ? 'bg-blue-500/20 text-blue-300' :
                                        model.type === 'analysis' ? 'bg-green-500/20 text-green-300' :
                                            'bg-neutral-500/20 text-neutral-300'
                                        }`}>
                                        {model.type?.toUpperCase()}
                                    </span>
                                </div>

                                <div className="col-span-2 flex items-center gap-2">
                                    {model.is_downloaded ? (
                                        <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Ready</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-neutral-500 text-sm">
                                            <Download className="w-4 h-4" />
                                            <span>Remote</span>
                                        </div>
                                    )}
                                </div>

                                <div className="col-span-1 text-right text-neutral-300 font-mono text-sm">
                                    {model.last_known_vram_mb ? `${(model.last_known_vram_mb / 1024).toFixed(1)} GB` : '-'}
                                </div>

                                <div className="col-span-1 text-center font-mono text-xs text-neutral-500">
                                    FP16
                                </div>

                                <div className="col-span-2 flex justify-end">
                                    <button
                                        onClick={() => handleTestLoad(model)}
                                        disabled={!model.is_downloaded && model.type === 'generation'}
                                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                            ${model.type === 'generation'
                                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                                                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'}
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                                    >
                                        <Play className="w-3 h-3 fill-current" />
                                        Test Load
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {models.length === 0 && !loading && (
                        <div className="p-8 text-center text-neutral-500">No models found. Check connection to Moondream Station.</div>
                    )}
                </div>

                {/* Prompt Configuration */}
                <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Info className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Test Prompt</h2>
                            <p className="text-sm text-neutral-400">Used for generation models and vision verification</p>
                        </div>
                    </div>
                    <textarea
                        value={testPrompt}
                        onChange={(e) => setTestPrompt(e.target.value)}
                        placeholder="Enter your test prompt..."
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={3}
                    />
                    <p className="text-xs text-neutral-500 mt-2">
                        💡 Generation models will create an image from this prompt. Vision models will verify if the generated image matches.
                    </p>
                </div>
            </div>

            {/* Result Modal */}
            {showResultModal && testResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">

                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-neutral-800/50">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                {testResult.status === 'loading' || testResult.status === 'generating' ? (
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                ) : testResult.status === 'success' ? (
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                )}
                                Performance Test: {testResult.modelId}
                            </h3>
                            <button onClick={() => setShowResultModal(false)} className="p-1 hover:bg-white/10 rounded">
                                <XCircle className="w-6 h-6 text-neutral-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">

                            {/* Status Steps */}
                            <div className="flex items-center gap-2 text-sm text-neutral-400">
                                <div className={`flex items-center gap-2 ${['loading', 'generating', 'verifying', 'success'].includes(testResult.status) ? 'text-blue-400' : ''}`}>
                                    <div className="w-2 h-2 rounded-full bg-current" />
                                    Init
                                </div>
                                <div className="w-8 h-px bg-white/10" />
                                <div className={`flex items-center gap-2 ${['generating', 'verifying', 'success'].includes(testResult.status) ? 'text-blue-400' : ''}`}>
                                    <div className="w-2 h-2 rounded-full bg-current" />
                                    Generation
                                </div>
                                <div className="w-8 h-px bg-white/10" />
                                <div className={`flex items-center gap-2 ${['verifying', 'success'].includes(testResult.status) ? 'text-blue-400' : ''}`}>
                                    <div className="w-2 h-2 rounded-full bg-current" />
                                    Verification
                                </div>
                            </div>

                            {testResult.generatedImageUrl && (
                                <div className="bg-black rounded-lg overflow-hidden border border-white/10 relative group">
                                    <img src={testResult.generatedImageUrl} alt="Generated Test" className="w-full h-auto max-h-[400px] object-contain mx-auto" />
                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-mono">
                                        {testResult.generationTimeMs ? `${(testResult.generationTimeMs / 1000).toFixed(2)}s` : '...'}
                                    </div>
                                </div>
                            )}

                            {testResult.error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl text-sm">
                                    {testResult.error}
                                </div>
                            )}

                            {testResult.verificationResult && (
                                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                                    <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Eye className="w-3 h-3" />
                                        AI Verification Result
                                    </div>
                                    <p className="text-sm text-blue-100">{testResult.verificationResult}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-neutral-800/30 border-t border-white/10 flex justify-end gap-3">
                            <button onClick={() => setShowResultModal(false)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm">
                                Close
                            </button>
                        </div>
                    </div>
                </div>


            )}
        </div>
    );
}
