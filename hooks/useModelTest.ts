import { useState, useRef, useCallback } from 'react';
import { AdminSettings } from '../types';
import { TestStatus, ModelTestResult, TestConfig, AvailableModel } from '../components/status/ModelLoadTest/types';

export function useModelTest(
    settings: AdminSettings | null,
    otelMetrics: any | null,
    onRefreshMetrics: () => Promise<void>
) {
    const [testStatus, setTestStatus] = useState<TestStatus>({ phase: 'idle', message: '', progress: 0 });
    const [modelTestResult, setModelTestResult] = useState<ModelTestResult | null>(null);
    const [isTestRunning, setIsTestRunning] = useState(false);
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

    // Configuration
    const testConfig: TestConfig = {
        vramSetting: settings?.performance?.vramUsage || 'balanced',
        maxVramPct: 90
    };

    const abortController = useRef<AbortController | null>(null);

    const moondreamUrl = settings?.providers.moondream_local.endpoint || 'http://localhost:2020';
    const cleanUrl = moondreamUrl.replace(/\/$/, "").replace(/\/v1$/, "");

    const updateStatus = (phase: TestStatus['phase'], message: string, progress: number) => {
        setTestStatus({ phase, message, progress });
    };

    const startModelTest = async (modelId: string) => {
        if (isTestRunning) return;
        setIsTestRunning(true);
        setModelTestResult(null);
        abortController.current = new AbortController();

        try {
            // 1. Initial Cleanup
            updateStatus('unloading', 'Clearing previous models...', 10);
            await fetch(`${cleanUrl}/v1/system/unload`, { method: 'POST' });
            await new Promise(r => setTimeout(r, 1000));
            await onRefreshMetrics();

            // 2. Load Model
            updateStatus('loading', `Loading model ${modelId} into VRAM...`, 30);
            const loadStartVram = otelMetrics?.gpus?.[0]?.memory_used || 0;

            // Trigger load via simple generation request (force load)
            // or explicit load endpoint if available. Using generation init for now.
            const generateRes = await fetch(`${cleanUrl}/v1/images/generations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelId,
                    prompt: "test", // Minimize compute, just trigger load
                    n: 1,
                    size: "64x64", // Minimal size
                    steps: 1
                })
            });

            if (!generateRes.ok) throw new Error("Model failed to load/initialize");

            await new Promise(r => setTimeout(r, 2000)); // Wait for VRAM to settle
            await onRefreshMetrics();
            const loadedVram = otelMetrics?.gpus?.[0]?.memory_used || 0;
            const vramDelta = Math.max(0, loadedVram - loadStartVram);

            // 3. Warmup / Generation Test (Real Check)
            updateStatus('generating', 'Running verification inference...', 60);

            const verifyRes = await fetch(`${cleanUrl}/v1/images/generations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelId,
                    prompt: "A high quality test image for validation",
                    n: 1,
                    size: "512x512",
                    steps: 10
                })
            });

            if (!verifyRes.ok) throw new Error("Verification inference failed");

            const verifyData = await verifyRes.json();
            const b64 = verifyData.data?.[0]?.b64_json;
            const imageData = b64 ? `data:image/png;base64,${b64}` : undefined;

            updateStatus('complete', 'Test completed successfully.', 100);

            setModelTestResult({
                success: true,
                vramMb: vramDelta,
                peakVramMb: vramDelta * 1.1, // Estimate
                imageData: imageData
            });

        } catch (e: any) {
            console.error("Test Failed", e);
            updateStatus('failed', `Error: ${e.message}`, 100);
            setModelTestResult({
                success: false,
                error: e.message
            });
        } finally {
            setIsTestRunning(false);
            abortController.current = null;
        }
    };

    return {
        testStatus,
        modelTestResult,
        isTestRunning,
        selectedModelId,
        setSelectedModelId,
        startModelTest,
        testConfig
    };
}
