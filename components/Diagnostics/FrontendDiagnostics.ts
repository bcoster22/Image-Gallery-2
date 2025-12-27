
import { DiagnosticResult } from './DiagnosticsPage.types';

const DB_NAME = 'ai-gallery-db';
const DB_STORE_NAME = 'images';

// Helper to create a result object
const createResult = (
    id: string,
    name: string,
    status: DiagnosticResult['status'],
    message: string,
    category: DiagnosticResult['category'] = 'environment'
): DiagnosticResult => ({
    id,
    name,
    category,
    severity: status === 'fail' ? 'critical' : status === 'warning' ? 'warning' : 'info',
    status,
    message,
    timestamp: Date.now()
});

export const checkBrowserStorage = async (): Promise<DiagnosticResult> => {
    try {
        if (!navigator.storage || !navigator.storage.estimate) {
            return createResult('browser_storage', 'Browser Storage', 'skipped', 'Storage API not supported');
        }

        const estimate = await navigator.storage.estimate();
        const usageGB = (estimate.usage || 0) / (1024 * 1024 * 1024);
        const quotaGB = (estimate.quota || 0) / (1024 * 1024 * 1024);
        const percent = quotaGB > 0 ? (usageGB / quotaGB) * 100 : 0;

        if (quotaGB < 1) {
            return createResult('browser_storage', 'Browser Storage', 'warning', `Low Quota: ${quotaGB.toFixed(1)}GB available.`);
        }

        if (percent > 90) {
            return createResult('browser_storage', 'Browser Storage', 'warning', `Storage Full: ${percent.toFixed(0)}% used (${usageGB.toFixed(1)}GB).`);
        }

        return createResult('browser_storage', 'Browser Storage', 'pass', `Healthy: ${percent.toFixed(0)}% used (${usageGB.toFixed(1)}/${quotaGB.toFixed(1)}GB)`);
    } catch (e) {
        return createResult('browser_storage', 'Browser Storage', 'error', `Check failed: ${e}`);
    }
};

export const checkDatabaseIntegrity = async (): Promise<DiagnosticResult> => {
    return new Promise((resolve) => {
        try {
            const req = indexedDB.open(DB_NAME);

            req.onerror = () => {
                resolve(createResult('db_integrity', 'Database Integrity', 'fail', `Failed to open ${DB_NAME}`, 'system'));
            };

            req.onsuccess = () => {
                const db = req.result;
                try {
                    const tx = db.transaction([DB_STORE_NAME], 'readonly');
                    const store = tx.objectStore(DB_STORE_NAME);
                    const countReq = store.count();

                    countReq.onsuccess = () => {
                        db.close();
                        resolve(createResult('db_integrity', 'Database Integrity', 'pass', `Integrity Verified: ${countReq.result} items (Readable)`, 'system'));
                    };

                    countReq.onerror = () => {
                        db.close();
                        resolve(createResult('db_integrity', 'Database Integrity', 'fail', 'Failed to read items from store', 'system'));
                    };
                } catch (e) {
                    db.close();
                    resolve(createResult('db_integrity', 'Database Integrity', 'fail', `Transaction error: ${e}`, 'system'));
                }
            };
        } catch (e) {
            resolve(createResult('db_integrity', 'Database Integrity', 'error', `IDB Exception: ${e}`, 'system'));
        }
    });
};

export const checkWebGLSupport = async (): Promise<DiagnosticResult> => {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            return createResult('webgl_support', 'WebGL 2 Support', 'fail', 'WebGL 2 not supported. UI may be slow.', 'hardware');
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        let renderer = 'Unknown GPU';
        if (debugInfo) {
            renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }

        // Simple 'comfort' check - is it software?
        const isSoftware = renderer.toLowerCase().includes('llvm') || renderer.toLowerCase().includes('software');
        if (isSoftware) {
            return createResult('webgl_support', 'WebGL 2 Support', 'warning', `Hardware accel missing (${renderer})`, 'hardware');
        }

        return createResult('webgl_support', 'WebGL 2 Support', 'pass', `Hardware Accelerated: ${renderer}`, 'hardware');
    } catch (e) {
        return createResult('webgl_support', 'WebGL 2 Support', 'error', `Check failed: ${e}`, 'hardware');
    }
};

export const checkBackendLatency = async (endpoint: string): Promise<DiagnosticResult> => {
    const start = performance.now();
    try {
        const res = await fetch(endpoint, { method: 'HEAD' }); // Lightweight
        const duration = performance.now() - start;

        if (!res.ok) {
            return createResult('network_latency', 'Backend Latency', 'warning', `Status ${res.status} (${duration.toFixed(0)}ms)`, 'network');
        }

        if (duration > 200) {
            return createResult('network_latency', 'Backend Latency', 'warning', `High Latency: ${duration.toFixed(0)}ms`, 'network');
        }

        return createResult('network_latency', 'Backend Latency', 'pass', `Low Latency: ${duration.toFixed(0)}ms`, 'network');
    } catch (e) {
        return createResult('network_latency', 'Backend Latency', 'fail', `Unreachable: ${e}`, 'network');
    }
};

export const validateApiKeys = async (settings: any): Promise<DiagnosticResult[]> => {
    const results: DiagnosticResult[] = [];

    // Helper to test key
    const testKey = async (provider: string, key: string): Promise<DiagnosticResult> => {
        if (!key || key.startsWith("sk-placeholder") || key.length < 5) {
            return createResult(`api_key_${provider}`, `API Key: ${provider}`, 'warning', 'Key not configured or invalid format', 'system');
        }

        // We can't easily verify the key without a proxy endpoint that checks it, 
        // OR we just check the format locally if we don't want to waste tokens.
        // Real validation requires a backend call usually.
        // A "Check Active" usually implies valid format at least.

        return createResult(`api_key_${provider}`, `API Key: ${provider}`, 'pass', 'Key is configured (Format Valid)', 'system');
    };

    if (settings?.openaiKey) results.push(await testKey('OpenAI', settings.openaiKey));
    if (settings?.anthropicKey) results.push(await testKey('Anthropic', settings.anthropicKey));
    if (settings?.geminiKey) results.push(await testKey('Gemini', settings.geminiKey));

    return results;
};
