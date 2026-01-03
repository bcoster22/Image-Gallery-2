import { ImageInfo, AdminSettings, ImageAnalysisResult, ProviderCapabilities } from "../../../types";
import { BaseProvider } from "../../baseProvider";
import { executeStrategy } from "../../promptStrategy";
import { callMoondreamApi, normalizeEndpoint, getImageRating } from "./api";
import { DEFAULT_MOONDREAM_MODELS } from "./types";

export class MoondreamLocalProvider extends BaseProvider {
    readonly id = 'moondream_local';
    readonly name = 'Moondream Local';
    readonly capabilities: ProviderCapabilities = {
        vision: true,
        generation: true,
        animation: false,
        editing: true,
        textGeneration: false,
        captioning: true,
        tagging: true
    };

    validateConfig(settings: AdminSettings): boolean {
        return !!settings.providers.moondream_local.endpoint;
    }

    async getModels(settings: AdminSettings): Promise<{ id: string; name: string; type?: string }[]> {
        const providerConfig = settings?.providers?.moondream_local || {};
        const { endpoint } = providerConfig as any;
        let usedEndpoint = endpoint || 'http://127.0.0.1:2020/v1';
        if (usedEndpoint.includes('localhost')) usedEndpoint = usedEndpoint.replace('localhost', '127.0.0.1');
        const baseUrl = normalizeEndpoint(usedEndpoint);

        try {
            const response = await fetch(`${baseUrl}/v1/models`);
            if (!response.ok) throw new Error("Failed to fetch models");
            const data = await response.json();

            const modelsList = data.data || data.models;
            if (modelsList && Array.isArray(modelsList) && modelsList.length > 0) {
                return modelsList.map((m: any) => {
                    let type = m.type;

                    if (!type) {
                        const id = (m.id || '').toLowerCase();
                        if (id.includes('sdxl') || id.includes('diffusion') || id.includes('flux')) {
                            type = 'generation';
                        } else if (id.includes('moondream') || id.includes('llava')) {
                            type = 'vision';
                        } else if (id.includes('caption')) {
                            type = 'captioning';
                        } else if (id.includes('wd14') || id.includes('tagger')) {
                            type = 'tagging';
                        }
                    }

                    return {
                        id: m.id,
                        name: m.name || m.id,
                        type: type
                    };
                });
            }
            console.warn("[MoondreamLocal] Empty model list returned, falling back to defaults.");
            return DEFAULT_MOONDREAM_MODELS;
        } catch (e) {
            console.warn("[MoondreamLocal] Failed to list models, using defaults:", e);
            return DEFAULT_MOONDREAM_MODELS;
        }
    }

    async testConnection(settings: AdminSettings): Promise<void> {
        const endpoint = settings.providers.moondream_local.endpoint;
        if (!endpoint) throw new Error("Endpoint is missing.");

        // Fix localhost resolution to ensure IPv4 127.0.0.1 matches backend listener
        let usedEndpoint = endpoint;
        if (usedEndpoint.includes('localhost')) { usedEndpoint = usedEndpoint.replace('localhost', '127.0.0.1'); }

        try {
            const baseUrl = normalizeEndpoint(usedEndpoint);
            const response = await fetch(`${baseUrl}/health`);
            if (response.ok) return;
            throw new Error(`Server reachable but returned unexpected status: ${response.status}`);
        } catch (error: any) {
            throw new Error(error.message || "Failed to connect to Moondream Local server.");
        }
    }

    async testCapability(capability: any, settings: AdminSettings): Promise<void> {
        await this.testConnection(settings);
        // Optional: Check if a model is available for this capability
        if (capability === 'vision' || capability === 'generation' || capability === 'captioning') {
            const models = await this.getModels(settings);
            const hasModel = models.some(m => m.type === capability || (capability === 'vision' && m.type === 'captioning')); // loose mapping
            // Not enforcing strictly to avoid false negatives if types are ambiguous
        }
    }

    async captionImage(image: ImageInfo, settings: AdminSettings): Promise<string> {
        const config = settings.providers.moondream_local;
        const modelOverride = config.captionModel;

        let effectiveSettings = settings;
        if (modelOverride) {
            effectiveSettings = {
                ...settings,
                providers: {
                    ...settings.providers,
                    moondream_local: {
                        ...config,
                        model: modelOverride
                    }
                }
            };
        }

        const result = await this.analyzeImage(image, effectiveSettings);
        return result.recreationPrompt;
    }

    async tagImage(image: ImageInfo, settings: AdminSettings): Promise<string[]> {
        const config = settings.providers.moondream_local;
        const modelOverride = config.taggingModel;

        let effectiveSettings = settings;
        if (modelOverride) {
            effectiveSettings = {
                ...settings,
                providers: {
                    ...settings.providers,
                    moondream_local: {
                        ...config,
                        model: modelOverride
                    }
                }
            };
        }

        const modelName = (modelOverride || config.model || '').toLowerCase();
        const isWd14 = modelName.includes('wd14') || modelName.includes('tagger') || modelName.includes('vit');

        if (isWd14) {
            const providerConfig = effectiveSettings.providers.moondream_local;
            let usedEndpoint = providerConfig.endpoint || 'http://127.0.0.1:2020/v1';
            if (usedEndpoint.includes('localhost')) { usedEndpoint = usedEndpoint.replace('localhost', '127.0.0.1'); }
            const baseUrl = normalizeEndpoint(usedEndpoint);

            const apiUrl = `${baseUrl}/v1/classify`;
            const body = {
                model: modelOverride || "wd14-vit-v2",
                image_url: image.dataUrl
            };

            const vramMode = settings.performance?.vramUsage || 'balanced';

            let text = "";
            try {
                const result = await callMoondreamApi(apiUrl, "", body, false, 120, vramMode);
                text = result.text;
            } catch (err) {
                if ((modelOverride === "wd-vit-tagger-v3" || !modelOverride) && err instanceof Error) {
                    console.warn("[WD14] V3 failed, attempting fallback to wd14-vit-v2...");
                    body.model = "wd14-vit-v2";
                    const result = await callMoondreamApi(apiUrl, "", body, false, 120, vramMode);
                    text = result.text;
                } else {
                    throw err;
                }
            }

            let tags: string[] = [];
            let scores: Record<string, number> | null = null;
            let imageRating = 'PG';

            try {
                const json = JSON.parse(text);

                if (json.scores) {
                    scores = json.scores;
                    const TAG_THRESHOLD = 0.35;
                    tags = Object.entries(json.scores)
                        .filter(([tag, score]) => {
                            if (['general', 'sensitive', 'questionable', 'explicit'].includes(tag)) return false;
                            return (score as number) >= TAG_THRESHOLD;
                        })
                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                        .map(([tag]) => tag.replace(/_/g, ' '));

                } else if (json.predictions && Array.isArray(json.predictions)) {
                    scores = {};
                    json.predictions.forEach((p: any) => {
                        if (p.label && typeof p.score === 'number') scores![p.label] = p.score;
                    });

                    const TAG_THRESHOLD = 0.35;
                    tags = json.predictions
                        .filter((p: any) => p.score >= TAG_THRESHOLD)
                        .map((p: any) => p.label.replace(/_/g, ' '));
                } else if (Array.isArray(json)) {
                    tags = json;
                } else {
                    tags = [];
                }
            } catch (e) {
                tags = text.split(',').map(t => t.trim()).filter(t => t.length > 0 && t.toLowerCase() !== 'unknown');
            }

            if (scores) {
                imageRating = getImageRating(scores);
                const sensitive = scores.sensitive || 0;
                const questionable = scores.questionable || 0;

                const nsfwSum = (scores.explicit || 0) + (scores.questionable || 0) + (scores.sensitive || 0);
                const isSuspicious = nsfwSum > 0.2;
                const isAmbiguous = Math.abs(sensitive - questionable) < 0.15;

                if (imageRating === 'R' || imageRating === 'X' || isAmbiguous || isSuspicious) {
                    try {
                        const handoffBody = {
                            model: "moondream-3-preview-4bit",
                            messages: [{
                                role: "user",
                                content: [
                                    { type: "text", text: "Rate this image as PG, PG-13, R, or X based on movie standards. Focus on whether the nudity is artistic or pornographic. Answer with just the rating." },
                                    { type: "image_url", image_url: { url: image.dataUrl } }
                                ]
                            }],
                            max_tokens: 10
                        };

                        const { text: mdAnswer } = await callMoondreamApi(apiUrl, "", handoffBody, false, 60, vramMode);
                        const mdRating = mdAnswer.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');

                        if (['PG', 'PG-13', 'R', 'X', 'XXX'].includes(mdRating)) {
                            imageRating = mdRating;
                        }
                    } catch (err) {
                        console.warn("[Truth Committee] Failed to consult Moondream:", err);
                    }
                }

                tags.push(`rating:${imageRating}`);
                if (scores.explicit) tags.push(`score:explicit:${scores.explicit.toFixed(2)}`);
            }

            return tags;
        }

        const result = await this.analyzeImage(image, effectiveSettings);
        return result.keywords;
    }

    async batchTagImages(images: ImageInfo[], settings: AdminSettings): Promise<{ tags: string[], imageId: string }[]> {
        const config = settings.providers.moondream_local;
        const modelOverride = config.taggingModel || "wd-vit-tagger-v3";

        if (!modelOverride.includes('wd14') && !modelOverride.includes('tagger') && !modelOverride.includes('vit')) {
            throw new Error("Batch tagging is only supported for WD14 models.");
        }

        const endpoint = config.endpoint || 'http://127.0.0.1:2020/v1';
        const baseUrl = normalizeEndpoint(endpoint.includes('localhost') ? endpoint.replace('localhost', '127.0.0.1') : endpoint);
        const apiUrl = `${baseUrl}/v1/vision/batch-caption`;

        const body = {
            model: modelOverride,
            images: images.map(img => img.dataUrl.split(',')[1])
        };

        try {
            const result = await callMoondreamApi(apiUrl, "", body, false, 120, settings.performance?.vramUsage || 'balanced');
            const json = JSON.parse(result.text);
            if (!json.captions || !Array.isArray(json.captions)) {
                throw new Error("Invalid batch response format");
            }

            return json.captions.map((c: any, idx: number) => {
                const rawTags = c.text || "";
                const tags = rawTags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0 && t !== 'LABEL 0' && t !== 'unknown');
                return {
                    imageId: images[idx].id,
                    tags: tags
                };
            });

        } catch (err: any) {
            throw err;
        }
    }

    async analyzeImage(
        image: ImageInfo,
        settings: AdminSettings,
        onStatus?: (message: string) => void
    ): Promise<ImageAnalysisResult> {
        const providerConfig = settings?.providers?.moondream_local || {};
        const { endpoint, model, taggingModel } = providerConfig as any;
        let usedEndpoint = endpoint || 'http://127.0.0.1:2020/v1';
        if (usedEndpoint.includes('localhost')) { usedEndpoint = usedEndpoint.replace('localhost', '127.0.0.1'); }
        const baseUrl = normalizeEndpoint(usedEndpoint);

        if (model === 'nsfw-detector') {
            if (onStatus) onStatus("Checking for NSFW content...");
            const classifyUrl = `${baseUrl}/v1/classify`;
            const body = { image_url: image.dataUrl, model: 'nsfw-detector' };
            const vramMode = settings.performance?.vramUsage || 'balanced';
            const { text: responseText, stats } = await callMoondreamApi(classifyUrl, "", body, false, 120, vramMode);

            try {
                const result = JSON.parse(responseText);
                const label = result.label || "Unknown";
                const score = result.score !== undefined ? (result.score * 100).toFixed(1) + '%' : "N/A";
                const predictions = result.predictions || [];
                const description = `NSFW Classification: ${label} (${score} confidence).`;
                const keywords = predictions.map((p: any) => `${p.label} (${(p.score * 100).toFixed(0)}%)`);

                return {
                    recreationPrompt: description,
                    keywords: keywords,
                    stats: result._stats ? {
                        tokensPerSec: result._stats.tokens_per_sec,
                        device: result._stats.device || 'Unknown',
                        totalTokens: result._stats.tokens,
                        duration: result._stats.duration
                    } : stats
                };
            } catch (e) {
                return { recreationPrompt: "Failed to parse NSFW classification result.", keywords: [], stats };
            }
        }

        const apiUrl = `${baseUrl}/v1/chat/completions`;
        const assignedStrategyId = settings.prompts.assignments?.['moondream_local'];
        const strategy = settings.prompts.strategies.find(s => s.id === assignedStrategyId) || settings.prompts.strategies[0];

        let result: ImageAnalysisResult;

        if (strategy) {
            result = await executeStrategy(
                strategy,
                image,
                async (prompt) => {
                    const body = {
                        model: (!model || model.startsWith('sdxl-')) ? "moondream-2" : model,
                        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image.dataUrl } }] }],
                        stream: false,
                        max_tokens: 1024
                    };
                    const vramMode = settings.performance?.vramUsage || 'balanced';
                    return await callMoondreamApi(apiUrl, "", body, false, 120, vramMode);
                },
                onStatus
            );
        } else {
            const prompt = "Describe this image.";
            const body = {
                model: (!model || model.startsWith('sdxl-')) ? "moondream-2" : model,
                messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image.dataUrl } }] }],
                stream: false,
                max_tokens: 1024
            };

            const vramMode = settings.performance?.vramUsage || 'balanced';
            const { text: responseText, stats } = await callMoondreamApi(apiUrl, "", body, false, 120, vramMode);
            result = { recreationPrompt: responseText, keywords: [], stats };
        }

        if (taggingModel && taggingModel !== model) {
            try {
                const tags = await this.tagImage(image, settings);
                result.keywords = [...(result.keywords || []), ...tags];
            } catch (error) {
                try {
                    const fallbackBody = {
                        model: "moondream-2",
                        messages: [{
                            role: "user",
                            content: [
                                { type: "text", text: "List 10 key descriptive tags for this image, comma separated. Do not use sentences." },
                                { type: "image_url", image_url: { url: image.dataUrl } }
                            ]
                        }],
                        max_tokens: 100
                    };
                    const { text } = await callMoondreamApi(apiUrl, "", fallbackBody, false, 60, "balanced");
                    const fallbackTags = text.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
                    result.keywords = [...(result.keywords || []), ...fallbackTags];
                } catch (e) {
                    console.warn('[analyzeImage] Tagging fallback also failed.');
                }
            }
        }

        return result;
    }

    async detectSubject(
        image: ImageInfo,
        settings: AdminSettings
    ): Promise<{ x: number, y: number }> {
        const box = await this.detectObject(image, 'main subject', settings);
        if (box) {
            const centerX = ((box.xmin + box.xmax) / 2) * 100;
            const centerY = ((box.ymin + box.ymax) / 2) * 100;
            return { x: Math.round(centerX), y: Math.round(centerY) };
        }
        return { x: 50, y: 50 };
    }

    async detectObject(
        image: ImageInfo,
        objectName: string,
        settings: AdminSettings
    ): Promise<{ ymin: number; xmin: number; ymax: number; xmax: number } | null> {
        const providerConfig = settings?.providers?.moondream_local || {};
        const { endpoint, model } = providerConfig as any;
        let usedEndpoint = endpoint || 'http://127.0.0.1:2020/v1';
        if (usedEndpoint.includes('localhost')) { usedEndpoint = usedEndpoint.replace('localhost', '127.0.0.1'); }
        const baseUrl = normalizeEndpoint(usedEndpoint);
        const apiUrl = `${baseUrl}/v1/chat/completions`;

        const prompt = `Detect ${objectName}. Return the bounding box coordinates as a JSON object: {"ymin": 0.0, "xmin": 0.0, "ymax": 1.0, "xmax": 1.0}.`;

        const body = {
            model: (!model || model.startsWith('sdxl-')) ? "moondream-2" : model,
            messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image.dataUrl } }] }],
            stream: false,
            max_tokens: 256,
            response_format: { type: "json_object" }
        };

        try {
            const vramMode = settings.performance?.vramUsage || 'balanced';
            const { text: responseText } = await callMoondreamApi(apiUrl, "", body, false, 120, vramMode);

            let bbox = null;
            try {
                const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                bbox = JSON.parse(cleanText);
            } catch (e) {
                console.warn(`Failed to parse JSON for detectObject('${objectName}').`);
            }

            if (bbox && typeof bbox.ymin === 'number') {
                return {
                    ymin: bbox.ymin,
                    xmin: bbox.xmin,
                    ymax: bbox.ymax,
                    xmax: bbox.xmax
                };
            }
            return null;
        } catch (e) {
            return null;
        }
    }
    async generateImageFromPrompt(
        prompt: string,
        settings: AdminSettings,
        aspectRatio: any,
        sourceImage?: ImageInfo,
        overrides?: any
    ): Promise<any> {
        const config = settings.providers.moondream_local;
        let usedEndpoint = config.endpoint || 'http://127.0.0.1:2020/v1';
        if (usedEndpoint.includes('localhost')) { usedEndpoint = usedEndpoint.replace('localhost', '127.0.0.1'); }
        const baseUrl = normalizeEndpoint(usedEndpoint);
        const apiUrl = `${baseUrl}/v1/images/generations`;

        // Calculate dims from aspect ratio or use defaults
        // Simple mapping for now
        let width = 1024;
        let height = 1024;
        if (aspectRatio) {
            // If aspect ratio is a string "16:9", etc.
            // This is a simplified logic, ideally use a helper
            if (aspectRatio === "16:9") { width = 1216; height = 832; }
            else if (aspectRatio === "9:16") { width = 832; height = 1216; }
            else if (aspectRatio === "21:9") { width = 1536; height = 640; }
        }

        const body: any = {
            prompt: prompt,
            model: overrides?.model || config.model || "sdxl-realism",
            width: overrides?.width || width,
            height: overrides?.height || height,
            steps: overrides?.steps || 30,
            scheduler: overrides?.scheduler || "euler",
            strength: overrides?.strength || 0.75
        };

        if (sourceImage) {
            body.image = sourceImage.dataUrl.split(',')[1]; // Remove data:image/...;base64,
        }

        const vramMode = settings.performance?.vramUsage || 'balanced';

        try {
            const result = await callMoondreamApi(apiUrl, "", body, false, 240, vramMode);
            const json = JSON.parse(result.text);

            if (json.data && json.data.length > 0) {
                return {
                    image: json.data[0].b64_json || json.data[0].url,
                    stats: result.stats
                };
            }
            throw new Error("No image data returned from backend");
        } catch (e: any) {
            console.error("Local Generation Failed:", e);
            throw e;
        }
    }

    async editImage(
        image: ImageInfo,
        prompt: string,
        settings: AdminSettings,
        strength?: number
    ): Promise<any> {
        // Edit is just Generation with a source image and strength
        // We reuse the same endpoint
        return this.generateImageFromPrompt(prompt, settings, undefined, image, { strength: strength ?? 0.6 });
    }
}
