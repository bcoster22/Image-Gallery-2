/* eslint-disable */
import { useState, useCallback, useRef, useEffect } from 'react';
import { ModelInfo, TestResult } from '../components/PerformanceOverview/types';

interface AutoTestRunnerProps {
    addToQueue: (items: any[]) => void;
    settings: any;
    generationResults?: { id: string, url: string }[];
}

export function useAutoTestRunner({ addToQueue, settings, generationResults }: AutoTestRunnerProps) {
    const [testStatuses, setTestStatuses] = useState<Record<string, TestResult>>({});
    const [isAutoTesting, setIsAutoTesting] = useState(false);
    const pendingVerificationRef = useRef<Record<string, number>>({}); // Map jobId to startTime
    const jobIdToModelIdRef = useRef<Record<string, string>>({}); // Map jobId to modelId


    // 1. Start Auto Test for a list of models
    const startAutoTest = useCallback((models: ModelInfo[], prompt: string, scheduler: string, resolution: string) => {
        if (isAutoTesting) return; // Prevent double click / double run
        setIsAutoTesting(true);
        setTestStatuses({}); // Clear previous results

        const newStatuses: Record<string, TestResult> = {};

        models.forEach(model => {
            newStatuses[model.id] = {
                modelId: model.id,
                status: 'queued'
            };

            queueTestForModel(model, prompt, scheduler, resolution);
        });

        setTestStatuses(newStatuses);
    }, [addToQueue, isAutoTesting]);

    // 2. Queue a single test
    const queueTestForModel = (model: ModelInfo, prompt: string, scheduler: string, resolution: string) => {
        const jobId = `autotest-${model.id}-${Date.now()}`;

        // Parse resolution (e.g., "512x896" -> width: 512, height: 896)
        const [width, height] = resolution.split('x').map(Number);

        // We use the existing "Generation" task type, but we might need a way to distinguish it?
        // Actually, the user wants to use the "Generation Queue". 
        // We'll create a task that calls the generation endpoint.
        // We mark it specifically so we can track it.

        const task: any = {
            id: jobId,
            taskType: 'generate',
            fileName: `AutoTest: ${model.name}`,
            priority: 1, // Low priority for auto tests
            // App.tsx uses priority: 3 for analysis.
            // Let's assume lower number = higher priority? Or check sort logic.
            // useQueueSystem: `queueRef.current.findIndex(i => (i.priority || 0) < prio);`
            // If i.priority (e.g. 1) < prio (e.g. 10), then 1 comes before 10? 
            // Wait: `findIndex(i => i.priority < prio)` finds first item with LOWER priority?
            // Usually queues are sorted High to Low? Or Low to High?
            // If `priority` means "importance", then 10 > 1.
            // If code is `i.priority < prio` for insertion index:
            // Insert 5 into [10, 8, 2].
            // 10 < 5? False. 8 < 5? False. 2 < 5? True. Index 2.
            // Result: [10, 8, 5, 2].
            // So HIGHER number = HIGHER priority/importance (first in array).
            // User asked for "Low Priority". So I should use a LOW number, e.g. 1.
            // App uses 3 for Analysis.
            // I will use 0 or 1 for AutoTest.

            data: {
                prompt: prompt,
                generationSettings: {
                    model: model.id,
                    steps: 20,
                    scheduler: scheduler,  // Use selected scheduler
                    width: width,          // Use selected width
                    height: height,        // Use selected height
                },
                // We pass a custom "sourceImage" or similar if needed, 
                // but for text-to-image cache check, we just need the prompt.
            }
        };

        // Track that we are waiting for this job
        pendingVerificationRef.current[jobId] = Date.now();
        jobIdToModelIdRef.current[jobId] = model.id; // Store modelId for this job

        addToQueue([task]);
    };

    // 3. Watch for results
    // hooks/useQueueSystem puts results in `generationResults` array {id, url}.
    useEffect(() => {
        if (!generationResults) return;

        generationResults.forEach(res => {
            // Check if this result matches one of our pending jobs
            if (pendingVerificationRef.current[res.id]) {
                const startTime = pendingVerificationRef.current[res.id];
                const modelId = jobIdToModelIdRef.current[res.id];

                if (modelId) {
                    delete pendingVerificationRef.current[res.id];
                    delete jobIdToModelIdRef.current[res.id];

                    // Trigger Verification Phase
                    verifyResult(modelId, res.url, Date.now() - startTime);
                }
            }
        });
    }, [generationResults]);

    const verifyResult = async (modelId: string, imageUrl: string, genTime: number) => {
        setTestStatuses(prev => ({
            ...prev,
            [modelId]: { ...prev[modelId], status: 'verifying', generatedImageUrl: imageUrl, generationTimeMs: genTime }
        }));

        const moondreamUrl = settings?.providers.moondream_local.endpoint || 'http://localhost:2020';
        const cleanUrl = moondreamUrl.replace(/\/$/, "").replace(/\/v1$/, "");

        try {
            // 1. Text Verification
            const verifyRes = await fetch(`${cleanUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "moondream-2",
                    messages: [
                        {
                            role: "user", content: [
                                { type: "text", text: "Describe this image in detail. Mention eye color if visible." },
                                { type: "image_url", image_url: { url: imageUrl } }
                            ]
                        }
                    ],
                    max_tokens: 150
                })
            });

            let verificationText = "Verified";
            if (verifyRes.ok) {
                const vData = await verifyRes.json();
                verificationText = vData.choices?.[0]?.message?.content || "Verified";
            }

            // 2. Extract Eye Color (Simple Regex)
            let eyeColor: string | undefined;
            const colorPatterns = [/eyes? (?:are|look) (\w+)/i, /(\w+) eyes?/i];
            for (const p of colorPatterns) {
                const m = verificationText.match(p);
                if (m && ['blue', 'green', 'brown', 'hazel'].some(c => m[1].toLowerCase().includes(c))) {
                    eyeColor = m[1].toLowerCase();
                    break;
                }
            }

            // 3. Extract Resolution
            let imageResolution: string | undefined;
            try {
                const img = new Image();
                img.src = imageUrl;
                await new Promise<void>(resolve => { img.onload = () => resolve(); });
                imageResolution = `${img.width}x${img.height}`;
            } catch {
                // Ignore resolution extraction errors
            }

            // 4. Smart Crop / Eye Crop (Face Detection)
            let eyeCropUrl: string | undefined;
            try {
                const tempImage: any = {
                    id: 'autotest-image',
                    dataUrl: imageUrl,
                    width: 1024,
                    height: 1024,
                    analysis: null
                };

                const { MoondreamLocalProvider } = await import('../services/providers/moondream');
                const provider = new MoondreamLocalProvider();

                let bbox = await provider.detectObject(tempImage, 'face', settings || { providers: { moondream_local: { endpoint: cleanUrl } } } as any);

                // Fallback Heuristic if detection fails
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

                        const cWidth = xmax - xmin;
                        const cHeight = ymax - ymin;

                        canvas.width = cWidth;
                        canvas.height = cHeight;

                        ctx.drawImage(img, xmin, ymin, cWidth, cHeight, 0, 0, cWidth, cHeight);
                        eyeCropUrl = canvas.toDataURL('image/png');
                    }
                }
            } catch (e) {
                console.warn("Face detection failed in AutoTest, using fallback crop", e);
                // Fallback to simple center crop
                try {
                    const img = new Image();
                    img.src = imageUrl;
                    await new Promise(r => { img.onload = r; });
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const s = Math.min(img.width, img.height) * 0.3;
                        const x = (img.width - s) / 2;
                        const y = (img.height - s) / 5;
                        canvas.width = s;
                        canvas.height = s;
                        ctx.drawImage(img, x, y, s, s, 0, 0, s, s);
                        eyeCropUrl = canvas.toDataURL('image/png');
                    }
                } catch {
                    // Ignore fallback crop errors
                }
            }


            setTestStatuses(prev => ({
                ...prev,
                [modelId]: {
                    ...prev[modelId],
                    status: 'success',
                    verificationResult: verificationText,
                    eyeColor,
                    imageResolution,
                    eyeCropUrl
                }
            }));

        } catch (e) {
            setTestStatuses(prev => ({
                ...prev,
                [modelId]: { ...prev[modelId], status: 'failure', error: String(e) }
            }));
        }
    };

    return {
        testStatuses,
        startAutoTest,
        runSingleTest: queueTestForModel,
        isAutoTesting
    };
}
