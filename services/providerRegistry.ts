import { IAiProvider, AiProvider, Capability } from '../types';

class ProviderRegistry {
    private providers: Map<AiProvider, IAiProvider> = new Map();

    /**
     * Registers a provider instance.
     */
    register(provider: IAiProvider) {
        if (this.providers.has(provider.id)) {
            console.warn(`Provider ${provider.id} is already registered. Overwriting.`);
        }
        this.providers.set(provider.id, provider);
        console.log(`Registered AI Provider: ${provider.name} (${provider.id})`);
    }

    /**
     * Retrieves a provider by ID.
     */
    getProvider(id: AiProvider): IAiProvider | undefined {
        return this.providers.get(id);
    }

    /**
     * Returns all registered providers.
     */
    getProviders(): IAiProvider[] {
        return Array.from(this.providers.values());
    }

    /**
     * Returns all providers that support a specific capability.
     */
    getProvidersForCapability(capability: Capability): IAiProvider[] {
        return this.getProviders().filter(p => p.capabilities[capability]);
    }
}

export const registry = new ProviderRegistry();
