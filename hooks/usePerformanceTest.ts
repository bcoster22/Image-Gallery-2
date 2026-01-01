import { useState } from 'react';
import { ModelInfo, TestResult } from '../components/PerformanceOverview/types';
import { AdminSettings } from '../types';

export function usePerformanceTest(settings: AdminSettings | null) {
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);

    const moondreamUrl = settings?.providers.moondream_local.endpoint || 'http://localhost:2020';
    const cleanUrl = moondreamUrl.replace(/\/$/, "").replace(/\/v1$/, "");

    const runTest = async (model: ModelInfo, prompt: string, testImage: string | null, scheduler: string) => {
        setTestResult({
            modelId: model.id,
            status: 'loading',
        });
        setShowResultModal(true);

        const startTime = Date.now();
        const vramMode = settings?.performance?.vramUsage || 'balanced';

        try {
            // 1. Trigger Generation
            let imageUrl: string | undefined;

            if (model.type === 'generation') {
                setTestResult(prev => ({ ...prev!, status: 'generating' }));

                const genRes = await fetch(`${cleanUrl}/v1/images/generations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-VRAM-Mode': vramMode
                    },
                    body: JSON.stringify({
                        model: model.id,
                        prompt: prompt,
                        n: 1,
                        size: "896x512",
                        response_format: "b64_json"
                    })
                });

                if (!genRes.ok) {
                    const errText = await genRes.text();
                    throw new Error(`Generation failed (${genRes.status}): ${errText}`);
                }

                const genData = await genRes.json();
                if (genData.data && genData.data[0]) {
                    imageUrl = `data:image/png;base64,${genData.data[0].b64_json}`;
                } else {
                    throw new Error("No image returned");
                }

            } else {
                // For vision/analysis models
                if (testImage) {
                    imageUrl = testImage;
                } else {
                    // Auto-Generate Fallback
                    const genRes = await fetch(`${cleanUrl}/v1/generate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-VRAM-Mode': vramMode
                        },
                        body: JSON.stringify({
                            model: 'sdxl-realism', // Default fallback
                            prompt: prompt,
                            width: 896,
                            height: 512,
                            steps: 30,
                            scheduler: scheduler
                        })
                    });

                    if (!genRes.ok) throw new Error("Auto-generation failed. Please upload an image.");

                    const genData = await genRes.json();
                    const b64 = genData.data?.[0]?.b64_json || genData.images?.[0];

                    if (b64) {
                        imageUrl = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
                    } else {
                        throw new Error("No image returned from auto-generation.");
                    }
                }
            }

            const genTime = Date.now() - startTime;

            // 2. Verification / Analysis Test
            let verification = "Skipped";
            if (imageUrl) {
                setTestResult(prev => ({ ...prev!, status: 'verifying', generationTimeMs: genTime, generatedImageUrl: imageUrl }));

                const verifyModel = model.type === 'vision' || model.type === 'analysis' ? model.id : "moondream-2";

                try {
                    const verifyRes = await fetch(`${cleanUrl}/v1/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-VRAM-Mode': vramMode
                        },
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
                        const errText = await verifyRes.text();
                        verification = `Verification Service Unavailable (${verifyRes.status}): ${errText}`;
                    }
                } catch (e) {
                    verification = "Verification Failed: " + String(e);
                }
            }

            // 3. Eye/Face Crop (Identity Check)
            let cropUrl: string | undefined;
            if (imageUrl) {
                try {
                    const tempImage: any = {
                        id: 'test-image',
                        dataUrl: imageUrl,
                        width: 1024,
                        height: 1024,
                        analysis: null
                    };

                    const { MoondreamLocalProvider } = await import('../services/providers/moondream');
                    const provider = new MoondreamLocalProvider();

                    let bbox = await provider.detectObject(tempImage, 'face', settings || { providers: { moondream_local: { endpoint: cleanUrl } } } as any);

                    // Fallback Heuristic
                    if (!bbox || ((bbox.xmax - bbox.xmin) > 0.9 && (bbox.ymax - bbox.ymin) > 0.9)) {
                        bbox = { xmin: 0.3, xmax: 0.7, ymin: 0.05, ymax: 0.55 };
                    }

                    if (bbox) {
                        const img = new Image();
                        img.src = imageUrl;
                        await new Promise((resolve) => { img.onload = resolve; });

                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        if (ctx) {
                            const width = img.width;
                            const height = img.height;
                            let ymin = bbox.ymin * height;
                            let xmin = bbox.xmin * width;
                            let ymax = bbox.ymax * height;
                            let xmax = bbox.xmax * width;

                            const padX = (xmax - xmin) * 0.2;
                            const padY = (ymax - ymin) * 0.2;

                            xmin = Math.max(0, xmin - padX);
                            ymin = Math.max(0, ymin - padY);
                            xmax = Math.min(width, xmax + padX);
                            ymax = Math.min(height, ymax + padY);
                            xmax = Math.min(width, xmax + padX);
                            ymax = Math.min(height, ymax + padY);

                            const cWidth = xmax - xmin;
                            const cHeight = ymax - ymin;

                            canvas.width = cWidth;
                            canvas.height = cHeight;

                            ctx.drawImage(img, xmin, ymin, cWidth, cHeight, 0, 0, cWidth, cHeight);
                            cropUrl = canvas.toDataURL('image/png');
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

        } catch (e: any) {
            console.error(e);
            setTestResult({
                modelId: model.id,
                status: 'failure',
                error: e.message
            });
        }
    };

    return {
        testResult,
        showResultModal,
        setShowResultModal,
        runTest
    };
}
