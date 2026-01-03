import { ImageInfo, AdminSettings, AiProvider, AspectRatio, Capability, ImageAnalysisResult, GenerationResult, GenerationSettings } from "../types";
import { logger } from "./loggingService";
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

export const getProviderModels = async (
    providerId: AiProvider,
    settings: AdminSettings
): Promise<{ id: string; name: string }[]> => {
    const provider = registry.getProvider(providerId);
    if (provider && provider.getModels) {
        return await provider.getModels(settings);
    }
    return [];
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

type FunctionName = 'analyzeImage' | 'detectSubject' | 'detectObject' | 'generateImageFromPrompt' | 'animateImage' | 'editImage' | 'generateKeywordsForPrompt' | 'enhancePromptWithKeywords' | 'adaptPromptToTheme' | 'captionImage' | 'tagImage';

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
        case 'captionImage': return 'captioning';
        case 'tagImage': return 'tagging';
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
    let providerOrder = settings.routing[requiredCapability] || [];

    // Fallback: If 'editing' is not routed (legacy settings), try 'generation' providers
    if (requiredCapability === 'editing' && providerOrder.length === 0) {
        providerOrder = settings.routing.generation || [];
    }
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
                    finalCoreArgs[0] = prompt.substring(0, 900);
                } catch (shortenError) {
                    console.error("Failed to shorten prompt; using truncated version.", shortenError);
                    finalCoreArgs[0] = prompt.substring(0, 900);
                }
            }
        }

        try {
            console.log(`Attempting ${funcName} with ${providerId}...`);
            logger.info(`Attempting ${funcName} with ${providerId}...`, 'AI Service');
            onProgress?.({ provider: providerId, status: 'attempting' });
            // Call the function on the provider instance
            return await providerFunc.call(provider, ...finalCoreArgs, settings, onStatus);
        } catch (e: any) {
            lastError = e;
            failedAttempts.push({ provider: providerId, error: e.message });
            const msg = `Provider ${providerId} failed for ${funcName}: ${e.message}`;
            console.warn(msg);
            logger.warn(msg, 'AI Service', e);
            onProgress?.({ provider: providerId, status: 'failed_attempt', message: e.message });
        }
    }

    if (lastError) {
        const errorMessage = `All routed AI providers failed for '${requiredCapability}'. Last error from ${failedAttempts[failedAttempts.length - 1].provider}.`;
        throw new FallbackChainError(errorMessage, failedAttempts);
    }

    throw new Error(`All routed AI providers failed or are not configured for '${requiredCapability}'. Please check your settings.`);
}

// Legacy NSFW detector removed. Safety relies on WD14/Truth Committee 'rating:' tags.

/**
 * Analyzes an image using configured providers.
 * Intelligently routes captioning and tagging requests based on routing settings.
 * If routing is unified (same provider for all), it uses a single 'analyzeImage' call.
 * If routing is split, it executes parallel requests to the respective specialists.
 */
export const analyzeImage = async (
    image: ImageInfo,
    settings: AdminSettings,
    onProgress?: (update: { provider: AiProvider, status: 'attempting' | 'failed_attempt', message?: string }) => void,
    onStatus?: (message: string) => void
): Promise<ImageAnalysisResult> => {
    // Check routing configuration
    const captionRoute = settings.routing.captioning || [];
    const taggingRoute = settings.routing.tagging || [];

    // Default to vision if these are empty (migration safety)
    const visionRoute = settings.routing.vision || [];
    const effectiveCaptionProvider = captionRoute.length > 0 ? captionRoute[0] : visionRoute[0];
    const effectiveTaggingProvider = taggingRoute.length > 0 ? taggingRoute[0] : visionRoute[0];

    let result: ImageAnalysisResult;

    // Optimization: If both capabilities are routed to the SAME provider, use the unified 'analyzeImage' call
    // to save time and API costs (most providers do both in one pass).
    // Ensure that provider is also the primary vision provider to use valid routing logic.
    if (effectiveCaptionProvider === effectiveTaggingProvider && effectiveCaptionProvider === visionRoute[0]) {
        result = await executeWithFallback<ImageAnalysisResult>(settings, 'analyzeImage', [image], onProgress, onStatus);
    } else {
        // Split execution
        if (onStatus) onStatus('Running distributed analysis (Captions + Tags)...');

        const captionPromise = executeWithFallback<string>(settings, 'captionImage', [image], onProgress);
        const taggingPromise = executeWithFallback<string[]>(settings, 'tagImage', [image], onProgress);

        const [recreationPrompt, keywords] = await Promise.all([captionPromise, taggingPromise]);

        // CRITICAL FIX: Return stats from split calls too
        // We'll use the tagging provider's stats since it typically includes VRAM metrics
        // If that fails, try to get fresh VRAM metrics
        let stats = undefined;
        try {
            const provider = registry.getProvider(effectiveTaggingProvider);
            if (provider) {
                // Most providers attach stats to their last response
                // For now, we'll fetch current VRAM state if moondream_local
                if (effectiveTaggingProvider === 'moondream_local') {
                    const endpoint = settings.providers.moondream_local.endpoint || 'http://localhost:2020';
                    const res = await fetch(`${endpoint}/v1/models`);
                    const vramUsed = parseFloat(res.headers.get('X-VRAM-Used') || '0');
                    const vramTotal = parseFloat(res.headers.get('X-VRAM-Total') || '0');

                    if (vramTotal > 0) {
                        stats = {
                            device: 'GPU',
                            duration: 0, // Unknown for split calls
                            devicePerformance: {
                                vramUsedMB: vramUsed,
                                vramTotalMB: vramTotal,
                                vramUsagePercent: (vramUsed / vramTotal) * 100
                            }
                        };
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to fetch VRAM stats for split routing:', e);
        }

        result = {
            recreationPrompt,
            keywords,
            stats
        };
    }

    // Check for 5-Level Rating from tagging (WD14 V3 / Truth Committee)
    // Only proceed if Content Safety is globally enabled
    const ratingTag = result.keywords?.find(k => k.startsWith('rating:'));
    if (ratingTag && settings.contentSafety?.enabled) {
        if (onStatus) onStatus('Processing Image Rating...');
        const rating = ratingTag.replace('rating:', '');

        // Map 5-Level to Binary for legacy system compatibility (Blurring)
        // R, X, XXX are considered NSFW for blurring purposes
        const isNsfw = ['R', 'X', 'XXX'].includes(rating);

        // Try to extract explicit score if available
        const scoreTag = result.keywords?.find(k => k.startsWith('score:explicit:'));
        let confidence = 99; // Default if not found
        if (scoreTag) {
            const rawScore = parseFloat(scoreTag.split(':')[2]);
            if (!isNaN(rawScore)) confidence = rawScore * 100;
        }

        const classification = {
            label: (isNsfw ? 'NSFW' : 'SFW') as 'NSFW' | 'SFW',
            score: isNsfw ? (confidence / 100) : (1 - (confidence / 100)),
            confidence: confidence,
            predictions: [],
            lastChecked: Date.now()
        };

        image.nsfwClassification = classification;
        result.nsfwClassification = classification;
    }

    return result;
};

export const captionImage = async (
    image: ImageInfo,
    settings: AdminSettings
): Promise<string> => {
    return executeWithFallback(settings, 'captionImage', [image]);
};

export const tagImage = async (
    image: ImageInfo,
    settings: AdminSettings
): Promise<string[]> => {
    return executeWithFallback(settings, 'tagImage', [image]);
};

export const detectSubject = async (
    image: ImageInfo,
    settings: AdminSettings
): Promise<{ x: number, y: number } | undefined> => {
    return executeWithFallback(settings, 'detectSubject', [image]);
};

/**
 * Detects a specific object in an image and returns its bounding box.
 * Required for 'vision' capability.
 */
export const detectObject = async (
    image: ImageInfo,
    objectName: string,
    settings: AdminSettings
): Promise<{ ymin: number; xmin: number; ymax: number; xmax: number } | null> => {
    return executeWithFallback(settings, 'detectObject', [image, objectName]);
};

export const generateImageFromPrompt = async (
    prompt: string,
    settings: AdminSettings,
    aspectRatio: AspectRatio,
    sourceImage?: ImageInfo,
    overrides?: GenerationSettings
): Promise<GenerationResult> => {
    return executeWithFallback(settings, 'generateImageFromPrompt', [prompt, aspectRatio, sourceImage, overrides]);
};

export const animateImage = async (
    image: ImageInfo | null,
    prompt: string,
    aspectRatio: AspectRatio,
    settings: AdminSettings
): Promise<{ uri: string, apiKey: string }> => {
    return executeWithFallback(settings, 'animateImage', [image, prompt, aspectRatio]);
};

export const batchTagImages = async (
    images: ImageInfo[],
    settings: AdminSettings
): Promise<{ tags: string[], imageId: string }[]> => {
    // Currently only Moondream Local supports batching via our explicit implementation
    // We bypass the generic executeWithFallback for this specific specialized features
    const provider = registry.getProvider('moondream_local');
    if (!provider) throw new Error("Moondream Local provider not found");

    if ((provider as any).batchTagImages) {
        return await (provider as any).batchTagImages(images, settings);
    }
    throw new Error("Provider does not support batch tagging");
};

export const editImage = async (
    image: ImageInfo,
    prompt: string,
    settings: AdminSettings,
    strength?: number
): Promise<GenerationResult> => {
    return executeWithFallback(settings, 'editImage', [image, prompt, strength]);
};

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
    try {
        return await executeWithFallback(settings, 'adaptPromptToTheme', [originalPrompt, theme]);
    } catch (e) {
        console.warn("LLM adaptation failed or not configured. Falling back to simple concatenation.", e);
        return `${theme}, ${originalPrompt}`;
    }
};
