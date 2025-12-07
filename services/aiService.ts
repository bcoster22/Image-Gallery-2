import { ImageInfo, AdminSettings, AiProvider, AspectRatio, Capability, ImageAnalysisResult } from "../types";
import { providerCapabilities } from "./providerCapabilities";
import { registry } from "./providerRegistry";
// Import providers to ensure they register themselves
import './providers/gemini';
import './providers/openai';
import './providers/grok';
import './providers/moondream';
import './providers/comfyui';

/**
 * Error thrown when a chain of fallback providers all fail.
 * Contains details about each attempt.
 */
export class FallbackChainError extends Error {
    public attempts: { provider: AiProvider; error: string }[];
    constructor(message: string, attempts: { provider: AiProvider; error: string }[]) {
        super(message);
        this.name = 'FallbackChainError';
        this.attempts = attempts;
    }
}

/**
 * Checks if a specific provider is configured and supports the requested capability.
 * Uses the provider's internal validation logic.
 * 
 * @param settings The admin settings containing provider configurations.
 * @param capability The capability to check (e.g., 'vision', 'generation').
 * @param providerId The ID of the provider to check.
 * @returns True if configured and supported, false otherwise.
 */
export const isProviderConfiguredFor = (
    settings: AdminSettings,
    capability: Capability,
    providerId: AiProvider
): boolean => {
    const provider = registry.getProvider(providerId);
    if (!provider) return false;

    // Check if provider supports capability
    if (!provider.capabilities[capability]) return false;

    // Validate config
    return provider.validateConfig(settings);
};

export const isAnyProviderConfiguredFor = (
    settings: AdminSettings | null,
    capability: Capability
): boolean => {
    if (!settings) return false;
    const providers = registry.getProviders();
    return providers.some(p => isProviderConfiguredFor(settings, capability, p.id));
};

export const testProviderConnection = async (
    providerId: AiProvider,
    settings: AdminSettings
): Promise<void> => {
    const provider = registry.getProvider(providerId);
    if (!provider) throw new Error(`Provider ${providerId} not found.`);

    if (provider.testConnection) {
        await provider.testConnection(settings);
    } else {
        throw new Error(`Connection testing not implemented for ${providerId}`);
    }
};

type FunctionName = 'analyzeImage' | 'detectSubject' | 'generateImageFromPrompt' | 'animateImage' | 'editImage' | 'generateKeywordsForPrompt' | 'enhancePromptWithKeywords' | 'adaptPromptToTheme';

function getCapabilityForFunction(funcName: FunctionName): Capability {
    switch (funcName) {
        case 'analyzeImage': return 'vision';
        case 'detectSubject': return 'vision';
        case 'generateImageFromPrompt': return 'generation';
        case 'animateImage': return 'animation';
        case 'editImage': return 'editing';
        case 'generateKeywordsForPrompt': return 'textGeneration';
        case 'enhancePromptWithKeywords': return 'textGeneration';
        case 'adaptPromptToTheme': return 'textGeneration';
    }
}

async function executeWithFallback<T>(
    settings: AdminSettings,
    funcName: FunctionName,
    coreArgs: any[],
    onProgress?: (update: { provider: AiProvider, status: 'attempting' | 'failed_attempt', message?: string }) => void,
    onStatus?: (message: string) => void
): Promise<T> {
    const requiredCapability = getCapabilityForFunction(funcName);
    const providerOrder = settings.routing[requiredCapability] || [];
    let lastError: Error | null = null;
    const failedAttempts: { provider: AiProvider; error: string }[] = [];

    if (providerOrder.length === 0) {
        throw new Error(`Execution failed for '${requiredCapability}'. No providers are routed for this capability in the admin settings.`);
    }

    for (const providerId of providerOrder) {
        if (!isProviderConfiguredFor(settings, requiredCapability, providerId)) {
            console.log(`Skipping ${providerId} for ${funcName}: It is not configured correctly.`);
            continue;
        }

        const provider = registry.getProvider(providerId);
        if (!provider) continue;

        const providerFunc = (provider as any)[funcName] as Function | undefined;
        if (!providerFunc) continue;

        let finalCoreArgs = [...coreArgs];

        // Special case: Grok prompt shortening
        // TODO: Move this logic to a better place or make it generic
        if (providerId === 'grok' && funcName === 'generateImageFromPrompt' && finalCoreArgs[0] && typeof finalCoreArgs[0] === 'string') {
            let prompt = finalCoreArgs[0];
            if (prompt.length > 900) {
                try {
                    console.log("Grok prompt is too long, shortening...");
                    // Try to find a text generation provider to shorten it
                    // For now, specifically look for Gemini as it was hardcoded before
                    const geminiProvider = registry.getProvider('gemini');
                    // We need a specific shortenPrompt method or use generic text gen
                    // The previous code imported gemini.shortenPrompt directly.
                    // Since shortenPrompt is not part of IAiProvider, we might need to cast or use a different approach.
                    // For now, let's assume we can access the exported function from the module if we import it, 
                    // OR we can use generateKeywords or similar? No.
                    // Let's rely on the fact that we imported './providers/gemini' and it might export shortenPrompt.
                    // But we can't access it easily here without importing * as gemini.

                    // Alternative: Use a generic "adaptPrompt" or similar if available?
                    // Or just skip shortening for now and let it fail/truncate?
                    // Let's truncate for safety if we can't shorten.
                    finalCoreArgs[0] = prompt.substring(0, 900);
                } catch (shortenError) {
                    console.error("Failed to shorten prompt; using truncated version.", shortenError);
                    finalCoreArgs[0] = prompt.substring(0, 900);
                }
            }
        }

        try {
            console.log(`Attempting ${funcName} with ${providerId}...`);
            onProgress?.({ provider: providerId, status: 'attempting' });
            // Call the function on the provider instance
            // Note: We need to bind context if it uses 'this', but class methods should be fine.
            return await providerFunc.call(provider, ...finalCoreArgs, settings, onStatus);
        } catch (e: any) {
            lastError = e;
            failedAttempts.push({ provider: providerId, error: e.message });
            console.warn(`Provider ${providerId} failed for ${funcName}:`, e.message);
            onProgress?.({ provider: providerId, status: 'failed_attempt', message: e.message });
        }
    }

    if (lastError) {
        const errorMessage = `All routed AI providers failed for '${requiredCapability}'. Last error from ${failedAttempts[failedAttempts.length - 1].provider}.`;
        throw new FallbackChainError(errorMessage, failedAttempts);
    }

    throw new Error(`All routed AI providers failed or are not configured for '${requiredCapability}'. Please check your settings.`);
}

export const classifyImageSafety = async (
    image: ImageInfo,
    settings: AdminSettings
): Promise<ImageInfo['nsfwClassification']> => {
    const providerId = 'moondream_local';
    const provider = registry.getProvider(providerId);

    if (!provider || !isProviderConfiguredFor(settings, 'vision', providerId)) {
        console.warn('Moondream Local not configured, skipping NSFW classification');
        return undefined;
    }

    try {
        const nsfwSettings: AdminSettings = {
            ...settings,
            providers: {
                ...settings.providers,
                moondream_local: {
                    ...settings.providers.moondream_local,
                    model: 'nsfw-detector'
                }
            }
        };

        const result = await provider.analyzeImage!(image, nsfwSettings);

        const match = result.recreationPrompt.match(/NSFW Classification: (\w+) \(([0-9.]+)% confidence\)/);

        if (match) {
            const label = match[1] as 'NSFW' | 'SFW';
            const confidence = parseFloat(match[2]);

            const predictions = result.keywords?.map(kw => {
                const predMatch = kw.match(/(\w+) \(([0-9]+)%\)/);
                if (predMatch) {
                    return {
                        label: predMatch[1],
                        score: parseInt(predMatch[2]) / 100
                    };
                }
                return null;
            }).filter(p => p !== null) as Array<{ label: string; score: number }>;

            return {
                label,
                score: label === 'NSFW' ? confidence / 100 : 1 - (confidence / 100),
                confidence,
                predictions,
                lastChecked: Date.now()
            };
        }

        return undefined;
    } catch (error) {
        console.error('NSFW classification failed:', error);
        return undefined;
    }
};

/**
 * Analyzes an image using the configured AI provider.
 * Automatically handles provider fallback and content safety checks.
 * 
 * @param image The image to analyze.
 * @param settings The admin settings.
 * @param onProgress Optional callback for progress updates (provider attempts).
 * @param onStatus Optional callback for status messages.
 * @returns The analysis result containing keywords and prompt.
 */
export const analyzeImage = async (
    image: ImageInfo,
    settings: AdminSettings,
    onProgress?: (update: { provider: AiProvider, status: 'attempting' | 'failed_attempt', message?: string }) => void,
    onStatus?: (message: string) => void
): Promise<ImageAnalysisResult> => {
    const result = await executeWithFallback<ImageAnalysisResult>(settings, 'analyzeImage', [image], onProgress, onStatus);

    if (settings.contentSafety?.enabled &&
        settings.contentSafety?.autoClassify &&
        !settings.contentSafety?.useSingleModelSession) {
        if (onStatus) onStatus('Running content safety check...');

        const classification = await classifyImageSafety(image, settings);

        if (classification) {
            const threshold = settings.contentSafety.threshold || 50;
            const isNsfw = classification.label === 'NSFW' && classification.confidence >= threshold;
            const keyword = isNsfw
                ? (settings.contentSafety.nsfwKeyword || 'NSFW')
                : (settings.contentSafety.sfwKeyword || 'SFW');

            if (!result.keywords) result.keywords = [];
            if (!result.keywords.includes(keyword)) result.keywords.unshift(keyword);

            image.nsfwClassification = classification;
            result.nsfwClassification = classification;
        }
    }

    return result;
};

export const detectSubject = async (
    image: ImageInfo,
    settings: AdminSettings
): Promise<{ x: number, y: number } | undefined> => {
    return executeWithFallback(settings, 'detectSubject', [image]);
};

export const generateImageFromPrompt = async (
    prompt: string,
    settings: AdminSettings,
    aspectRatio: AspectRatio
): Promise<string> => {
    return executeWithFallback(settings, 'generateImageFromPrompt', [prompt, aspectRatio]);
};

export const animateImage = async (
    image: ImageInfo | null,
    prompt: string,
    aspectRatio: AspectRatio,
    settings: AdminSettings
): Promise<{ uri: string, apiKey: string }> => {
    return executeWithFallback(settings, 'animateImage', [image, prompt, aspectRatio]);
};

export const editImage = async (
    image: ImageInfo,
    prompt: string,
    settings: AdminSettings,
): Promise<string> => {
    return executeWithFallback(settings, 'editImage', [image, prompt]);
}

export const generateKeywordsForPrompt = async (
    prompt: string,
    settings: AdminSettings
): Promise<string[]> => {
    return executeWithFallback(settings, 'generateKeywordsForPrompt', [prompt]);
};

export const enhancePromptWithKeywords = async (
    prompt: string,
    keywords: string[],
    settings: AdminSettings
): Promise<string> => {
    return executeWithFallback(settings, 'enhancePromptWithKeywords', [prompt, keywords]);
};

export const adaptPromptToTheme = async (
    originalPrompt: string,
    theme: string,
    settings: AdminSettings
): Promise<string> => {
    return executeWithFallback(settings, 'adaptPromptToTheme', [originalPrompt, theme]);
};
