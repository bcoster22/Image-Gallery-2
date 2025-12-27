import { AdminSettings, AiProvider, Capability } from '../../types';
import { providerCapabilities } from '../../services/providerCapabilities';

export const isProviderConfigured = (settings: AdminSettings, provider: AiProvider): boolean => {
    const providerSettings = settings.providers[provider];
    if (!providerSettings) return false;

    switch (provider) {
        case 'moondream_cloud': {
            const s = providerSettings as AdminSettings['providers']['moondream_cloud'];
            return !!s.apiKey;
        }
        case 'moondream_local': {
            const s = providerSettings as AdminSettings['providers']['moondream_local'];
            return !!s.endpoint;
        }
        case 'comfyui': {
            const s = providerSettings as AdminSettings['providers']['comfyui'];
            return !!s.endpoint;
        }
        default: {
            if ('apiKey' in providerSettings) {
                return !!(providerSettings as any).apiKey;
            }
            return false;
        }
    }
};

export const isCapabilityConfigured = (settings: AdminSettings, provider: AiProvider, capability: Capability): boolean => {
    if (!isProviderConfigured(settings, provider)) return false;

    const providerSettings = settings.providers[provider];
    switch (provider) {
        case 'gemini': {
            const s = providerSettings as AdminSettings['providers']['gemini'];
            if (capability === 'generation') return !!s.generationModel;
            if (capability === 'animation') return !!s.veoModel;
            return true;
        }
        case 'openai': {
            const s = providerSettings as AdminSettings['providers']['openai'];
            if (capability === 'generation') return !!s.generationModel;
            if (capability === 'textGeneration') return !!s.textGenerationModel;
            return false;
        }
        case 'grok': {
            const s = providerSettings as AdminSettings['providers']['grok'];
            if (capability === 'generation') return !!s.generationModel;
            return true;
        }
        case 'moondream_cloud':
        case 'moondream_local':
        case 'comfyui':
            return providerCapabilities[provider][capability] && isProviderConfigured(settings, provider);
        default:
            return false;
    }
};
