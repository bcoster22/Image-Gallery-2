import { useState, useEffect } from 'react';
import { AdminSettings, User, AppSettings, AiProvider, ImageInfo } from '../types';
import { NegativePrompt } from '../utils/idb'; // Fix Import
import { DEFAULT_NEGATIVE_PROMPTS } from '../constants/prompts';
import { initDB, getImages, getNegativePrompts, saveNegativePrompt } from '../utils/idb';

const SETTINGS_STORAGE_KEY = 'ai_gallery_settings_v2';
const OLD_SETTINGS_STORAGE_KEY = 'ai_gallery_settings';
const USER_STORAGE_KEY = 'ai_gallery_user';

interface UseAppInitializationProps {
    addNotification: (notification: any) => void;
}

export const useAppInitialization = ({ addNotification }: UseAppInitializationProps) => {
    const [settings, setSettings] = useState<AdminSettings | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [images, setImages] = useState<ImageInfo[]>([]);
    const [negativePromptHistory, setNegativePromptHistory] = useState<NegativePrompt[]>([]);
    const [isDbLoading, setIsDbLoading] = useState(true);

    useEffect(() => {
        // 1. Load Settings
        const storedSettingsV2 = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (storedSettingsV2) {
            try {
                setSettings(JSON.parse(storedSettingsV2));
            } catch (e) { console.error("Failed to parse V2 settings", e); }
        } else {
            const oldSettingsRaw = localStorage.getItem(OLD_SETTINGS_STORAGE_KEY);
            if (oldSettingsRaw) {
                try {
                    const oldSettings: AppSettings = JSON.parse(oldSettingsRaw);
                    let migratedProvider: AiProvider = 'gemini';
                    if (oldSettings.provider === 'moondream') {
                        migratedProvider = oldSettings.moondreamApiKey ? 'moondream_cloud' : 'moondream_local';
                    } else if (['gemini', 'openai', 'grok', 'comfyui'].includes(oldSettings.provider)) {
                        migratedProvider = oldSettings.provider as AiProvider;
                    }

                    const newSettings: AdminSettings = {
                        providers: {
                            gemini: { apiKey: oldSettings.geminiApiKey, generationModel: oldSettings.geminiGenerationModel, veoModel: oldSettings.geminiVeoModel, safetySettings: oldSettings.geminiSafetySettings },
                            grok: { apiKey: oldSettings.grokApiKey, generationModel: oldSettings.grokGenerationModel },
                            moondream_cloud: { apiKey: oldSettings.moondreamApiKey },
                            moondream_local: { endpoint: oldSettings.moondreamEndpoint, model: 'moondream-2', captionModel: 'joycaption-alpha-2', taggingModel: 'wd14-vit-v2' },
                            openai: { apiKey: oldSettings.openaiApiKey, generationModel: oldSettings.openaiGenerationModel, textGenerationModel: 'gpt-4-turbo', organizationId: '', projectId: '' },
                            comfyui: { mode: 'local', endpoint: 'http://127.0.0.1:8188', apiKey: '' },
                        },
                        routing: {
                            vision: [migratedProvider], generation: [migratedProvider], animation: [migratedProvider],
                            editing: [migratedProvider], textGeneration: [migratedProvider], captioning: [migratedProvider], tagging: [migratedProvider],
                        },
                        performance: { downscaleImages: true, maxAnalysisDimension: 1024, vramUsage: 'balanced' },
                        prompts: { assignments: {}, strategies: [] },
                        contentSafety: { enabled: true, autoClassify: true, threshold: 80, nsfwKeyword: "NSFW", sfwKeyword: "SFW", blurNsfw: true, showConfidence: false, useSingleModelSession: true },
                        appearance: { thumbnailSize: 40, thumbnailHoverScale: 1.2 }
                    };
                    setSettings(newSettings);
                    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
                    localStorage.removeItem(OLD_SETTINGS_STORAGE_KEY);
                    addNotification({ status: 'success', message: 'Settings have been updated to the new V2 format.' });
                } catch (e) {
                    console.error("Failed to migrate old settings", e);
                }
            }
        }

        // 2. Load User
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user from localStorage", e);
            }
        }

        // 3. Load DB Data
        const loadDbData = async () => {
            try {
                setIsDbLoading(true);
                await initDB();
                const loadedImages = await getImages();
                setImages(loadedImages);

                const loadedPrompts = await getNegativePrompts();
                if (loadedPrompts.length === 0) {
                    for (const prompt of DEFAULT_NEGATIVE_PROMPTS) {
                        await saveNegativePrompt(prompt);
                    }
                    const reloaded = await getNegativePrompts();
                    setNegativePromptHistory(reloaded);
                } else {
                    setNegativePromptHistory(loadedPrompts);
                }
            } catch (e) {
                console.error("Failed to load data from IndexedDB", e);
                addNotification({ status: 'error', message: 'Could not load your saved gallery data.' });
            } finally {
                setIsDbLoading(false);
            }
        };
        loadDbData();
    }, [addNotification]);

    return {
        settings,
        setSettings,
        currentUser,
        setCurrentUser,
        images,
        setImages,
        negativePromptHistory,
        setNegativePromptHistory,
        isDbLoading
    };
};
