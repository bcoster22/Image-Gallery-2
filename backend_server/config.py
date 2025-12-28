
# Comprehensive SDXL Model Database with Metadata
SDXL_MODELS = {
    "juggernaut-xl": {
        "hf_id": "RunDiffusion/Juggernaut-XL-Lightning",
        "name": "Juggernaut XL",
        "tier": "gold",
        "best_for": "Cinematic lighting and composition",
        "description": "The most intelligent model for complex scenes. Creates high-budget movie still quality with perfect anatomy.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [4.5, 6.5],
        "keywords": ["cinematic", "movie", "dramatic", "composition", "scene", "lighting", "professional"]
    },
    "realvisxl-v5": {
        "hf_id": "SG161222/RealVisXL_V5.0",
        "name": "RealVisXL V5",
        "tier": "gold",
        "best_for": "Raw photography and imperfect realism",
        "description": "DSLR/smartphone quality with natural imperfections. Messy hair, skin texture, less idealized lighting.",
        "scheduler": "dpm_pp_2m_sde_karras",
        "optimal_steps": 35,
        "cfg_range": [4.0, 6.0],
        "keywords": ["photo", "photography", "raw", "candid", "natural", "realistic", "camera", "lens"]
    },
    "cyberrealistic-xl": {
        "hf_id": "cyberdelia/CyberRealisticXL",
        "name": "CyberRealistic XL",
        "tier": "gold",
        "best_for": "Skin texture and portraits",
        "description": "Pore-level detail master. Excels at close-up portraits with exceptional skin, fabric, and metal texture.",
        "scheduler": "dpm_pp_2m_sde_karras",
        "optimal_steps": 40,
        "cfg_range": [4.0, 5.5],
        "keywords": ["portrait", "face", "skin", "closeup", "texture", "detail", "pores", "fabric"]
    },
    "epicrealism-xl": {
        "hf_id": "stablediffusionapi/epicrealism-xl-v5",
        "name": "epiCRealism XL PureFix",
        "tier": "specialized",
        "best_for": "Natural unpolished realism",
        "description": "Avoids plastic AI look aggressively. Produces unedited raw camera file aesthetics.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [4.5, 6.0],
        "keywords": ["natural", "raw", "unpolished", "authentic", "real", "candid"]
    },
    "epicella-xl": {
        "hf_id": "stablediffusionapi/epicella-xl",
        "name": "epiCella XL Photo",
        "tier": "specialized",
        "best_for": "Portrait Photography",
        "description": "Specialized for beautiful, clean portrait photography.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [4.5, 6.0],
        "keywords": ["portrait", "clean", "photo", "photography", "beauty"]
    },
    "zavychroma-xl": {
        "hf_id": "stablediffusionapi/zavychromaxl-v80",
        "name": "ZavyChroma XL",
        "tier": "specialized",
        "best_for": "Magic realism with vibrant color",
        "description": "Realistic subjects with punchy magazine-cover color grading out of the box.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [5.0, 6.5],
        "keywords": ["vibrant", "colorful", "magazine", "cover", "saturated", "punchy", "vivid"]
    },
    "helloworld-xl": {
        "hf_id": "Leosam/HelloWorld_XL",
        "name": "HelloWorld XL",
        "tier": "specialized",
        "best_for": "Diverse subjects and architecture",
        "description": "Neutral bias for diverse ethnicities and architectural styles. Excellent for commercial stock photos.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 32,
        "cfg_range": [5.0, 6.5],
        "keywords": ["diversity", "architecture", "building", "commercial", "stock", "global", "ethnic"]
    },
    "nightvision-xl": {
        "hf_id": "Disra/NightVisionXL",
        "name": "NightVision XL",
        "tier": "specialized",
        "best_for": "Low-light and night photography",
        "description": "Handles true black values and dynamic lighting (street lamps, neon) without artifacts.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 35,
        "cfg_range": [4.5, 6.0],
        "keywords": ["night", "dark", "neon", "low-light", "evening", "street", "lamp", "glow"]
    },
    "albedobase-xl": {
        "hf_id": "stablediffusionapi/albedobase-xl-v13",
        "name": "AlbedoBase XL",
        "tier": "specialized",
        "best_for": "General purpose safe realism",
        "description": "Stable and strictly prompt-adherent. Less opinionated, won't force a style unless requested.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [5.0, 7.0],
        "keywords": ["general", "versatile", "neutral", "stable", "reliable", "accurate"]
    },
    "copax-timeless-xl": {
        "hf_id": "Copax/Copax_TimeLessXL",
        "name": "Copax Timeless XL",
        "tier": "specialized",
        "best_for": "Artistic/painterly realism",
        "description": "Border between photograph and hyper-realistic oil painting. Too good to be true but still photographic.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 35,
        "cfg_range": [5.5, 7.0],
        "keywords": ["artistic", "painterly", "oil", "painting", "art", "hyper-realistic", "refined"]
    },
    "dreamshaper-xl": {
        "hf_id": "Lykon/dreamshaper-xl-1-0",
        "name": "DreamShaper XL",
        "tier": "specialized",
        "best_for": "Fantasy realism and concept art",
        "description": "Top-tier for realistic fantasy. Warriors, cyborgs, sci-fi environments with creative edge.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [5.0, 6.5],
        "keywords": ["fantasy", "sci-fi", "warrior", "cyborg", "concept", "creative", "imaginative"]
    }
}

# Legacy compatibility map (short names -> model IDs)
MODEL_MAP = {k: v["hf_id"] for k, v in SDXL_MODELS.items()}
# Add legacy aliases
MODEL_MAP.update({
    "sdxl-realism": SDXL_MODELS["juggernaut-xl"]["hf_id"],
    "sdxl-anime": "cagliostrolab/animagine-xl-3.1",
    "sdxl-surreal": SDXL_MODELS["dreamshaper-xl"]["hf_id"],
    "sdxl": SDXL_MODELS["juggernaut-xl"]["hf_id"],
    "sdxl-base": SDXL_MODELS["juggernaut-xl"]["hf_id"]
})
