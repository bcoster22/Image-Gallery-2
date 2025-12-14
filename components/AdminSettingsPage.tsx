
import React, { useState, useEffect, useRef } from 'react';
import { HarmBlockThreshold } from '@google/genai';
import { AdminSettings, AiProvider, Capability } from '../types';
import { providerCapabilities, capabilityDetails } from '../services/providerCapabilities';
import { SettingsIcon, CheckCircleIcon, XCircleIcon, ZapIcon, LayoutDashboard, Network, MessageSquare, MenuIcon, CloseIcon, ShieldCheckIcon, RefreshIcon, ViewfinderIcon } from './icons';
import { testProviderConnection } from '../services/aiService';
import PromptEngineeringPage from './PromptEngineeringPage';
import { AdminVersions } from './AdminVersions';

interface AdminSettingsPageProps {
    onSave: (settings: AdminSettings) => void;
    onCancel: () => void;
    currentSettings: AdminSettings | null;
}

type ConnectionStatus = 'idle' | 'checking' | 'success' | 'error';
type AdminTab = 'providers' | 'routing' | 'performance' | 'appearance' | 'content-safety' | 'prompts' | 'versions';

const MOONDREAM_MODELS = [
    { id: 'moondream-2', name: 'Moondream 2 (Vision)' },
    { id: 'moondream-3-preview', name: 'Moondream 3 Preview (Vision)' },
    { id: 'sdxl-realism', name: 'SDXL Realism (Generation)' },
    { id: 'sdxl-anime', name: 'SDXL Anime (Generation)' },
    { id: 'sdxl-surreal', name: 'SDXL Surreal (Generation)' },
    { id: 'nsfw-detector', name: 'NSFW Detector' }
];

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
            apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlfaWQiOiJiZWI0OGYwZS02YmFhLTQ5ZTctYmJjMS04Njg1MDQxZThkY2QiLCJvcmdfaWQiOiJKcjY5UVBuRjFhMWEzS1Q2bUR6dTRWWk1iM3dvOUVHd0ZvIiwiaWF0IjoxNzYyNzc4NjQ0LCJ2ZXIiOjF9.sqnDOllPIfJHnnbteIlRYO1ArqTg3dAkQ5ZBG1AzMiE',
        },
        moondream_local: {
            endpoint: 'http://localhost:2021/v1',
            model: 'moondream-2',
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
        editing: ['moondream_local', 'gemini', 'comfyui'],
        textGeneration: ['openai', 'gemini', 'grok'],
    },
    performance: {
        downscaleImages: true,
        maxAnalysisDimension: 1024,
        vramUsage: 'balanced',
    },
    prompts: {
        assignments: {
            'moondream_local': 'detective',
        },
        strategies: [
            {
                id: 'detective',
                name: 'Detective Strategy',
                description: 'A multi-turn interrogation strategy to build detailed descriptions.',
                steps: [
                    {
                        id: 'subject',
                        name: "Subject",
                        prompt: "Describe the main living subject in the image, including their gender, approximate age, clothing, and what action they are performing.",
                        status: "Analyzing subject..."
                    },
                    {
                        id: 'environment',
                        name: "Environment",
                        prompt: "Describe the location and background setting in detail. List at least three prominent objects or architectural features visible behind the main subject.",
                        status: "Analyzing environment..."
                    },
                    {
                        id: 'lighting',
                        name: "Lighting",
                        prompt: "Describe the lighting in the scene. Is it natural or artificial? What time of day does it appear to be, and what is the overall mood created by the light?",
                        status: "Analyzing lighting..."
                    },
                    {
                        id: 'style',
                        name: "Style",
                        prompt: "Describe the style of this image. Is it a candid photo, a professional portrait, a selfie, or a cinematic shot? Mention the camera angle if it's notable.",
                        status: "Analyzing artistic style..."
                    },
                    {
                        id: 'keywords_visual',
                        name: "Visual Keywords",
                        prompt: "List 5-10 descriptive keywords for the visual elements in this image (objects, colors, people), separated by commas. Do not include any other text.",
                        status: "Extracting visual keywords..."
                    },
                    {
                        id: 'keywords_mood',
                        name: "Mood Keywords",
                        prompt: "List 5-10 descriptive keywords for the mood, atmosphere, and style of this image, separated by commas. Do not include any other text.",
                        status: "Extracting mood keywords..."
                    }
                ]
            }
        ]
    },
    contentSafety: {
        enabled: true,
        autoClassify: true,
        threshold: 75,
        nsfwKeyword: 'NSFW',
        sfwKeyword: 'SFW',
        blurNsfw: false,
        showConfidence: true,

        useSingleModelSession: false, // Disabled by default for accuracy
    },
    appearance: {
        thumbnailSize: 40,
        thumbnailHoverScale: 1.2,
    }
};



const RestartServerButton: React.FC<{ endpoint?: string }> = ({ endpoint }) => {
    const [status, setStatus] = useState<'idle' | 'restarting' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleRestart = async () => {
        if (!endpoint) return;

        setStatus('restarting');
        setMessage('Restarting server...');

        try {
            const baseUrl = endpoint.replace(/\/+$/, '');
            const restartUrl = `${baseUrl}/system/restart`;

            const response = await fetch(restartUrl, { method: 'POST' });

            if (response.ok) {
                setStatus('success');
                setMessage('Restart triggered. Waiting for service...');

                const healthUrl = endpoint.replace(/\/v1\/?$/, '/health');
                let retries = 0;
                const maxRetries = 20;

                const poll = setInterval(async () => {
                    retries++;
                    try {
                        const healthRes = await fetch(healthUrl);
                        if (healthRes.ok) {
                            clearInterval(poll);
                            setStatus('idle');
                            setMessage('Server back online!');
                            setTimeout(() => setMessage(''), 3000);
                        }
                    } catch (e) {
                        // Ignore connection errors
                    }

                    if (retries >= maxRetries) {
                        clearInterval(poll);
                        setStatus('error');
                        setMessage('Server restart timed out. Check logs.');
                    }
                }, 2000);

            } else {
                throw new Error('Server returned error');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Failed to trigger restart');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Server Management</span>
            <button
                onClick={handleRestart}
                disabled={status === 'restarting'}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${status === 'restarting' ? 'bg-yellow-500/20 text-yellow-500 cursor-wait' :
                    status === 'success' ? 'bg-green-500/20 text-green-500' :
                        status === 'error' ? 'bg-red-500/20 text-red-500' :
                            'bg-red-900/30 text-red-300 hover:bg-red-900/50 border border-red-900/50'
                    }`}
            >
                {status === 'restarting' ? (
                    <>
                        <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                        Restarting...
                    </>
                ) : status === 'success' ? (
                    <>
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Restarted
                    </>
                ) : (
                    <>
                        <RefreshIcon className="w-3.5 h-3.5" />
                        Restart Server
                    </>
                )}
            </button>
            {message && <span className="ml-2 text-xs text-gray-400 animate-fade-in">{message}</span>}
        </div>
    );
};

const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ onSave, onCancel, currentSettings }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('providers');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Initialize state by deeply merging defaults with current settings.
    const [settings, setSettings] = useState<AdminSettings>(() => {
        if (!currentSettings) return DEFAULTS;

        // Migration logic for old prompts structure if necessary
        let prompts = DEFAULTS.prompts;
        if (currentSettings.prompts) {
            if ('assignments' in currentSettings.prompts) {
                prompts = {
                    ...DEFAULTS.prompts,
                    ...currentSettings.prompts
                };
            } else if ('activeStrategyId' in currentSettings.prompts) {
                // Migrate V2 (activeStrategyId) to V3 (assignments)
                const oldPrompts = currentSettings.prompts as any;
                prompts = {
                    assignments: {
                        'moondream_local': oldPrompts.activeStrategyId || 'detective'
                    },
                    strategies: oldPrompts.strategies || DEFAULTS.prompts.strategies
                };
            } else if ('detective' in currentSettings.prompts) {
                // Migrate V1 (detective array) to V3
                const oldDetective = (currentSettings.prompts as any).detective;
                prompts = {
                    assignments: {
                        'moondream_local': 'detective'
                    },
                    strategies: [
                        {
                            id: 'detective',
                            name: 'Detective Strategy',
                            description: 'Migrated from previous settings.',
                            steps: oldDetective.map((step: any, index: number) => ({
                                id: `step-${index}`,
                                ...step
                            }))
                        }
                    ]
                };
            }
        }

        // Deep merge providers to ensure new fields (like 'model') are preserved from DEFAULTS
        const mergedProviders = { ...DEFAULTS.providers };
        if (currentSettings.providers) {
            (Object.keys(currentSettings.providers) as AiProvider[]).forEach(key => {
                if (currentSettings.providers[key]) {
                    mergedProviders[key] = {
                        ...mergedProviders[key],
                        ...currentSettings.providers[key]
                    };
                }
            });
        }

        return {
            ...DEFAULTS,
            ...currentSettings,
            providers: mergedProviders,
            routing: {
                ...DEFAULTS.routing,
                ...currentSettings.routing
            },
            performance: {
                ...DEFAULTS.performance,
                ...(currentSettings.performance || {})
            },
            prompts: prompts,
            contentSafety: {
                ...(currentSettings.contentSafety || {})
            },
            appearance: {
                ...DEFAULTS.appearance,
                ...(currentSettings.appearance || {})
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
        } catch (error) {
            setConnectionStatuses(prev => ({ ...prev, [provider]: 'error' }));
        }
    };

    // Check connections on mount and when settings change
    useEffect(() => {
        const providersToCheck: AiProvider[] = ['gemini', 'openai', 'grok', 'moondream_cloud', 'moondream_local', 'comfyui'];
        providersToCheck.forEach(p => {
            if (isProviderConfigured(p) && connectionStatuses[p] === 'idle') {
                checkConnection(p);
            }
        });
    }, [settings.providers]);

    const handleProviderChange = (provider: AiProvider, field: string, value: any) => {
        const newSettings = {
            ...settings,
            providers: {
                ...settings.providers,
                [provider]: {
                    ...settings.providers[provider],
                    [field]: value
                }
            }
        };
        setSettings(newSettings);

        // Reset connection status on change
        setConnectionStatuses(prev => ({ ...prev, [provider]: 'idle' }));
    };

    const handlePerformanceChange = <K extends keyof AdminSettings['performance']>(
        field: K,
        value: AdminSettings['performance'][K]
    ) => {
        setSettings({
            ...settings,
            performance: {
                ...settings.performance,
                [field]: value
            }
        });
    };

    const handleRoutingChange = (capability: Capability, provider: AiProvider) => {
        const currentRoute = settings.routing[capability] || [];
        let newRoute;

        if (currentRoute.includes(provider)) {
            newRoute = currentRoute.filter(p => p !== provider);
        } else {
            newRoute = [...currentRoute, provider];
        }

        setSettings({
            ...settings,
            routing: {
                ...settings.routing,
                [capability]: newRoute
            }
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

    const CapabilityTag: React.FC<{ capability: Capability, configured: boolean, providerId: AiProvider }> = ({ capability, configured, providerId }) => {
        const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failure'>('idle');
        const [errorMessage, setErrorMessage] = useState<string>('');
        const details = capabilityDetails[capability];

        if (!details) return null;
        const Icon = details.icon;

        // Better short names
        const shortName = {
            vision: 'Vision',
            generation: 'Generation',
            animation: 'Animation',
            editing: 'Editing',
            textGeneration: 'Text'
        }[capability] || details.name.split(' ')[0];

        const handleTest = async (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!configured) return;

            setTestStatus('testing');
            setErrorMessage('');

            try {
                // Dynamic import to avoid circular dependencies
                const { registry } = await import('../services/providerRegistry');
                const provider = registry.getProvider(providerId);

                if (provider && 'testCapability' in provider) {
                    await (provider as any).testCapability(capability, settings);
                    setTestStatus('success');
                } else {
                    // Fallback mock check if not implemented
                    // Just mimic success for now if it's not Moondream (as per previous logic)
                    if (providerId !== 'moondream_local') {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        setTestStatus('success');
                    } else {
                        throw new Error("Capability test not implemented");
                    }
                }
            } catch (error: any) {
                setTestStatus('failure');
                setErrorMessage(error.message || "Test failed");
            }
        };

        return (
            <div className={`flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-full border transition-colors cursor-default relative group ${testStatus === 'success' ? 'bg-green-500/20 text-green-300 border-green-500/50' :
                testStatus === 'failure' ? 'bg-red-500/20 text-red-300 border-red-500/50' :
                    configured ? 'bg-green-500/10 text-green-300 border-green-500/30' :
                        'bg-gray-700/50 text-gray-400 border-gray-600'
                }`}
                title={errorMessage || `${details.name} - ${configured ? 'Configured' : 'Not configured'}`}
            >
                {testStatus === 'testing' ? (
                    <RefreshIcon className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                ) : (
                    <Icon className={`w-3.5 h-3.5 ${testStatus === 'success' ? 'text-green-400' :
                        testStatus === 'failure' ? 'text-red-400' :
                            configured ? 'text-green-400' : 'text-gray-500'
                        }`} />
                )}
                <span>{shortName}</span>

                {/* Test Button (Only for Moondream Local for now as per request) */}
                {configured && providerId === 'moondream_local' && (capability === 'vision' || capability === 'generation') && (
                    <button
                        onClick={handleTest}
                        className={`ml-1 focus:outline-none transition-opacity ${testStatus === 'failure' ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
                        title="Run Test"
                    >
                        <div className={`w-3 h-3 rounded-full ${testStatus === 'failure' ? 'bg-red-400 animate-pulse' : 'bg-current'}`}></div>
                    </button>
                )}

                {/* Error Tooltip */}
                {testStatus === 'failure' && errorMessage && (
                    <div className="absolute left-0 top-full mt-2 w-max max-w-[200px] z-50 p-2 bg-red-900 border border-red-700 text-white text-xs rounded shadow-xl hidden group-hover:block">
                        {errorMessage}
                    </div>
                )}
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
            return (
                <>
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
                    <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-400">Model</label>
                        <select
                            value={providerSetting.model || 'moondream-2'}
                            onChange={(e) => handleProviderChange(provider as any, 'model', e.target.value)}
                            className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            {MOONDREAM_MODELS.map(model => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="mt-4 pt-2 border-t border-gray-700/50">
                        <RestartServerButton endpoint={providerSetting.endpoint} />
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
            </>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'providers':
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="text-2xl font-bold text-white mb-4">AI Providers</h2>
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
                                                <CapabilityTag key={capability} capability={capability} configured={isCapabilityConfigured(provider, capability)} providerId={provider} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            case 'routing':
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="text-2xl font-bold text-white mb-4">Capabilities Routing</h2>
                        <p className="text-sm text-gray-400 mb-6">For each capability, add providers to create a fallback chain. The app will try them in order from top to bottom.</p>
                        <div className="space-y-4">
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
                                                        <XCircleIcon className="w-5 h-5" />
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
                                                            {isConfigured ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" /> : <XCircleIcon className="w-3.5 h-3.5 text-red-500" />}
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
                );
            case 'appearance':
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="text-2xl font-bold text-white mb-4">Appearance Settings</h2>
                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                            <h3 className="text-lg font-bold text-white mb-2">Thumbnail Navigation</h3>
                            <p className="text-sm text-gray-400 mb-6">Adjust the size of the thumbnail strip shown in the image viewer.</p>

                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <label htmlFor="thumb-size-slider" className="text-sm font-medium text-gray-200">
                                        Thumbnail Size: <span className="text-indigo-400 font-bold">{settings.appearance?.thumbnailSize ?? 40}px</span>
                                    </label>
                                </div>
                                <input
                                    type="range"
                                    id="thumb-size-slider"
                                    min="30"
                                    max="100"
                                    step="5"
                                    value={settings.appearance?.thumbnailSize ?? 40}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        appearance: {
                                            ...settings.appearance,
                                            thumbnailSize: Number(e.target.value)
                                        }
                                    })}
                                    className="w-full h-2 bg-gradient-to-r from-indigo-900 to-indigo-500 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-2">
                                    <span>30px (Compact)</span>
                                    <span>100px (Large)</span>
                                </div>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <label htmlFor="thumb-hover-slider" className="text-sm font-medium text-gray-200">
                                        Thumbnail Hover Scale: <span className="text-indigo-400 font-bold">{settings.appearance?.thumbnailHoverScale ?? 1.2}x</span>
                                    </label>
                                </div>
                                <input
                                    type="range"
                                    id="thumb-hover-slider"
                                    min="1.0"
                                    max="2.0"
                                    step="0.1"
                                    value={settings.appearance?.thumbnailHoverScale ?? 1.2}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        appearance: {
                                            ...settings.appearance,
                                            thumbnailHoverScale: Number(e.target.value)
                                        }
                                    })}
                                    className="w-full h-2 bg-gradient-to-r from-indigo-900 to-indigo-500 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-2">
                                    <span>1.0x (No Zoom)</span>
                                    <span>2.0x (200%)</span>
                                </div>
                            </div>

                            <div className="bg-black/40 rounded-xl border border-white/10 p-6 flex flex-col items-center justify-center">
                                <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">Live Preview</h4>
                                <div
                                    className="flex gap-2 p-2 overflow-hidden bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg px-3"
                                    style={{ maxWidth: '100%' }}
                                >
                                    {[1, 2, 3, 4, 5].map((i) => {
                                        const size = settings.appearance?.thumbnailSize ?? 40;
                                        const hoverScale = settings.appearance?.thumbnailHoverScale ?? 1.2;
                                        const isSelected = i === 3;

                                        // For preview, we'll make the 2nd item hovered and 3rd selected
                                        const isHovered = i === 2;

                                        // Calculate selected size similar to actual implementation
                                        // Active is hardcoded to ~1.4x in ImageViewer currently, but let's make it respect hover scale if it's larger, or just stay distinct.
                                        // Actually, let's keep the preview simpl;e.

                                        const scale = isSelected ? Math.max(1.4, hoverScale) : (isHovered ? hoverScale : 1);

                                        const width = size * scale;
                                        const height = size * scale;

                                        return (
                                            <div
                                                key={i}
                                                className={`relative flex-shrink-0 rounded-md overflow-hidden transition-all duration-300 ${isSelected ? 'ring-2 ring-white opacity-100' : (isHovered ? 'ring-0 opacity-100' : 'ring-0 opacity-50')}`}
                                                style={{
                                                    width: `${size}px`,
                                                    height: `${size}px`,
                                                    transform: `scale(${scale})`,
                                                    margin: '0 4px'
                                                }}
                                            >
                                                <div className={`w-full h-full ${isSelected ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                                                    {isHovered && <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold bg-black/20">HOVER</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'performance':
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="text-2xl font-bold text-white mb-4">Performance Settings</h2>
                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                            <h3 className="text-lg font-bold text-white mb-2">Image Analysis</h3>
                            <p className="text-sm text-gray-400 mb-4">Downscaling images before sending them to AI can significantly improve analysis speed and reduce costs, but may slightly decrease accuracy.</p>
                            <div className="flex items-center justify-between mb-3">
                                <label htmlFor="downscale-toggle" className="text-sm font-medium text-gray-200">Downscale images for AI analysis</label>
                                <input type="checkbox" id="downscale-toggle" checked={settings.performance?.downscaleImages ?? true} onChange={e => handlePerformanceChange('downscaleImages', e.target.checked)} className="h-5 w-5 rounded-md border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                            </div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="dimension-input" className="text-sm font-medium text-gray-200">Max dimension (pixels)</label>
                                <input type="number" id="dimension-input" value={settings.performance?.maxAnalysisDimension ?? 1024} onChange={e => handlePerformanceChange('maxAnalysisDimension', parseInt(e.target.value, 10))} className="w-24 bg-gray-700 border border-gray-600 rounded-md p-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50" disabled={!settings.performance?.downscaleImages} />
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-white mb-1">VRAM Management</h3>
                                        <div className="group relative">
                                            <div className="cursor-help text-gray-400 hover:text-white transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div className="absolute left-full top-0 ml-2 w-72 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-xs z-50 hidden group-hover:block">
                                                <h4 className="font-bold text-indigo-400 mb-2">VRAM Strategies:</h4>
                                                <ul className="space-y-2 text-gray-300">
                                                    <li><strong className="text-white">High:</strong> Keeps all models loaded. Best for 24GB+ VRAM. Fastest switching.</li>
                                                    <li><strong className="text-white">Balanced:</strong> Smart switching. Unloads the unused model when switching tasks. Best for 12-16GB VRAM.</li>
                                                    <li><strong className="text-white">Low:</strong> Aggressively unloads models after every request. Best for 8GB VRAM.</li>
                                                </ul>
                                                <p className="mt-2 text-gray-500 italic">System naturally recovers from OOM errors by unloading all models and retrying.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-2">Configure how GPU memory is managed between models.</p>
                                </div>
                                <select
                                    value={settings.performance?.vramUsage || 'balanced'}
                                    onChange={(e) => handlePerformanceChange('vramUsage', e.target.value as any)}
                                    className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                >
                                    <option value="high">High Performance (Keep All Loaded)</option>
                                    <option value="balanced">Balanced (Smart Switching)</option>
                                    <option value="low">Low VRAM (Unload After Use)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'content-safety':
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="text-2xl font-bold text-white mb-4">Content Safety</h2>
                        <p className="text-sm text-gray-400 mb-6">Configure automatic NSFW detection and content classification for all images.</p>

                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
                            {/* Enable/Disable */}
                            <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
                                <div>
                                    <label htmlFor="content-safety-enabled" className="text-sm font-medium text-gray-200">Enable NSFW Detection</label>
                                    <p className="text-xs text-gray-400 mt-1">Turn on content safety classification</p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="content-safety-enabled"
                                    checked={settings.contentSafety?.enabled ?? true}
                                    onChange={e => {
                                        setSettings({
                                            ...settings,
                                            contentSafety: { ...settings.contentSafety, enabled: e.target.checked }
                                        });
                                    }}
                                    className="h-5 w-5 rounded-md border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>

                            {/* Auto-classify */}
                            <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
                                <div>
                                    <label htmlFor="auto-classify" className="text-sm font-medium text-gray-200">Auto-classify all images</label>
                                    <p className="text-xs text-gray-400 mt-1">Automatically run NSFW check after image analysis</p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="auto-classify"
                                    checked={settings.contentSafety?.autoClassify ?? true}
                                    onChange={e => {
                                        setSettings({
                                            ...settings,
                                            contentSafety: { ...settings.contentSafety, autoClassify: e.target.checked }
                                        });
                                    }}
                                    className="h-5 w-5 rounded-md border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    disabled={!settings.contentSafety?.enabled}
                                />
                            </div>

                            {/* Threshold Slider */}
                            <div className="pb-3 border-b border-gray-700/50">
                                <label htmlFor="threshold-slider" className="text-sm font-medium text-gray-200 block mb-2">
                                    Classification Threshold: {settings.contentSafety?.threshold ?? 75}%
                                </label>
                                <input
                                    type="range"
                                    id="threshold-slider"
                                    min="0"
                                    max="100"
                                    value={settings.contentSafety?.threshold ?? 75}
                                    onChange={e => {
                                        setSettings({
                                            ...settings,
                                            contentSafety: { ...settings.contentSafety, threshold: parseInt(e.target.value) }
                                        });
                                    }}
                                    className="w-full h-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg appearance-none cursor-pointer"
                                    disabled={!settings.contentSafety?.enabled}
                                />
                                <p className="text-xs text-gray-400 mt-2">Only mark as NSFW if confidence is above this threshold</p>
                            </div>

                            {/* Keywords */}
                            <div className="pb-3 border-b border-gray-700/50">
                                <h3 className="text-sm font-semibold text-gray-300 mb-3">Keywords</h3>
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400">NSFW Keyword</label>
                                        <input
                                            type="text"
                                            value={settings.contentSafety?.nsfwKeyword ?? 'NSFW'}
                                            onChange={e => {
                                                setSettings({
                                                    ...settings,
                                                    contentSafety: { ...settings.contentSafety, nsfwKeyword: e.target.value }
                                                });
                                            }}
                                            className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            disabled={!settings.contentSafety?.enabled}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400">SFW Keyword</label>
                                        <input
                                            type="text"
                                            value={settings.contentSafety?.sfwKeyword ?? 'SFW'}
                                            onChange={e => {
                                                setSettings({
                                                    ...settings,
                                                    contentSafety: { ...settings.contentSafety, sfwKeyword: e.target.value }
                                                });
                                            }}
                                            className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            disabled={!settings.contentSafety?.enabled}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Display Options */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-300 mb-3">Display Options</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="show-confidence" className="text-sm text-gray-200">Show confidence scores</label>
                                        <input
                                            type="checkbox"
                                            id="show-confidence"
                                            checked={settings.contentSafety?.showConfidence ?? true}
                                            onChange={e => {
                                                setSettings({
                                                    ...settings,
                                                    contentSafety: { ...settings.contentSafety, showConfidence: e.target.checked }
                                                });
                                            }}
                                            className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            disabled={!settings.contentSafety?.enabled}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="blur-nsfw" className="text-sm text-gray-200">Blur NSFW images in gallery</label>
                                        <input
                                            type="checkbox"
                                            id="blur-nsfw"
                                            checked={settings.contentSafety?.blurNsfw ?? false}
                                            onChange={e => {
                                                setSettings({
                                                    ...settings,
                                                    contentSafety: { ...settings.contentSafety, blurNsfw: e.target.checked }
                                                });
                                            }}
                                            className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            disabled={!settings.contentSafety?.enabled}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pb-3">
                                <div>
                                    <label htmlFor="single-session" className="text-sm font-medium text-gray-200">Use single model session</label>
                                    <p className="text-xs text-gray-400 mt-1">Keep one model loaded for faster processing (may reduce accuracy)</p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="single-session"
                                    checked={settings.contentSafety?.useSingleModelSession ?? false}
                                    onChange={e => {
                                        setSettings({
                                            ...settings,
                                            contentSafety: { ...settings.contentSafety, useSingleModelSession: e.target.checked }
                                        });
                                    }}
                                    className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    disabled={!settings.contentSafety?.enabled}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'prompts':
                return <PromptEngineeringPage settings={settings} onUpdateSettings={setSettings} />;
            case 'versions':
                return <AdminVersions />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-[80vh] max-w-7xl mx-auto bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden shadow-2xl animate-fade-in relative">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden absolute top-4 left-4 z-50 p-2 bg-gray-800 rounded-md text-gray-400 hover:text-white border border-gray-700 shadow-lg"
            >
                {isSidebarOpen ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                absolute md:relative inset-y-0 left-0 z-40 w-64 bg-gray-800/95 md:bg-gray-800/50 border-r border-gray-700 flex flex-col transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 border-b border-gray-700 pt-16 md:pt-6">
                    <div className="flex items-center gap-3 text-indigo-400 mb-1">
                        <SettingsIcon className="w-6 h-6" />
                        <span className="font-bold text-lg tracking-wide">Admin</span>
                    </div>
                    <p className="text-xs text-gray-500">System Configuration</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <button
                        onClick={() => { setActiveTab('providers'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'providers' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Providers
                    </button>
                    <button
                        onClick={() => { setActiveTab('routing'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'routing' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
                    >
                        <Network className="w-5 h-5" />
                        Routing
                    </button>
                    <button
                        onClick={() => { setActiveTab('appearance'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'appearance' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                        <ViewfinderIcon className="w-5 h-5 mr-3" />
                        <span className="font-medium">Appearance</span>
                    </button>

                    <button
                        onClick={() => { setActiveTab('performance'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'performance' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
                    >
                        <ZapIcon className="w-5 h-5" />
                        Performance
                    </button>
                    <button
                        onClick={() => { setActiveTab('content-safety'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'content-safety' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
                    >
                        <ShieldCheckIcon className="w-5 h-5" />
                        Content Safety
                    </button>
                    <button
                        onClick={() => { setActiveTab('prompts'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'prompts' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
                    >
                        <MessageSquare className="w-5 h-5" />
                        Prompt Engineering
                    </button>
                    <button
                        onClick={() => { setActiveTab('versions'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'versions' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
                    >
                        <RefreshIcon className="w-5 h-5" />
                        Update Core
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <div className="flex gap-2">
                        <button onClick={onCancel} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                            Cancel
                        </button>
                        <button onClick={() => onSave(settings)} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/50">
                            Save
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-900/30 p-4 md:p-8 pt-16 md:pt-8">
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminSettingsPage;
