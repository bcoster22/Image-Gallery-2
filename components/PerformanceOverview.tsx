import React, { useState, useEffect } from 'react';
import { Activity, Play, CheckCircle, XCircle, Clock, Eye, Download, Info, ArrowLeft } from 'lucide-react';
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
    eyeCropUrl?: string;
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
    const [testImage, setTestImage] = useState<string | null>(null);
    const [schedulers, setSchedulers] = useState<string[]>([]);
    const [selectedScheduler, setSelectedScheduler] = useState("dpm++");

    const moondreamUrl = settings?.providers.moondream_local.endpoint || 'http://localhost:2020';
    const cleanUrl = moondreamUrl.replace(/\/$/, "").replace(/\/v1$/, "");

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
                // Default to dpm++ if available
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

    const handleTestLoad = async (model: ModelInfo) => {
        setTestResult({
            modelId: model.id,
            status: 'loading',
        });
        setShowResultModal(true);

        const startTime = Date.now();

        try {
            // 1. Trigger Generation (16:9 aspect ratio for better composition) using custom prompt
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
                        size: "896x512", // 16:9 Aspect Ratio (approx) optimized for SDXL/SD1.5
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
                // For vision/analysis models, utilize the uploaded test image if available
                if (testImage) {
                    imageUrl = testImage;
                } else {
                    // Auto-Generate Fallback
                    const genModel = models.find(m => m.type === 'generation') || { id: 'sdxl-realism' }; // Fallback to ID if list empty

                    // Inform user of auto-generation
                    setTestResult(prev => ({ ...prev!, status: 'generating' }));

                    // Use /v1/generate endpoint which is supported by the backend
                    const genRes = await fetch(`${cleanUrl}/v1/generate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: genModel.id,
                            prompt: prompt,
                            width: 896,
                            height: 512,
                            steps: 30,
                            scheduler: selectedScheduler
                        })
                    });

                    if (!genRes.ok) throw new Error("Auto-generation failed. Please upload an image.");

                    const genData = await genRes.json();
                    const b64 = genData.data?.[0]?.b64_json || genData.images?.[0];

                    if (b64) {
                        imageUrl = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
                        setTestImage(imageUrl);
                    } else {
                        throw new Error("No image returned from auto-generation.");
                    }
                }
            }

            const genTime = Date.now() - startTime;

            // 2. Verification / Analysis Test
            // Only verify if we have an image
            let verification = "Skipped";
            if (imageUrl) {
                setTestResult(prev => ({ ...prev!, status: 'verifying', generationTimeMs: genTime, generatedImageUrl: imageUrl }));

                // Use the best available vision model for verification, or the model itself if it IS a vision model
                const verifyModel = model.type === 'vision' || model.type === 'analysis' ? model.id : "moondream-2";

                try {
                    const verifyRes = await fetch(`${cleanUrl}/v1/chat/completions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: verifyModel,
                            messages: [
                                {
                                    role: "user",
                                    content: [
                                        { type: "text", text: `Analyze this image in detail. Does it match the description: "${prompt}"? Provide a professional breakdown.` },
                                        { type: "image_url", image_url: { url: imageUrl } }
                                    ]
                                }
                            ],
                            max_tokens: 150
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

            // 3. Eye/Face Crop (Identity Check)
            // Perform basic object detection for 'eyes' or 'face' to assist admin review
            let cropUrl: string | undefined;
            if (imageUrl) {
                // Always use moondream-2 for object detection utility as it's optimized for this prompt/json structure
                const detectorModel = "moondream-2";
                try {
                    const detectRes = await fetch(`${cleanUrl}/v1/chat/completions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: detectorModel,
                            messages: [
                                {
                                    role: "user",
                                    content: [
                                        { type: "text", text: `Detect face. Return the bounding box coordinates as a JSON object: {"ymin": 0.0, "xmin": 0.0, "ymax": 1.0, "xmax": 1.0}.` },
                                        { type: "image_url", image_url: { url: imageUrl } }
                                    ]
                                }
                            ],
                            max_tokens: 256,
                            response_format: { type: "json_object" }
                        })
                    });

                    if (detectRes.ok) {
                        const dData = await detectRes.json();
                        const content = dData.choices?.[0]?.message?.content || "{}";

                        // Parse JSON
                        let bbox: any = null;
                        try {
                            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
                            bbox = JSON.parse(cleanJson);
                        } catch (e) { console.warn("Failed to parse box JSON", e); }

                        if (bbox && typeof bbox.ymin === 'number') {
                            // Heuristic: If detecting 'face' returns the specific whole image (0,0,1,1), it likely failed to be specific.
                            // In this case, fallback to a "Top-Center" crop which is usually where the face is in character portraits.
                            const isFullImage = (bbox.xmax - bbox.xmin) > 0.9 && (bbox.ymax - bbox.ymin) > 0.9;

                            if (isFullImage) {
                                // Force a "Face" crop prediction (Top middle, 40% width, 40% height)
                                bbox = {
                                    xmin: 0.3,
                                    xmax: 0.7,
                                    ymin: 0.05,
                                    ymax: 0.55
                                };
                            }

                            // Crop the image using a canvas
                            // We need to load the image into an HTMLImageElement first
                            const img = new Image();
                            img.src = imageUrl;
                            await new Promise((resolve) => { img.onload = resolve; });

                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');

                            if (ctx) {
                                // Add some padding to the crop (20%)
                                const width = img.width;
                                const height = img.height;

                                // Convert relative to absolute
                                let ymin = bbox.ymin * height;
                                let xmin = bbox.xmin * width;
                                let ymax = bbox.ymax * height;
                                let xmax = bbox.xmax * width;

                                // Add padding
                                const padX = (xmax - xmin) * 0.2;
                                const padY = (ymax - ymin) * 0.2;

                                xmin = Math.max(0, xmin - padX);
                                ymin = Math.max(0, ymin - padY);
                                xmax = Math.min(width, xmax + padX);
                                ymax = Math.min(height, ymax + padY);

                                const cWidth = xmax - xmin;
                                const cHeight = ymax - ymin;

                                canvas.width = cWidth;
                                canvas.height = cHeight;

                                // Draw
                                ctx.drawImage(img, xmin, ymin, cWidth, cHeight, 0, 0, cWidth, cHeight);
                                cropUrl = canvas.toDataURL('image/png');
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Eye detection failed", e);
                }
            }

            setTestResult({
                modelId: model.id,
                status: 'success',
                generationTimeMs: genTime,
                generatedImageUrl: imageUrl,
                verificationResult: verification,
                eyeCropUrl: cropUrl
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
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Info className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Test Prompt</h2>
                                <p className="text-sm text-neutral-400">Used for generation models and vision verification</p>
                            </div>
                        </div>

                        {/* Scheduler Selector */}
                        <div className="flex items-center gap-3 bg-neutral-800/50 p-2 rounded-lg border border-white/5">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Scheduler</label>
                            <select
                                value={selectedScheduler}
                                onChange={(e) => setSelectedScheduler(e.target.value)}
                                className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 min-w-[120px]"
                            >
                                {schedulers.length > 0 ? (
                                    schedulers.map(s => <option key={s} value={s}>{s}</option>)
                                ) : (
                                    <option value="dpm++">dpm++ (Default)</option>
                                )}
                            </select>
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
                {/* Image Upload for Vision Tests */}
                <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Eye className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Test Image</h2>
                            <p className="text-sm text-neutral-400">Required for testing Vision & Analysis models</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex-1">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-neutral-700 border-dashed rounded-lg cursor-pointer bg-neutral-800/50 hover:bg-neutral-800 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Download className="w-8 h-8 mb-3 text-neutral-400 rotate-180" />
                                    <p className="mb-2 text-sm text-neutral-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-neutral-500">PNG, JPG or WEBP</p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setTestImage(reader.result as string);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        {testImage && (
                            <div className="relative group w-32 h-32 bg-black rounded-lg border border-white/10 overflow-hidden shrink-0">
                                <img src={testImage} alt="Test Preview" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setTestImage(null)}
                                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        )}
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

                                    {testResult.eyeCropUrl && (
                                        <div className="bg-neutral-800/50 border border-white/10 p-4 rounded-xl">
                                            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <Eye className="w-3 h-3 text-purple-400" />
                                                Detail Check (Eyes)
                                            </div>
                                            <div className="flex gap-4 items-start">
                                                <div className="rounded-lg overflow-hidden border border-white/10 bg-black">
                                                    <img src={testResult.eyeCropUrl} alt="Eye Crop" className="h-32 object-contain" />
                                                </div>
                                                <p className="text-xs text-neutral-500 max-w-[200px]">
                                                    Automatic crop of detected eyes/face for detailed quality inspection.
                                                </p>
                                            </div>
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
            </div>
        </div>
    );
}
