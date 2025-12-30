import { DevicePerformanceMetrics, ProviderStats } from "../../../types";

export const normalizeEndpoint = (endpoint: string): string => {
    return endpoint.replace(/\/$/, '').replace(/\/v1$/, '');
};

export function getImageRating(scores: Record<string, number>): string {
    const explicit = scores.explicit || 0;
    const questionable = scores.questionable || 0;
    const sensitive = scores.sensitive || 0;

    if (explicit > 0.85) return 'XXX';
    if (explicit > 0.5) return 'X';
    if (questionable > 0.5) return 'R';
    if (sensitive > 0.5) return 'PG-13';
    return 'PG';
}

export const callMoondreamApi = async (
    fullUrl: string,
    apiKey: string | null,
    body: object,
    isCloud: boolean,
    timeoutSeconds: number = 120,
    vramMode: string = 'balanced'
): Promise<{ text: string, stats?: any }> => {
    if (!fullUrl) {
        throw new Error("Moondream API endpoint URL is missing.");
    }

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-VRAM-Mode': vramMode
    };

    if (apiKey) {
        if (isCloud) {
            headers['X-Moondream-Auth'] = apiKey;
        } else {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
    }

    try {
        console.log(`DEBUG: Sending request to ${fullUrl}`, JSON.stringify(body, null, 2));
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Moondream API Error: ${response.status} - ${errorBody}`);

            // Catch OOM in 500/Hard Errors
            if (response.status === 500 && errorBody.includes('CUDA out of memory') && vramMode !== 'low') {
                console.warn(`[Moondream API] OOM Detected (500). Retrying with 'low' VRAM mode...`);
                return await callMoondreamApi(fullUrl, apiKey, body, isCloud, timeoutSeconds, 'low');
            }

            throw new Error(`Moondream API error (${response.status}): ${errorBody}`);
        }

        // Handle streaming response if requested
        if ((body as any).stream) {
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let stats = null;

            if (reader) {
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

                        if (trimmedLine.startsWith('data: ')) {
                            try {
                                const jsonStr = trimmedLine.slice(6);
                                const data = JSON.parse(jsonStr);
                                if (data.chunk) fullText += data.chunk;
                                if (data.stats) stats = data.stats;
                            } catch (e) {
                                console.warn('Failed to parse SSE line:', trimmedLine, e);
                            }
                        }
                    }
                }
            }

            const result = { caption: fullText, _stats: stats };
            return { text: JSON.stringify(result), stats };
        }

        const data = await response.json();
        console.log('DEBUG: Moondream API response:', JSON.stringify(data, null, 2));

        if (data.error && (data.status === 'timeout' || data.error === 'Request timeout')) {
            throw new Error("Moondream Request Timeout: The operation took too long.");
        }

        if (data.error || data.status === 'rejected') {
            const errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
            throw new Error(`Moondream API Error: ${errorMessage}`);
        }

        let answer = data.answer || data.caption || data.text || data.response || data.generated_text;

        if (!answer && data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
            answer = data.choices[0].text || data.choices[0].message?.content;
        }

        if (typeof answer !== 'string') {
            console.warn("Could not find standard answer key. Returning stringified data as fallback.");
            answer = JSON.stringify(data);
        }

        // Check for JSON error in answer
        try {
            const parsed = JSON.parse(answer);
            if (parsed && typeof parsed === 'object' && parsed.error) {
                const errStr = parsed.error;
                if (typeof errStr === 'string' && errStr.includes('CUDA out of memory') && vramMode !== 'low') {
                    console.warn(`[Moondream API] OOM Detected. Retrying with 'low' VRAM mode to force unload...`);
                    return await callMoondreamApi(fullUrl, apiKey, body, isCloud, timeoutSeconds, 'low');
                }
                throw new Error(`Model returned an error: ${parsed.error}`);
            }
        } catch (e) {
            if (!(e instanceof SyntaxError)) throw e;
        }

        // Extract Headers for Performance Metrics
        const perfMetrics: DevicePerformanceMetrics = {
            vramUsedMB: parseFloat(response.headers.get('X-VRAM-Used') || '0'),
            vramTotalMB: parseFloat(response.headers.get('X-VRAM-Total') || '0'),
            inferenceTimeMs: parseFloat(response.headers.get('X-Inference-Time') || '0'),
            modelLoadTimeMs: parseFloat(response.headers.get('X-Model-Load-Time') || '0')
        };

        if (perfMetrics.vramTotalMB > 0) {
            perfMetrics.vramUsagePercent = (perfMetrics.vramUsedMB! / perfMetrics.vramTotalMB) * 100;
        }

        let stats: ProviderStats | undefined = undefined;
        if (data.usage && data.usage.completion_tokens) {
            const durationSec = (Date.now() - startTime) / 1000;
            const tokens = data.usage.completion_tokens;
            const tokensPerSec = durationSec > 0 ? tokens / durationSec : 0;
            stats = {
                tokensPerSec,
                device: data.device || (data.stats && data.stats.device) || 'Unknown',
                totalTokens: tokens,
                duration: durationSec,
                devicePerformance: { ...perfMetrics, tokensPerSecond: tokensPerSec }
            };
        } else if (data.stats) {
            // Handle local stats if available directly
            stats = {
                duration: data.stats.duration || (Date.now() - startTime) / 1000,
                totalTokens: data.stats.tokens,
                tokensPerSec: data.stats.tokens_per_sec,
                device: data.stats.device,
                devicePerformance: { ...perfMetrics, tokensPerSecond: data.stats.tokens_per_sec }
            };
        } else {
            // Minimal stats
            stats = {
                duration: (Date.now() - startTime) / 1000,
                device: 'Unknown',
                devicePerformance: perfMetrics
            };
        }

        return { text: answer, stats };
    } catch (error) {
        console.error("Error calling Moondream API:", error);
        if (error instanceof Error && error.message.toLowerCase().includes('failed to fetch')) {
            throw new Error(`Failed to fetch from Moondream.`);
        }
        throw error;
    }
};
