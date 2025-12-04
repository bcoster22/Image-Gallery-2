import { IAiProvider, AiProvider, ProviderCapabilities, AdminSettings } from '../types';

/**
 * Abstract base class for AI Providers.
 * Can be extended to share common logic in the future.
 */
export abstract class BaseProvider implements IAiProvider {
    abstract readonly id: AiProvider;
    abstract readonly name: string;
    abstract readonly capabilities: ProviderCapabilities;

    abstract validateConfig(settings: AdminSettings): boolean;
}
