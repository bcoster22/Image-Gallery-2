import React, { useState, useEffect, useRef } from 'react';
import { HarmBlockThreshold } from '@google/genai';
import { AdminSettings, AiProvider, Capability } from '../types';
import {
    Cog6ToothIcon as SettingsIcon,
    Squares2X2Icon as LayoutDashboard,
    ShareIcon as Network,
    ChatBubbleLeftEllipsisIcon as MessageSquare,
    Bars3Icon as MenuIcon,
    XMarkIcon as CloseIcon,
    ArrowPathIcon as RefreshIcon,
    ViewfinderCircleIcon as ViewfinderIcon,
    BoltIcon as ZapIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { testProviderConnection } from '../services/aiService';
import { MoondreamLocalProvider } from '../services/providers/moondream';


// Sub-components
import { ProvidersTab } from './settings/ProvidersTab';
import { RoutingTab } from './settings/RoutingTab';
import { AppearanceTab } from './settings/AppearanceTab';
import { PerformanceTab } from './settings/PerformanceTab';
import { ResilienceTab } from './settings/ResilienceTab';
import { ContentSafetyTab } from './settings/ContentSafetyTab';
import { UsageCostsTab } from './settings/UsageCostsTab';
import { ConnectionStatus } from './settings/SettingsComponents';
import PromptEngineeringPage from './PromptEngineeringPage';
import { AdminVersions } from './AdminVersions';

interface AdminSettingsPageProps {
    onSave: (settings: AdminSettings) => void;
    onCancel: () => void;
    currentSettings: AdminSettings | null;
}

type AdminTab = 'providers' | 'routing' | 'performance' | 'appearance' | 'content-safety' | 'prompts' | 'versions' | 'resilience' | 'usage-costs';

// Fallback model list
const MOONDREAM_MODELS = [
    { id: 'moondream-3-preview', name: 'Moondream 3 Preview' },
    { id: 'moondream-2', name: 'Moondream 2 Latest' },
    { id: 'joycaption-alpha-2', name: 'JoyCaption Alpha 2' },
    { id: 'florence-2-large', name: 'Florence-2 Large' },
    { id: 'wd14-vit-v2', name: 'WD14 ViT Tagger v2' },
    { id: 'sdxl-realism', name: 'SDXL Realism (Juggernaut)' },
    { id: 'sdxl-anime', name: 'SDXL Anime (Animagine)' },
    { id: 'sdxl-surreal', name: 'SDXL Surreal (DreamShaper)' },
];

const getMoondreamModelName = (id: string | null) => {
    if (!id) return 'Default';
    const model = MOONDREAM_MODELS.find(m => m.id === id);
    return model ? model.name : id;
};

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
            apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlfaWQiOiJiZWI0OGYwZS02YmFhLTQ5ZTctYmJjMS04Njg1MDQxMThkY2QiLCJvcmdfaWQiOiJKcjY5UVBuRjFhMWEzS1Q2bUR6dTRWWk1iM3dvOUVHd0ZvIiwiaWF0IjoxNzYyNzc4NjQ0LCJ2ZXIiOjF9.sqnDOllPIfJHnnbteIlRYO1ArqTg3dAkQ5ZBG1AzMiE',
        },
        moondream_local: {
            endpoint: 'http://127.0.0.1:2020',
            model: 'moondream-3-preview-4bit',
            captionModel: null,
            taggingModel: null
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
        captioning: ['gemini', 'moondream_local', 'grok'],
        tagging: ['moondream_local', 'gemini'],
    },
    appearance: {
        thumbnailSize: 40,
        thumbnailHoverScale: 1.2
    },
    performance: {
        downscaleImages: true,
        maxAnalysisDimension: 1024,
        vramUsage: 'balanced'
    },
    contentSafety: {
        enabled: true,
        autoClassify: true,
        threshold: 75,
        nsfwKeyword: 'NSFW',
        sfwKeyword: 'SFW',
        showConfidence: true,
        blurNsfw: false,
        useSingleModelSession: false
    },
    resilience: {
        pauseOnLocalFailure: true,
        checkActiveJobOnRecovery: true,
        checkBackendInterval: 5000,
        failoverEnabled: false
    },
    prompts: {
        assignments: {},
        strategies: []
    }
};

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ onSave, onCancel, currentSettings }) => {
    const [settings, setSettings] = useState<AdminSettings>(currentSettings || DEFAULTS);
    const [connectionStatuses, setConnectionStatuses] = useState<Record<string, ConnectionStatus>>({});
    const [activeTab, setActiveTab] = useState<AdminTab>('providers');
    const [availableMoondreamModels, setAvailableMoondreamModels] = useState<any[]>(MOONDREAM_MODELS);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Ensure all sections are initialized (merging defaults)
    useEffect(() => {
        if (currentSettings) {
            setSettings(prev => ({
                ...DEFAULTS,
                ...currentSettings,
                providers: { ...DEFAULTS.providers, ...currentSettings.providers },
                routing: { ...DEFAULTS.routing, ...currentSettings.routing },
                appearance: { ...DEFAULTS.appearance, ...currentSettings.appearance },
                performance: { ...DEFAULTS.performance, ...currentSettings.performance },
                contentSafety: { ...DEFAULTS.contentSafety, ...currentSettings.contentSafety },
                resilience: { ...DEFAULTS.resilience, ...currentSettings.resilience }
            }));
        }
    }, [currentSettings]);


    // Fetch available models from backend
    const fetchModels = async () => {
        try {
            const provider = new MoondreamLocalProvider();
            const models = await provider.getModels(settings); // Now returns { id, name, type? }

            setAvailableMoondreamModels(models.map(m => ({
                id: m.id,
                name: m.name,
                type: m.type
            })));
        } catch (error) {
            console.warn("Failed to fetch models from backend, using fallback list.");
        }
    };

    // Check connection statuses
    const checkConnections = async () => {
        // Iterate keys to ensure typing
        for (const key of Object.keys(settings.providers) as AiProvider[]) {
            const config = settings.providers[key];
            if (!config) continue;

            // Only auto-check if it looks configured (has key or endpoint)
            const isConfigured = 'apiKey' in config ? !!(config as any).apiKey : 'endpoint' in config ? !!(config as any).endpoint : false;

            if (isConfigured) {
                // We'll update state individually to show progress
                setConnectionStatuses(prev => ({ ...prev, [key]: 'checking' }));

                try {
                    await testProviderConnection(key, settings);
                    setConnectionStatuses(prev => ({ ...prev, [key]: 'success' }));
                } catch (e) {
                    setConnectionStatuses(prev => ({ ...prev, [key]: 'error' }));
                }
            } else {
                setConnectionStatuses(prev => ({ ...prev, [key]: 'idle' }));
            }
        }
    };

    // Handle manual refresh from child (e.g. after backend restart)
    const handleModelRefresh = () => {
        // Small delay to ensure backend is fully ready
        setTimeout(() => {
            checkConnections();
            fetchModels();
        }, 500);
    };

    // Effect for endpoint changes (Debounced)
    useEffect(() => {
        const timeoutId = setTimeout(fetchModels, 1000);
        return () => clearTimeout(timeoutId);
    }, [settings.providers.moondream_local?.endpoint]);

    // Check connection statuses on load and poll every 30 seconds
    useEffect(() => {
        checkConnections();
        const interval = setInterval(checkConnections, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run on mount and set up polling

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
        setConnectionStatuses(prev => ({ ...prev, [provider]: 'idle' }));
    };

    const handleRoutingChange = (capability: Capability, provider: AiProvider) => {
        const currentRoute = settings.routing[capability] || [];
        let newRoute;

        if (currentRoute.includes(provider)) {
            // Remove
            newRoute = currentRoute.filter(p => p !== provider);
        } else {
            // Add to end
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

    const handleRoutingReorder = (capability: Capability, oldIndex: number, newIndex: number) => {
        const currentRoute = [...(settings.routing[capability] || [])];
        const [removed] = currentRoute.splice(oldIndex, 1);
        currentRoute.splice(newIndex, 0, removed);

        setSettings({
            ...settings,
            routing: {
                ...settings.routing,
                [capability]: currentRoute
            }
        });
    };

    // Pass explicit update function for tabs that need full control
    const updateSettings = (newSettings: AdminSettings) => {
        setSettings(newSettings);
    };

    const getDynamicModelNameHelper = (id: string | null) => getMoondreamModelName(id);

    const renderContent = () => {
        switch (activeTab) {
            case 'providers':
                return (
                    <ProvidersTab
                        settings={settings}
                        handleProviderChange={handleProviderChange}
                        connectionStatuses={connectionStatuses}
                        availableMoondreamModels={availableMoondreamModels}
                        getDynamicModelName={getDynamicModelNameHelper}
                        onModelRefresh={handleModelRefresh}
                    />
                );
            case 'routing':
                return (
                    <RoutingTab
                        settings={settings}
                        handleRoutingChange={handleRoutingChange}
                        handleRoutingReorder={handleRoutingReorder}
                    />
                );
            case 'appearance':
                return <AppearanceTab settings={settings} onUpdateSettings={updateSettings} />;
            case 'performance':
                return <PerformanceTab settings={settings} onUpdateSettings={updateSettings} />;
            case 'resilience':
                return <ResilienceTab settings={settings} onUpdateSettings={updateSettings} />;
            case 'content-safety':
                return <ContentSafetyTab settings={settings} onUpdateSettings={updateSettings} />;
            case 'usage-costs':
                return <UsageCostsTab />;
            case 'prompts':
                return <PromptEngineeringPage settings={settings} onUpdateSettings={updateSettings} />;
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
                        onClick={() => { setActiveTab('resilience'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'resilience' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
                    >
                        <Network className="w-5 h-5" />
                        Queue Resilience
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
                    <button
                        onClick={() => { setActiveTab('usage-costs'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center justify-center gap-2 mb-4 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'usage-costs' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/30' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}
                    >
                        <span className="text-lg">📊</span>
                        <span>Usage & Costs</span>
                    </button>

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
            <div className="flex-1 overflow-y-auto bg-gray-900/30 p-4 md:p-8 pt-16 md:pt-8 min-h-0">
                {renderContent()}
            </div>
        </div>
    );
};
