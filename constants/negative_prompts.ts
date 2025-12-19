/**
 * Professional SDXL Negative Prompt Templates (2025)
 * Optimized for realistic image generation
 */

export interface NegativePromptTemplate {
    id: string;
    name: string;
    category: 'Photorealism' | 'Portraits' | 'Quality' | 'Creative' | 'Architecture';
    description: string;
    prompt: string;
    recommended_for: string[];
}

export const SDXL_NEGATIVE_TEMPLATES: Record<string, NegativePromptTemplate> = {
    "universal_quality": {
        id: "universal_quality",
        name: "Universal Quality",
        category: "Quality",
        description: "Best all-around negative prompt for SDXL realism",
        prompt: "(worst quality, low quality, normal quality:1.4), lowres, bad anatomy, bad hands, jpeg artifacts, blurry, cropped, watermark, signature, username, text, error",
        recommended_for: ["juggernaut-xl", "realvisxl-v5", "albedobase-xl"]
    },

    "ultra_realism": {
        id: "ultra_realism",
        name: "Ultra Photorealism",
        category: "Photorealism",
        description: "Maximum photorealism - removes ALL artificial elements",
        prompt: "drawing, painting, illustration, anime, cartoon, graphic, text, crayon, graphite, abstract, glitch, deformed, mutated, ugly, disfigured, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck, low quality, normal quality, lowres, low details, cropped, jpeg artifacts, signature, watermark, username, blurry, 3d, cgi, render",
        recommended_for: ["realvisxl-v5", "cyberrealistic-xl"]
    },

    "portrait_perfection": {
        id: "portrait_perfection",
        name: "Portrait Perfection",
        category: "Portraits",
        description: "Fixes common portrait issues - hands, faces, skin",
        prompt: "(bad hands, missing fingers, extra fingers, fused fingers, long fingers:1.3), (deformed iris, deformed pupils:1.2), (bad eyes, dead eyes, lazy eye:1.2), (asymmetric eyes:1.1), (worst quality, low quality:1.4), (bad teeth, crooked teeth:1.2), makeup, lipstick, tattoo, (ugly, disfigured:1.2), oversaturated, grain, jpeg artifacts, signature, watermark",
        recommended_for: ["cyberrealistic-xl", "proteus-xl"]
    },

    "skin_texture_pro": {
        id: "skin_texture_pro",
        name: "Skin Texture Pro",
        category: "Portraits",
        description: "For pore-level detail without artifacts",
        prompt: "(smooth skin, plastic skin, barbie doll, mannequin:1.3), (oversaturated, excessive makeup:1.2), (blur, soft focus:1.2), (orange skin, fake tan:1.1), low quality, normal quality, lowres, jpeg artifacts, painting, illustration, 3d, cgi",
        recommended_for: ["cyberrealistic-xl"]
    },

    "cinematic_quality": {
        id: "cinematic_quality",
        name: "Cinematic Quality",
        category: "Photorealism",
        description: "For movie-quality dramatic shots",
        prompt: "(bad composition:1.3), (poor lighting:1.2), low quality, normal quality, lowres, jpeg artifacts, blurry, out of focus, motion blur, grain, noise, overexposed, underexposed, high contrast, cartoon, anime, drawing, painting, illustration, 3d render, amateur photography",
        recommended_for: ["juggernaut-xl", "nightvision-xl"]
    },

    "clean_minimal": {
        id: "clean_minimal",
        name: "Clean & Minimal",
        category: "Quality",
        description: "Minimal negative prompt - let the model shine",
        prompt: "low quality, worst quality, blurry, watermark",
        recommended_for: ["all models"]
    },

    "architecture_clean": {
        id: "architecture_clean",
        name: "Architecture Clean",
        category: "Architecture",
        description: "Clean lines, no distortion for buildings",
        prompt: "(distorted lines, warped perspective, curved lines:1.3), (blurry, soft focus:1.2), people, humans, cars, vehicles, watermark, signature, text, low quality, normal quality, jpeg artifacts, grain, noise, overexposed",
        recommended_for: ["realvisxl-v5", "albedobase-xl"]
    },

    "creative_artistic": {
        id: "creative_artistic",
        name: "Creative Artistic",
        category: "Creative",
        description: "For artistic/fantasy styles - less restrictive",
        prompt: "(worst quality, low quality:1.2), blurry, jpeg artifacts, watermark, signature, username, text",
        recommended_for: ["dreamshaper-xl", "animagine-xl"]
    },

    "night_photography": {
        id: "night_photography",
        name: "Night Photography",
        category: "Photorealism",
        description: "Preserves blacks, removes noise in dark scenes",
        prompt: "(gray blacks, washed out blacks:1.3), (noise, grain, high iso:1.2), (overexposed:1.3), low quality, normal quality, lowres, jpeg artifacts, blur, daytime, bright, cartoon, painting, illustration",
        recommended_for: ["nightvision-xl"]
    },

    "maximum_detail": {
        id: "maximum_detail",
        name: "Maximum Detail",
        category: "Quality",
        description: "Extreme detail preservation - use with high step counts",
        prompt: "(blurry, soft focus, out of focus:1.4), (low resolution, low detail, pixelated:1.3), (jpeg artifacts, compression:1.2), (worst quality, low quality, normal quality:1.4), watermark, signature, username, text, simple background, plain, basic, amateur, snapshot",
        recommended_for: ["all high-step presets"]
    }
};

export const DEFAULT_NEGATIVE_PROMPT = SDXL_NEGATIVE_TEMPLATES.universal_quality.prompt;

export function getNegativeTemplate(id: string): NegativePromptTemplate | undefined {
    return SDXL_NEGATIVE_TEMPLATES[id];
}

export function getNegativeTemplatesByCategory(category?: string): NegativePromptTemplate[] {
    const templates = Object.values(SDXL_NEGATIVE_TEMPLATES);
    if (!category) return templates;
    return templates.filter(t => t.category === category);
}

export function recommendNegativePrompt(modelId: string): string {
    // Find templates recommended for this model
    const templates = Object.values(SDXL_NEGATIVE_TEMPLATES);
    const match = templates.find(t =>
        t.recommended_for.includes(modelId) || t.recommended_for.includes("all models")
    );
    return match ? match.prompt : DEFAULT_NEGATIVE_PROMPT;
}

export const NEGATIVE_CATEGORIES = [
    "Quality",
    "Photorealism",
    "Portraits",
    "Architecture",
    "Creative"
] as const;
