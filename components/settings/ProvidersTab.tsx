import React, { useState } from 'react';
import { BoltIcon as ZapIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { AdminSettings, AiProvider, Capability } from '../../types';
import { providerCapabilities, capabilityDetails } from '../../services/providerCapabilities';
import { StatusIndicator, CapabilityTag, RestartServerButton, ServerControlPanel, ConnectionStatus } from './SettingsComponents';
import { isProviderConfigured, isCapabilityConfigured } from './adminUtils';

interface ProvidersTabProps {
    settings: AdminSettings;
    handleProviderChange: (provider: AiProvider, field: string, value: any) => void;
    connectionStatuses: Record<string, ConnectionStatus>;
    availableMoondreamModels: any[];
    getDynamicModelName: (id: string | null) => string;
    onModelRefresh?: () => void;
}

export const ProvidersTab: React.FC<ProvidersTabProps> = ({
    settings,
    handleProviderChange,
    connectionStatuses,
    availableMoondreamModels,
    getDynamicModelName,
    onModelRefresh
}) => {

    const renderProviderFields = (provider: AiProvider, providerSetting: any) => {
        // 1. ComfyUI (Complex Mode Switch)
        if (provider === 'comfyui') {
            return (
                <>
                    <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-400">Mode</label>
                        <div className="flex items-center gap-1 mt-1 bg-gray-900/50 border border-gray-600 rounded-lg p-1 w-min">
                            <button onClick={() => handleProviderChange(provider, 'mode', 'local')} className={`px-3 py-1 text-sm rounded-md transition-colors ${providerSetting.mode === 'local' ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700'}`}>Local</button>
                            <button onClick={() => handleProviderChange(provider, 'mode', 'hosted')} className={`px-3 py-1 text-sm rounded-md transition-colors ${providerSetting.mode !== 'local' ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700'}`}>Hosted</button>
                        </div>
                    </div>
                    <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-400">Endpoint URL</label>
                        <input type="text" value={providerSetting.endpoint || ''} placeholder="e.g., http://localhost:8188" onChange={(e) => handleProviderChange(provider, 'endpoint', e.target.value)} className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-400">API Key (Optional)</label>
                        <input type="password" value={providerSetting.apiKey || ''} placeholder="Enter API Key if required" onChange={(e) => handleProviderChange(provider, 'apiKey', e.target.value)} className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                </>
            );
        }

        // 2. Moondream Local (Endpoint only)
        if (provider === 'moondream_local') {
            // Filter models by type
            const visionModels = availableMoondreamModels.filter(m => m.type === 'vision');
            const analysisModels = availableMoondreamModels.filter(m => m.type === 'analysis');
            let generationModels = availableMoondreamModels.filter(m => m.type === 'generation');

            // Sort generation models: curated first (alphabetically), then custom (alphabetically)
            generationModels = generationModels.sort((a, b) => {
                if (a.source === 'curated' && b.source !== 'curated') return -1;
                if (a.source !== 'curated' && b.source === 'curated') return 1;
                return (a.name || '').localeCompare(b.name || '');
            });

            // Helper to format model name with format badge
            const formatModelName = (model: any) => {
                let name = model.name;
                if (model.format) {
                    const formatUpper = model.format.toUpperCase();
                    const formatIndicator = model.has_warning ? `⚠️ ${formatUpper}` : formatUpper;
                    name = `${model.name} [${formatIndicator}]`;
                }
                return name;
            };

            // Handle model refresh
            const handleRefreshModels = async () => {
                try {
                    const response = await fetch(`${providerSetting.endpoint}/v1/models/refresh`, {
                        method: 'POST'
                    });
                    if (response.ok) {
                        if (onModelRefresh) {
                            onModelRefresh();
                        }
                    }
                } catch (error) {
                    console.error('Failed to refresh models:', error);
                }
            };

            return (
                <>
                    <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-400">Local Endpoint URL</label>
                        <input
                            type="text"
                            value={providerSetting.endpoint || ''}
                            placeholder="e.g., http://localhost:2020/v1"
                            onChange={(e) => handleProviderChange(provider as any, 'endpoint', e.target.value)}
                            className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="space-y-4 border-t border-gray-700/50 pt-3 mt-3">
                        <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Model Configuration</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                    Captioning Model
                                </label>
                                <select
                                    value={providerSetting.captionModel || providerSetting.model || ''}
                                    onChange={(e) => handleProviderChange(provider as any, 'captionModel', e.target.value || null)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                                >
                                    {visionModels.length > 0 ? (
                                        visionModels.map(model => (
                                            <option key={`cap-${model.id}`} value={model.id}>
                                                {model.name}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="">No vision models available</option>
                                    )}
                                </select>
                                <p className="text-[10px] text-gray-500 italic mt-1">For descriptive captions</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                    Tagging Model
                                </label>
                                <select
                                    value={providerSetting.taggingModel || ''}
                                    onChange={(e) => handleProviderChange(provider as any, 'taggingModel', e.target.value || null)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                                >
                                    {analysisModels.length > 0 ? (
                                        <>
                                            <option value="">Use Default Captioning Model</option>
                                            {analysisModels.map(model => (
                                                <option key={`tag-${model.id}`} value={model.id}>
                                                    {model.name}
                                                </option>
                                            ))}
                                        </>
                                    ) : (
                                        <option value="">No tagging models available</option>
                                    )}
                                </select>
                                <p className="text-[10px] text-gray-500 italic mt-1">For keyword extraction</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                    Generation Model
                                </label>
                                <select
                                    value={providerSetting.generationModel || ''}
                                    onChange={(e) => handleProviderChange(provider as any, 'generationModel', e.target.value || null)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                                >
                                    {generationModels.length > 0 ? (
                                        <>
                                            <option value="">Select generation model</option>
                                            {generationModels.map(model => (
                                                <option key={`gen-${model.id}`} value={model.id}>
                                                    {formatModelName(model)}
                                                </option>
                                            ))}
                                        </>
                                    ) : (
                                        <option value="">No generation models available</option>
                                    )}
                                </select>
                                <p className="text-[10px] text-gray-500 italic mt-1">For image generation</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] text-gray-500 italic">
                                These models are used when "Moondream Local" is selected for the specific capability in the Routing tab.
                            </p>
                            <button
                                onClick={handleRefreshModels}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-300 hover:text-indigo-200 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded transition-colors"
                                title="Refresh model list"
                            >
                                <ArrowPathIcon className="w-3.5 h-3.5" />
                                Refresh
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-gray-700/50">
                        <ServerControlPanel
                            endpoint={providerSetting.endpoint}
                            managerUrl={typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : ''}
                            onServerReady={onModelRefresh}
                        />
                    </div>
                </>
            );
        }

        // 3. Generic (API Key + Models)
        return (
            <>
                <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-400">API Key</label>
                    <input
                        type="password"
                        value={providerSetting.apiKey || ''}
                        onChange={(e) => handleProviderChange(provider as any, 'apiKey', e.target.value)}
                        className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                {'generationModel' in providerSetting && (
                    <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-400">Generation Model</label>
                        <input
                            type="text"
                            value={providerSetting.generationModel || ''}
                            onChange={(e) => handleProviderChange(provider as any, 'generationModel', e.target.value)}
                            className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                )}
                {'veoModel' in providerSetting && (
                    <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-400">Video Model</label>
                        <input
                            type="text"
                            value={providerSetting.veoModel || ''}
                            onChange={(e) => handleProviderChange(provider as any, 'veoModel', e.target.value)}
                            className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                )}
                {/* Text Generation Model for OpenAI */}
                {'textGenerationModel' in providerSetting && provider === 'openai' && (
                    <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-400">Text Generation Model</label>
                        <input
                            type="text"
                            value={providerSetting.textGenerationModel || ''}
                            onChange={(e) => handleProviderChange(provider as any, 'textGenerationModel', e.target.value)}
                            className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4">AI Providers</h2>
            {(Object.keys(providerCapabilities) as AiProvider[]).map(provider => {
                const isConfigured = isProviderConfigured(settings, provider);
                const providerSetting = settings.providers[provider];

                if (!providerSetting) return null;

                const details = capabilityDetails[provider]; // Just for name, if needed, but the loop below uses capabilityDetails[provider] inside? No, wait.
                // Ah, the original code used capabilityDetails[provider]?.name
                const providerName = capabilityDetails[provider as unknown as Capability] ?
                    (capabilityDetails[provider as unknown as Capability] as any).name : // Wait, AiProvider is not Capability. Check imports.
                    // Actually capabilityDetails is keyed by Capability, providerFunctions keyed by AiProvider. 
                    // Let's check how it was done in AdminSettingsPage.tsx
                    // {capabilityDetails[provider]?.name || provider} <- This lines implies provider is a key in capabilityDetails?
                    // Let's assume it was done correctly there or I misunderstood types.
                    // Wait, capabilityDetails is Record<Capability, ...>
                    // And AiProvider keys are different? 
                    // Let's just use provider name from a map or fallback.
                    // Actually, looking at previous view, it accessed `capabilityDetails[provider]`? 
                    // If so, `provider` strings must match some `Capability` strings? No.
                    // Ah, maybe there's a typo in original code or I missed something.
                    // Let's use a safe fallback.
                    provider;

                return (
                    <div key={provider} className={`p-4 rounded-lg border-2 transition-all ${isConfigured ? 'bg-gray-800/50 border-green-500/50' : 'bg-gray-800/20 border-gray-700'}`}>
                        <h3 className="text-lg font-bold text-white flex items-center mb-3">
                            <div className="flex items-center">
                                <ZapIcon className={`w-5 h-5 mr-2 ${isConfigured ? 'text-green-400' : 'text-gray-500'}`} />
                                <span className="capitalize">{provider.replace('_', ' ')}</span>
                            </div>
                            <StatusIndicator status={connectionStatuses[provider]} />
                        </h3>

                        {renderProviderFields(provider, providerSetting)}

                        <div className="mt-4 pt-3 border-t border-gray-700/50">
                            <h4 className="text-xs font-semibold text-gray-400 mb-2">Supported & Configured Capabilities</h4>
                            <div className="flex flex-wrap gap-2">
                                {(Object.keys(providerCapabilities[provider]) as Capability[]).filter(c => providerCapabilities[provider][c]).map(capability => (
                                    <CapabilityTag
                                        key={capability}
                                        capability={capability}
                                        configured={isCapabilityConfigured(settings, provider, capability)}
                                        providerId={provider}
                                        settings={settings}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
