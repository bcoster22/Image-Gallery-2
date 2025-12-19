/**
 * God Tier SDXL Presets for 2025
 * Optimized for 3070 Ti (8GB VRAM)
 */

export interface GodTierPreset {
    name: string;
    category: 'Photorealism' | 'Efficiency' | 'Structural' | 'Artistic' | 'Specialist';
    tier: string;
    best_for: string;
    description: string;
    model: string;
    sampler: string;
    scheduler: string;
    steps: number;
    cfg: number;
    use_case: string[];
    vram: string;
    speed: 'Lightning' | 'Fast' | 'Medium' | 'Slow' | 'Very Slow';
}

export const GOD_TIER_PRESETS: Record<string, GodTierPreset> = {
    // ============================================================
    // CATEGORY A: PHOTOREALISM (Best for Humans/Photos)
    // ============================================================
    "standard_realism": {
        name: "2025 Standard",
        category: "Photorealism",
        tier: "🥇 God Tier",
        best_for: "General photorealism - safest bet for consistent quality",
        description: "Perfect balance with Karras structure and SDE noise for skin texture",
        model: "juggernaut-xl",
        sampler: "dpmpp_2m_sde_gpu",
        scheduler: "karras",
        steps: 35,
        cfg: 5.0,
        use_case: ["portrait", "people", "realistic", "photo"],
        vram: "~6GB",
        speed: "Medium"
    },

    "velvet_skin": {
        name: "Velvet Skin",
        category: "Photorealism",
        tier: "🥇 God Tier",
        best_for: "Close-up female portraits, beauty shots, fashion",
        description: "Beta scheduler removes crunchy sharpening -naturally soft skin",
        model: "cyberrealistic-xl",
        sampler: "dpmpp_2m_sde_gpu",
        scheduler: "beta",
        steps: 40,
        cfg: 4.5,
        use_case: ["portrait", "beauty", "closeup", "skin", "fashion"],
        vram: "~6.5GB",
        speed: "Slow"
    },

    "cinema_dark": {
        name: "Cinema",
        category: "Photorealism",
        tier: "🥇 God Tier",
        best_for: "Night shots, neon lighting, dramatic shadows",
        description: "Exponential curve resolves deep blacks without grey mush",
        model: "nightvision-xl",
        sampler: "dpmpp_2m_sde_gpu",
        scheduler: "exponential",
        steps: 40,
        cfg: 5.5,
        use_case: ["night", "dark", "moody", "neon", "dramatic", "shadow"],
        vram: "~6.5GB",
        speed: "Slow"
    },

    // ============================================================
    // CATEGORY B: EFFICIENCY (Speed & Tech)
    // ============================================================
    "smart_step_ays": {
        name: "Smart Step (AYS)",
        category: "Efficiency",
        tier: "⚡ Fast",
        best_for: "High quality in half the time",
        description: "Align Your Steps tech - 30-step quality in 12-15 steps",
        model: "juggernaut-xl",
        sampler: "dpmpp_2m",
        scheduler: "align_your_steps",
        steps: 15,
        cfg: 6.0,
        use_case: ["fast", "quick", "efficient", "speed"],
        vram: "~5GB",
        speed: "Fast"
    },

    "turbo_snap": {
        name: "Turbo Snap",
        category: "Efficiency",
        tier: "⚡ Lightning",
        best_for: "Rapid prototyping, testing prompts",
        description: "Lightning model - full image in under 2 seconds on 3070 Ti",
        model: "juggernaut-xl",
        sampler: "dpmpp_sde_gpu",
        scheduler: "sgm_uniform",
        steps: 8,
        cfg: 2.0,
        use_case: ["test", "preview", "rapid", "draft"],
        vram: "~4GB",
        speed: "Lightning"
    },

    // ============================================================
    // CATEGORY C: STYLIZED & STRUCTURAL
    // ============================================================
    "digital_crisp": {
        name: "Digital Crisp",
        category: "Structural",
        tier: "🏗️ Precision",
        best_for: "Buildings, cars, product design, hard surfaces",
        description: "No SDE = mathematically perfect lines like 3D renders",
        model: "realvisxl-v5",
        sampler: "dpmpp_2m",
        scheduler: "karras",
        steps: 30,
        cfg: 7.0,
        use_case: ["architecture", "product", "building", "car", "design"],
        vram: "~5.5GB",
        speed: "Medium"
    },

    "creative_chaos": {
        name: "Creative Chaos",
        category: "Artistic",
        tier: "🎨 Artistic",
        best_for: "Oil paintings, concept art, messy backgrounds",
        description: "Ancestral sampler adds noise for painterly strokes",
        model: "dreamshaper-xl",
        sampler: "euler_ancestral",
        scheduler: "normal",
        steps: 30,
        cfg: 6.0,
        use_case: ["art", "painting", "artistic", "creative", "concept"],
        vram: "~5.5GB",
        speed: "Medium"
    },

    "flux_mimic": {
        name: "The Grounded",
        category: "Structural",
        tier: "🏗️ Dense",
        best_for: "Dense, heavy realism - solid feel",
        description: "Imitates Flux models - slow and steady for high coherence",
        model: "realvisxl-v5",
        sampler: "euler",
        scheduler: "simple",
        steps: 50,
        cfg: 4.0,
        use_case: ["realistic", "solid", "coherent", "dense"],
        vram: "~7GB",
        speed: "Very Slow"
    },

    // ============================================================
    // CATEGORY D: SPECIALIST
    // ============================================================
    "detail_beast": {
        name: "Detail Beast",
        category: "Specialist",
        tier: "🔬 Macro",
        best_for: "Extreme close-ups (eyes, bugs, jewelry)",
        description: "3M solver resolves finer details than 2M",
        model: "cyberrealistic-xl",
        sampler: "dpmpp_3m_sde_gpu",
        scheduler: "karras",
        steps: 50,
        cfg: 5.0,
        use_case: ["macro", "closeup", "detail", "texture", "eye"],
        vram: "~7.5GB",
        speed: "Very Slow"
    },

    "resurrector": {
        name: "The Resurrector",
        category: "Specialist",
        tier: "🔧 Fix",
        best_for: "Difficult yoga poses, multiple people, hands",
        description: "Restart sampler error-checks itself to fix anatomy",
        model: "juggernaut-xl",
        sampler: "restart",
        scheduler: "karras",
        steps: 40,
        cfg: 5.0,
        use_case: ["hands", "pose", "anatomy", "people", "complex"],
        vram: "~7GB",
        speed: "Slow"
    }
};

export function getPreset(presetId: string): GodTierPreset | undefined {
    return GOD_TIER_PRESETS[presetId];
}

export function getPresetsByCategory(category?: string): Record<string, GodTierPreset> {
    if (!category) {
        return GOD_TIER_PRESETS;
    }

    const filtered: Record<string, GodTierPreset> = {};
    for (const [id, preset] of Object.entries(GOD_TIER_PRESETS)) {
        if (preset.category === category) {
            filtered[id] = preset;
        }
    }
    return filtered;
}

export function recommendPresetForPrompt(prompt: string): string {
    const promptLower = prompt.toLowerCase();
    let bestMatch = "standard_realism";
    let bestScore = 0;

    for (const [presetId, preset] of Object.entries(GOD_TIER_PRESETS)) {
        let score = 0;
        for (const keyword of preset.use_case) {
            if (promptLower.includes(keyword)) {
                score += 1;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = presetId;
        }
    }

    return bestMatch;
}

export const PRESET_CATEGORIES = [
    "Photorealism",
    "Efficiency",
    "Structural",
    "Artistic",
    "Specialist"
] as const;
