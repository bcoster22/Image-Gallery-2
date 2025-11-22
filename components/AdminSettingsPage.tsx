
import React, { useState, useEffect, useRef } from 'react';
import { HarmBlockThreshold } from '@google/genai';
import { AdminSettings, AiProvider, Capability } from '../types';
import { providerCapabilities, capabilityDetails } from '../services/providerCapabilities';
import { SettingsIcon, CheckCircleIcon, XCircleIcon, ZapIcon } from './icons';
import { testProviderConnection } from '../services/aiService';

interface AdminSettingsPageProps {
  onSave: (settings: AdminSettings) => void;
  onCancel: () => void;
  currentSettings: AdminSettings | null;
}

type ConnectionStatus = 'idle' | 'checking' | 'success' | 'error';

const DEFAULTS: AdminSettings = {
    providers: {
        gemini: {
            apiKey: 'AIzaSyAuhxoQ4W7EevVz3EUeZQeXdvHAY0jrlEQ',
            generationModel: 'imagen-4.0-generate-001',
            veoModel: 'veo-3.1-fast-generate-preview',
            safetySettings: {
                harassment: HarmBlockThreshold.BLOCK_NONE,
                hateSpeech: HarmBlockThreshold.BLOCK_NONE,
                sexuallyExplicit: HarmBlockThreshold.BLOCK_NONE,
                dangerousContent: HarmBlockThreshold.BLOCK_NONE,
            },
        },
        grok: {
            apiKey: 'xai-Qo6ypDlg1lCk5TvYYjjVKKUiFksKreyHHrCV0IN3Wbx7uiOIBrMRuYHNHKxvGfEjyJ60U60F6QKMIAT5',
            generationModel: 'grok-2-image-1212',
        },
        moondream_cloud: {
            apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlfaWQiOiJiZWI0OGYwZS02YmFhLTQ5ZTctYmJjMS04Njg1MDQxZThkY2QiLCJvcmdfaWQiOiJKcjY5UVBuRjFhM0tUNm1EenU0VlpNYjN3bzlFR3dGbyIsImlhdCI6MTc2Mjc3ODY0NCwidmVyIjoxfQ.sqnDOllPIfJHnnbteIlRYO1ArqTg3dAkQ5ZBG1AzMiE',
        },
        moondream_local: {
            endpoint: 'http://localhost:2021/v1',
        },
        openai: {
            apiKey: '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',
            generationModel: 'dall-e-3',
            textGenerationModel: 'gpt-4o',
            organizationId: 'org-X4U0u6C4oF0T28yZO6Xw8LiP',
            projectId: 'Default Project',
        },
        comfyui: {
            mode: 'local',
            endpoint: 'http://127.0.0.1:8188',
            apiKey: '',
        }
    },
    routing: {
        vision: ['gemini', 'grok', 'moondream_cloud', 'moondream_local'],
        generation: ['gemini', 'openai', 'grok', 'comfyui'],
        animation: ['gemini', 'comfyui'],
        editing: ['gemini', 'comfyui'],
        textGeneration: ['openai', 'gemini', 'grok'],
    },
    performance: {
        downscaleImages: true,
        maxAnalysisDimension: 1024,
    },
};


const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ onSave, onCancel, currentSettings }) => {
    // Initialize state by deeply merging defaults with current settings.
    const [settings, setSettings] = useState<AdminSettings>(() => {
        if (!currentSettings) return DEFAULTS;
        return {
            ...DEFAULTS,
            ...currentSettings,
            providers: {
                ...DEFAULTS.providers,
                ...currentSettings.providers,
            },
            routing: {
                ...DEFAULTS.routing,
                ...currentSettings.routing
            },
            performance: {
                ...DEFAULTS.performance,
                ...(currentSettings.performance || {})
            }
        };
    });

    // Initialize connection statuses for all providers
    const [connectionStatuses, setConnectionStatuses] = useState<Record<AiProvider, ConnectionStatus>>({
        gemini: 'idle',
        openai: 'idle',
        grok: 'idle',
        moondream_cloud: 'idle',
        moondream_local: 'idle',
        comfyui: 'idle',
    });

    // Debounce timer for settings changes
    const debounceTimer = useRef<number | null>(null);

    const checkConnection = async (provider: AiProvider) => {
        // Don't check if not properly configured
        if (!isProviderConfigured(provider)) {
            setConnectionStatuses(prev => ({ ...prev, [provider]: 'idle' }));
            return;
        }

        setConnectionStatuses(prev => ({ ...prev, [provider]: 'checking' }));
        try {
            await testProviderConnection(provider, settings);
            setConnectionStatuses(prev => ({ ...prev, [provider]: 'success' }));
        } catch (e) {
            console.error(`Connection check failed for ${provider}:`, e);
            setConnectionStatuses(prev => ({ ...prev, [provider]: 'error' }));
        }
    };

    const checkAllConnections = () => {
        (Object.keys(providerCapabilities) as AiProvider[]).forEach(provider => {
            checkConnection(provider);
        });
    };

    // Poll every 30 seconds
    useEffect(() => {
        // Check immediately on mount
        checkAllConnections();

        const intervalId = setInterval(() => {
            checkAllConnections();
        }, 30000);

        return () => clearInterval(intervalId);
    }, []); // Empty dependency array: runs once on mount, loops internally

    // Re-check whenever settings change (debounced)
    useEffect(() => {
        if (debounceTimer.current) {
            window.clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = window.setTimeout(() => {
            checkAllConnections();
        }, 1500); // 1.5s debounce

        return () => {
            if (debounceTimer.current) {
                window.clearTimeout(debounceTimer.current);
            }
        };
    }, [settings.providers]); // Dependency on settings.providers deep check logic is handled by React


    const handleProviderChange = <T extends AiProvider, K extends keyof AdminSettings['providers'][T]>(
        provider: T,
        field: K,
        value: AdminSettings['providers'][T][K]
    ) => {
        setSettings(prev => ({
            ...prev,
            providers: {
                ...prev.providers,
                [provider]: {
                    ...prev.providers[provider],
                    [field]: value,
                }
            }
        }));
        // The useEffect above will catch this change and trigger a check
    };

    const handlePerformanceChange = <K extends keyof AdminSettings['performance']>(
        field: K,
        value: AdminSettings['performance'][K]
    ) => {
        setSettings(prev => ({
            ...prev,
            performance: {
                ...(prev.performance || DEFAULTS.performance),
                [field]: value,
            }
        }));
    };
    
    const handleRoutingChange = (capability: Capability, provider: AiProvider) => {
        setSettings(prev => {
            const currentRoute = prev.routing[capability] || [];
            const newRoute = currentRoute.includes(provider)
                ? currentRoute.filter(p => p !== provider)
                : [...currentRoute, provider];
            return {
                ...prev,
                routing: { ...prev.routing, [capability]: newRoute }
            };
        });
    };
    
    const isProviderConfigured = (provider: AiProvider): boolean => {
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
    }

    const isCapabilityConfigured = (provider: AiProvider, capability: Capability): boolean => {
        if (!isProviderConfigured(provider)) return false;

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
                return providerCapabilities[provider][capability] && isProviderConfigured(provider);
            default:
                return false;
        }
    }

    const CapabilityTag: React.FC<{ capability: Capability, configured: boolean }> = ({ capability, configured }) => {
      const details = capabilityDetails[capability];
      if (!details) return null;
      const Icon = details.icon;
      return (
        <div 
            className={`flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-full border ${configured ? 'bg-green-500/10 text-green-300 border-green-500/30' : 'bg-gray-700/50 text-gray-400 border-gray-600'}`}
            title={`${details.name} - ${configured ? 'Configured & Ready' : 'Not fully configured'}`}
        >
            <Icon className={`w-3.5 h-3.5 ${configured ? 'text-green-400' : 'text-gray-500'}`} />
            <span>{details.name.split(' ')[0]}</span>
        </div>
      );
    };

    const StatusIndicator: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
        let colorClass = 'bg-gray-600 border-gray-500'; // Idle
        let textColor = 'text-gray-500';
        let pulse = '';
        let label = 'Not Configured';

        if (status === 'checking') {
            colorClass = 'bg-yellow-500 border-yellow-300 shadow-[0_0_8px_rgba(234,179,8,0.6)]';
            textColor = 'text-yellow-400';
            pulse = 'animate-pulse';
            label = 'Checking...';
        } else if (status === 'success') {
            colorClass = 'bg-green-500 border-green-300 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
            textColor = 'text-green-400';
            label = 'Online';
        } else if (status === 'error') {
            colorClass = 'bg-red-600 border-red-400 shadow-[0_0_8px_rgba(220,38,38,0.6)]';
            textColor = 'text-red-400';
            label = 'Connection Failed';
        }

        return (
            <div className="flex items-center ml-4 gap-2" title={label}>
                <div className={`w-2.5 h-2.5 rounded-full border-[1.5px] flex-shrink-0 ${colorClass} ${pulse}`}></div>
                <span className={`text-xs font-semibold uppercase tracking-wide ${textColor}`}>
                    {status === 'idle' ? 'Not Configured' : label}
                </span>
            </div>
        );
    };

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
                        <input type="text" value={providerSetting.endpoint || ''} placeholder="e.g., http://localhost:8188" onChange={(e) => handleProviderChange(provider, 'endpoint', e.target.value)} className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"/>
                    </div>
                     <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-400">API Key (Optional)</label>
                        <input type="password" value={providerSetting.apiKey || ''} placeholder="Enter API Key if required" onChange={(e) => handleProviderChange(provider, 'apiKey', e.target.value)} className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"/>
                    </div>
                </>
            );
        }

        // 2. Moondream Local (Endpoint only)
        if (provider === 'moondream_local') {
            return (
                <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-400">Local Endpoint URL</label>
                    <input 
                        type="text" 
                        value={providerSetting.endpoint || ''} 
                        placeholder="e.g., http://localhost:2021/v1" 
                        onChange={(e) => handleProviderChange(provider as any, 'endpoint', e.target.value)} 
                        className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            );
        }

        // 3. General Providers (API Key & Models - including Moondream Cloud)
        return Object.entries(providerSetting).map(([key, value]) => {
            if (key === 'safetySettings') return null;
            return (
                <div key={key} className="mb-2">
                    <label className="block text-xs font-medium text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                    <input
                        type={key.toLowerCase().includes('key') ? 'password' : 'text'}
                        value={value as string || ''}
                        placeholder={`Enter ${key.replace(/([A-Z])/g, ' $1')}`}
                        onChange={(e) => handleProviderChange(provider, key as any, e.target.value)}
                        className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            );
        });
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center">
                    <SettingsIcon className="w-8 h-8 mr-3 text-indigo-400" />
                    <div>
                        <h1 className="text-3xl font-bold text-white">Administrator Settings</h1>
                        <p className="text-gray-400">Configure AI providers and routing for all capabilities.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-end">
                    <button onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onClick={() => onSave(settings)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Save and Exit
                    </button>
                </div>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Providers Column */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">Providers</h2>
                    {(Object.keys(providerCapabilities) as AiProvider[]).map(provider => {
                        const isConfigured = isProviderConfigured(provider);
                        const providerSetting = settings.providers[provider];
                        
                        if (!providerSetting) return null;

                        return (
                            <div key={provider} className={`p-4 rounded-lg border-2 transition-all ${isConfigured ? 'bg-gray-800/50 border-green-500/50' : 'bg-gray-800/20 border-gray-700'}`}>
                                <h3 className="text-lg font-bold text-white flex items-center mb-3">
                                    <div className="flex items-center">
                                        <ZapIcon className={`w-5 h-5 mr-2 ${isConfigured ? 'text-green-400' : 'text-gray-500'}`} />
                                        {capabilityDetails[provider]?.name || provider}
                                    </div>
                                    <StatusIndicator status={connectionStatuses[provider]} />
                                </h3>
                                
                                {renderProviderFields(provider, providerSetting)}
                                
                                <div className="mt-4 pt-3 border-t border-gray-700/50">
                                    <h4 className="text-xs font-semibold text-gray-400 mb-2">Supported & Configured Capabilities</h4>
                                     <div className="flex flex-wrap gap-2">
                                        {(Object.keys(providerCapabilities[provider]) as Capability[]).filter(c => providerCapabilities[provider][c]).map(capability => (
                                            <CapabilityTag key={capability} capability={capability} configured={isCapabilityConfigured(provider, capability)} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="space-y-4">
                    {/* Capabilities Column */}
                    <div>
                        <h2 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">Capabilities Routing</h2>
                        <p className="text-sm text-gray-400 mt-2">For each capability, add providers to create a fallback chain. The app will try them in order from top to bottom.</p>
                        <div className="space-y-4 mt-4">
                        {Object.entries(capabilityDetails).filter(([key]) => key in settings.routing).map(([cap, details]) => {
                            const capability = cap as Capability;
                            const route = settings.routing[capability] || [];
                            return (
                                <div key={capability} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <details.icon className="w-5 h-5 text-indigo-400" />
                                        {details.name}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1 mb-3">{details.description}</p>
                                    <div className="space-y-2">
                                        {route.map((providerId, index) => (
                                            <div key={providerId} className="flex items-center gap-2 bg-gray-700/50 p-2 rounded-md">
                                                <span className="text-xs font-bold text-indigo-300 bg-indigo-900/50 px-2 py-1 rounded-full">{index + 1}</span>
                                                <span className="text-sm text-gray-200 flex-grow">{capabilityDetails[providerId as AiProvider]?.name || providerId}</span>
                                                <button onClick={() => handleRoutingChange(capability, providerId as AiProvider)} className="text-red-400 hover:text-red-300">
                                                    <XCircleIcon className="w-5 h-5"/>
                                                </button>
                                            </div>
                                        ))}
                                        {route.length === 0 && (
                                            <div className="text-center p-3 border-2 border-dashed border-gray-600 rounded-md">
                                                <p className="text-sm text-gray-500">No providers assigned. Add one from below.</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3">
                                        <h4 className="text-xs font-semibold text-gray-400 mb-2">Available Providers (Click to Add)</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {(Object.keys(providerCapabilities) as AiProvider[]).map(providerId => {
                                                const isCapable = providerCapabilities[providerId][capability];
                                                const isRouted = route.includes(providerId);
                                                const isConfigured = isCapabilityConfigured(providerId, capability);
                                                if (!isCapable || isRouted) return null;
                                                return (
                                                    <button 
                                                        key={providerId}
                                                        onClick={() => handleRoutingChange(capability, providerId)}
                                                        disabled={!isConfigured}
                                                        title={!isConfigured ? `${capabilityDetails[providerId]?.name} is not fully configured for this capability.` : `Add ${capabilityDetails[providerId]?.name} to fallback chain.`}
                                                        className="flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-md transition-colors bg-gray-600 hover:bg-gray-500 text-gray-200 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                                                    >
                                                        {isConfigured ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-500"/> : <XCircleIcon className="w-3.5 h-3.5 text-red-500"/>}
                                                        {capabilityDetails[providerId]?.name || providerId}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                    {/* Performance Section */}
                    <div className="space-y-4">
                         <h2 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">Performance</h2>
                         <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                             <h3 className="text-lg font-bold text-white mb-2">Image Analysis</h3>
                             <p className="text-sm text-gray-400 mb-4">Downscaling images before sending them to AI can significantly improve analysis speed and reduce costs, but may slightly decrease accuracy.</p>
                             <div className="flex items-center justify-between mb-3">
                                 <label htmlFor="downscale-toggle" className="text-sm font-medium text-gray-200">Downscale images for AI analysis</label>
                                 <input type="checkbox" id="downscale-toggle" checked={settings.performance?.downscaleImages ?? true} onChange={e => handlePerformanceChange('downscaleImages', e.target.checked)} className="h-5 w-5 rounded-md border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
                             </div>
                             <div className="flex items-center justify-between">
                                 <label htmlFor="dimension-input" className="text-sm font-medium text-gray-200">Max dimension (pixels)</label>
                                 <input type="number" id="dimension-input" value={settings.performance?.maxAnalysisDimension ?? 1024} onChange={e => handlePerformanceChange('maxAnalysisDimension', parseInt(e.target.value, 10))} className="w-24 bg-gray-700 border border-gray-600 rounded-md p-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50" disabled={!settings.performance?.downscaleImages}/>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
             <style>{`
                  @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                  .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                  }
              `}</style>
        </div>
    );
};

export default AdminSettingsPage;
