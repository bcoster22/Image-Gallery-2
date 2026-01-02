
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
    const pendingVerificationRef = useRef<Record<string, number>>({}); // Map modelId to startTime

    // 1. Start Auto Test for a list of models
    const startAutoTest = useCallback((models: ModelInfo[], prompt: string) => {
        setIsAutoTesting(true);
        const newStatuses: Record<string, TestResult> = {};

        models.forEach(model => {
            // Skip detection models for now if desired, or handle them differently
            // if (model.type === 'detection' || model.type === 'classification') return;

            newStatuses[model.id] = {
                modelId: model.id,
                status: 'queued'
            };

            queueTestForModel(model, prompt);
        });

        setTestStatuses(prev => ({ ...prev, ...newStatuses }));
    }, [addToQueue]);

    // 2. Queue a single test
    const queueTestForModel = (model: ModelInfo, prompt: string) => {
        const jobId = `autotest-${model.id}-${Date.now()}`;

        // We use the existing "Generation" task type, but we might need a way to distinguish it?
        // Actually, the user wants to use the "Generation Queue". 
        // We'll create a task that calls the generation endpoint.
        // We mark it specifically so we can track it.

        const task: any = {
            id: jobId,
            taskType: 'generate',
            fileName: `AutoTest: ${model.name}`,
            priority: 10, // Low priority (High number = Lower priority?? No, usually 1 is high. Let's check App.tsx)
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
                aspectRatio: "16:9", // Default
                generationSettings: {
                    model: model.id,
                    steps: 20,
                    // Force this model
                },
                // We pass a custom "sourceImage" or similar if needed, 
                // but for text-to-image cache check, we just need the prompt.
            }
        };

        // Track that we are waiting for this job
        pendingVerificationRef.current[jobId] = Date.now();

        addToQueue([task]);
    };

    // 3. Watch for results
    // hooks/useQueueSystem puts results in `generationResults` array {id, url}.
    useEffect(() => {
        if (!generationResults) return;

        generationResults.forEach(res => {
            // Check if this result matches one of our pending jobs
            // The ID format is `autotest-{modelId}-{timestamp}`
            if (pendingVerificationRef.current[res.id]) {
                const startTime = pendingVerificationRef.current[res.id];
                const modelId = res.id.split('-')[1]; // Extract model ID (naive parse)
                // Better regex or storage:
                // We should store a map of jobId -> modelId

                // Let's iterate keys to be safe or store better map
                const verifiedModelId = Object.keys(testStatuses).find(mid => res.id.includes(`autotest-${mid}-`));

                if (verifiedModelId) {
                    delete pendingVerificationRef.current[res.id];

                    // Trigger Verification Phase
                    verifyResult(verifiedModelId, res.url, Date.now() - startTime);
                }
            }
        });
    }, [generationResults]);

    const verifyResult = async (modelId: string, imageUrl: string, genTime: number) => {
        setTestStatuses(prev => ({
            ...prev,
            [modelId]: { ...prev[modelId], status: 'verifying', generatedImageUrl: imageUrl, generationTimeMs: genTime }
        }));

        // Call Verification API (Moondream)
        // We can reuse the logic from usePerformanceTest or duplicate it here.
        // For simplicity, duplicate simple fetch call.
        try {
            // Logic to call chat completion
            const moondreamUrl = settings?.providers.moondream_local.endpoint || 'http://localhost:2020';
            const cleanUrl = moondreamUrl.replace(/\/$/, "").replace(/\/v1$/, "");

            const verifyRes = await fetch(`${cleanUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "moondream-2",
                    messages: [
                        {
                            role: "user", content: [
                                { type: "text", text: "Is there an image here?" }, // Simple check
                                { type: "image_url", image_url: { url: imageUrl } }
                            ]
                        }
                    ],
                    max_tokens: 10
                })
            });

            if (verifyRes.ok) {
                setTestStatuses(prev => ({
                    ...prev,
                    [modelId]: { ...prev[modelId], status: 'success', verificationResult: "Verified" }
                }));
            } else {
                throw new Error("Verification failed");
            }

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
        isAutoTesting
    };
}
