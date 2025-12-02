import { ImageInfo, AdminSettings, AiProvider, AspectRatio, Capability, ImageAnalysisResult } from "../types";
import { providerCapabilities } from "./providerCapabilities";
import * as gemini from './providers/gemini';
import * as openai from './providers/openai';
import * as grok from './providers/grok';
import * as moondream from './providers/moondream';
import * as comfyui from './providers/comfyui';

export class FallbackChainError extends Error {
    // ... (keep existing content until analyzeImage)
    public attempts: { provider: AiProvider; error: string }[];
    constructor(message: string, attempts: { provider: AiProvider; error: string }[]) {
        super(message);
        this.name = 'FallbackChainError';
        this.attempts = attempts;
    }
}

const ALL_PROVIDERS: AiProvider[] = ['gemini', 'openai', 'grok', 'moondream_cloud', 'moondream_local', 'comfyui'];

const providerMap = {
    gemini,
    openai,
    grok,
    moondream_cloud: {
        ...moondream,
        analyzeImage: moondream.analyzeImageCloud,
        testConnection: moondream.testConnectionCloud,
    },
    moondream_local: {
        ...moondream,
        analyzeImage: moondream.analyzeImageLocal,
        testConnection: moondream.testConnectionLocal,
    },
    comfyui,
};

export const isProviderConfiguredFor = (
    settings: AdminSettings,
    capability: Capability,
    provider: AiProvider
): boolean => {
    if (!providerCapabilities[provider][capability]) return false;

    const providerSettings = settings.providers[provider];

    // Cast to any to avoid TS union discrimination issues in simple checks
    const anySettings = providerSettings as any;

    switch (provider) {
        case 'gemini': {
            if (anySettings.apiKey) {
                if (capability === 'generation' && !anySettings.generationModel) return false;
                if (capability === 'animation' && !anySettings.veoModel) return false;
                return true;
            }
            return false;
        }
        case 'grok': {
            if (anySettings.apiKey) {
                if (capability === 'generation' && !anySettings.generationModel) return false;
                return true;
            }
            return false;
        }
        case 'moondream_cloud': {
            return !!anySettings.apiKey;
        }
        case 'moondream_local': {
            return !!anySettings.endpoint;
        }
        case 'openai': {
            if (anySettings.apiKey) {
                if (capability === 'generation' && !anySettings.generationModel) return false;
                if (capability === 'textGeneration' && !anySettings.textGenerationModel) return false;
                return true;
            }
            return false;
        }
        case 'comfyui': {
            // For ComfyUI, the endpoint is always required. API key is optional.
            return !!anySettings.endpoint;
        }
    }
    return false;
};


export const isAnyProviderConfiguredFor = (
    settings: AdminSettings | null,
    capability: Capability
): boolean => {
    if (!settings) return false;
    for (const provider of ALL_PROVIDERS) {
        if (isProviderConfiguredFor(settings, capability, provider)) {
            return true;
        }
    }
    return false;
};

export const testProviderConnection = async (
    provider: AiProvider,
    settings: AdminSettings
): Promise<void> => {
    const implementation = providerMap[provider];
    if (implementation && 'testConnection' in implementation) {
        // Cast to any because the specific signature of testConnection might vary slightly in internal implementations
        // but generally matches (settings) => Promise<void>
        await (implementation as any).testConnection(settings);
    } else {
        throw new Error(`Connection testing not implemented for ${provider}`);
    }
};


type FunctionName = 'analyzeImage' | 'generateImageFromPrompt' | 'animateImage' | 'editImage' | 'generateKeywordsForPrompt' | 'enhancePromptWithKeywords' | 'adaptPromptToTheme';

function getCapabilityForFunction(funcName: FunctionName): Capability {
    switch (funcName) {
        case 'analyzeImage': return 'vision';
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

    for (const provider of providerOrder) {
        if (!isProviderConfiguredFor(settings, requiredCapability, provider)) {
            console.log(`Skipping ${provider} for ${funcName}: It is not configured correctly, although it is in the routing list.`);
            continue;
        }

        const providerImpl = providerMap[provider as keyof typeof providerMap];
        const providerFunc = providerImpl?.[funcName] as Function | undefined;
        if (!providerFunc) continue;

        let finalCoreArgs = [...coreArgs];
        if (provider === 'grok' && funcName === 'generateImageFromPrompt' && finalCoreArgs[0] && typeof finalCoreArgs[0] === 'string' && settings.providers.gemini.apiKey) {
            let prompt = finalCoreArgs[0];
            if (prompt.length > 900) {
                try {
                    console.log("Grok prompt is too long, shortening with Gemini...");
                    finalCoreArgs[0] = await gemini.shortenPrompt(prompt, settings);
                } catch (shortenError) {
                    console.error("Failed to shorten prompt; using truncated version.", shortenError);
                    finalCoreArgs[0] = prompt.substring(0, 900);
                }
            }
        }

        try {
            console.log(`Attempting ${funcName} with ${provider}...`);
            onProgress?.({ provider, status: 'attempting' });
            return await providerFunc(...finalCoreArgs, settings, onStatus);
        } catch (e: any) {
            lastError = e;
            failedAttempts.push({ provider, error: e.message });
            console.warn(`Provider ${provider} failed for ${funcName}:`, e.message);
            onProgress?.({ provider, status: 'failed_attempt', message: e.message });
        }
    }

    if (lastError) {
        const errorMessage = `All routed AI providers failed for '${requiredCapability}'. Last error from ${failedAttempts[failedAttempts.length - 1].provider}.`;
        throw new FallbackChainError(errorMessage, failedAttempts);
    }

    throw new Error(`All routed AI providers failed or are not configured for '${requiredCapability}'. Please check your settings.`);
}

/**
 * Classify image for NSFW content using the NSFW detector model
 */
export const classifyImageSafety = async (
    image: ImageInfo,
    settings: AdminSettings
): Promise<ImageInfo['nsfwClassification']> => {
    // Check if moondream_local is configured
    if (!settings.providers.moondream_local.endpoint) {
        console.warn('Moondream Local not configured, skipping NSFW classification');
        return undefined;
    }

    try {
        // Temporarily switch to NSFW model for classification
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

        // Call moondream with NSFW model
        const result = await moondream.analyzeImageLocal(image, nsfwSettings);

        // Parse the classification from the result
        // The NSFW detector returns: "NSFW Classification: SFW (91.5% confidence)."
        const match = result.recreationPrompt.match(/NSFW Classification: (\w+) \(([0-9.]+)% confidence\)/);

        if (match) {
            const label = match[1] as 'NSFW' | 'SFW';
            const confidence = parseFloat(match[2]);

            // Extract predictions from keywords if available
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

export const analyzeImage = async (
    image: ImageInfo,
    settings: AdminSettings,
    onProgress?: (update: { provider: AiProvider, status: 'attempting' | 'failed_attempt', message?: string }) => void,
    onStatus?: (message: string) => void
): Promise<ImageAnalysisResult> => {
    // Run the standard analysis
    const result = await executeWithFallback(settings, 'analyzeImage', [image], onProgress, onStatus);

    // If content safety is enabled and auto-classify is on, run NSFW classification
    // Skip if using single model session (for speed)
    if (settings.contentSafety?.enabled &&
        settings.contentSafety?.autoClassify &&
        !settings.contentSafety?.useSingleModelSession) {
        if (onStatus) onStatus('Running content safety check...');

        const classification = await classifyImageSafety(image, settings);

        if (classification) {
            // Add NSFW/SFW keyword based on threshold
            const threshold = settings.contentSafety.threshold || 50;
            const isNsfw = classification.label === 'NSFW' && classification.confidence >= threshold;
            const keyword = isNsfw
                ? (settings.contentSafety.nsfwKeyword || 'NSFW')
                : (settings.contentSafety.sfwKeyword || 'SFW');

            // Ensure keywords array exists
            if (!result.keywords) {
                result.keywords = [];
            }

            // Add the keyword if not already present
            if (!result.keywords.includes(keyword)) {
                result.keywords.unshift(keyword); // Add to beginning
            }

            // Store classification in the image (will be saved by caller)
            image.nsfwClassification = classification;
            result.nsfwClassification = classification;
        }
    }

    return result;
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
