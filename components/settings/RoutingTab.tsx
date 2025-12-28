import React from 'react';
import { Capability, AdminSettings, AiProvider } from '../../types';
import { capabilityDetails, providerCapabilities } from '../../services/providerCapabilities';
import { isProviderConfigured } from './adminUtils';

interface RoutingTabProps {
    settings: AdminSettings;
    handleRoutingChange: (capability: Capability, provider: AiProvider) => void;
    handleRoutingReorder: (capability: Capability, oldIndex: number, newIndex: number) => void;
}

export const RoutingTab: React.FC<RoutingTabProps> = ({ settings, handleRoutingChange, handleRoutingReorder }) => {
    const ROUTING_GROUPS = [
        {
            name: "Image Analysis & Search",
            description: "Configure specific models for understanding your library. You can assign different specialist models for general analysis, captioning, and tagging.",
            capabilities: ['vision', 'captioning', 'tagging'] as Capability[]
        },
        {
            name: "Creative Studio",
            description: "Configure models for creating and modifying content.",
            capabilities: ['generation', 'animation', 'editing', 'textGeneration'] as Capability[]
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Capabilities Routing</h2>
                <p className="text-sm text-gray-400">
                    Define which AI models handle which tasks. You can chain multiple providers for reliability; if the first fails, the next will be attempted.
                </p>
            </div>

            {ROUTING_GROUPS.map(group => (
                <div key={group.name} className="space-y-4">
                    <div className="border-b border-gray-700 pb-2 mb-4">
                        <h3 className="text-xl font-bold text-indigo-400 flex items-center gap-2">
                            {group.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                    </div>

                    <div className="space-y-4">
                        {group.capabilities.map(cap => {
                            const details = capabilityDetails[cap];
                            const route = settings.routing[cap] || [];

                            // Skip if capability definition is missing (safety)
                            if (!details) return null;

                            return (
                                <div key={cap} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-gray-700/50 rounded-lg text-indigo-400">
                                            <details.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">{details.name}</h4>
                                            <p className="text-xs text-gray-500">{details.description}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pl-12">
                                        {/* Simple list of providers for now (future: drag and drop reordering) */}
                                        <div className="flex flex-wrap gap-2">
                                            {/* List all providers that support this capability */}
                                            {Object.keys(settings.providers).map(p => {
                                                const provider = p as AiProvider;
                                                const isConfigured = isProviderConfigured(settings, provider);
                                                // Check if provider supports this capability
                                                // We need to import providerCapabilities or check logic
                                                // Since we don't have direct access to providerCapabilities map easily here without import
                                                // Let's assume we can fetch it or just check if it's in the route?
                                                // Actually the logic in AdminSettingsPage likely iterates over ALL providers or available ones.

                                                const isActive = route.includes(provider);

                                                // We need to know if the provider actually SUPPORTS this capability to show it as an option
                                                // I will import providerCapabilities
                                                // Removed dynamic require
                                                const supports = providerCapabilities[provider] && providerCapabilities[provider][cap];

                                                if (!supports) return null;

                                                return (
                                                    <button
                                                        key={provider}
                                                        onClick={() => handleRoutingChange(cap, provider)}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${isActive
                                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                                            : isConfigured
                                                                ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                                                : 'bg-gray-800 border-gray-700 text-gray-600 opacity-50 cursor-not-allowed'
                                                            }`}
                                                        disabled={!isConfigured}
                                                        title={!isConfigured ? "Provider not configured" : isActive ? "Click to remove" : "Click to add"}
                                                    >
                                                        {provider}
                                                        {isActive && <span className="ml-2 text-indigo-200">#{route.indexOf(provider) + 1}</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-gray-500">
                                            Selected providers will be used in the order shown (#1, #2...). Click to toggle.
                                            {/* TODO: Add drag and drop reordering specific controls if simple toggle isn't enough */}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
