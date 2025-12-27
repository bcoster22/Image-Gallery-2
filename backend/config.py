import os
from . import paths

# Use central paths
BASE_DIR = paths.MODELS_ROOT
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
    "cyberrealistic-xl-v80": {
        "hf_id": "cyberdelia/CyberRealisticXL_V8.0",
        "name": "CyberRealistic XL V8.0",
        "tier": "gold",
        "best_for": "Enhanced skin texture and realism",
        "description": "Latest version with improved skin rendering and detail. V8.0 update with better lighting and texture accuracy.",
        "scheduler": "dpm_pp_2m_sde_karras",
        "optimal_steps": 40,
        "cfg_range": [4.0, 5.5],
        "keywords": ["portrait", "face", "skin", "closeup", "texture", "detail", "enhanced", "realistic"]
    },
    "cyberrealistic-pony": {
        "hf_id": "cyberdelia/CyberRealistic-Pony",
        "name": "CyberRealistic Pony",
        "tier": "specialized",
        "best_for": "Anime and stylized realism",
        "description": "Pony diffusion-based variant combining realistic textures with anime/illustration capabilities.",
        "scheduler": "dpm_pp_2m_sde_karras",
        "optimal_steps": 35,
        "cfg_range": [5.0, 7.0],
        "keywords": ["anime", "illustration", "stylized", "pony", "cartoon", "character", "realistic"]
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
    "animagine-xl": {
        "hf_id": "cagliostrolab/animagine-xl-3.1",
        "name": "Animagine XL",
        "tier": "specialized",
        "best_for": "Anime and manga style",
        "description": "High-quality anime generation with vibrant colors and detailed character work.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [6.0, 8.0],
        "keywords": ["anime", "manga", "illustration", "cartoon", "character"]
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
    "proteus-xl": {
        "hf_id": "dataautogpt3/ProteusV0.2",
        "name": "Proteus XL",
        "tier": "specialized",
        "best_for": "Versatile photorealism",
        "description": "Flexible model with strong photorealistic capabilities across diverse subjects and styles.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [5.0, 7.0],
        "keywords": ["versatile", "realistic", "photo", "flexible", "quality"]
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
    },
    
    # ===== DIFFUSERS FORMAT VARIANTS =====
    # Models that exist in both SafeTensors (single file) and Diffusers (directory) formats
    
    "animagine-xl-diffusers": {
        "hf_id": "cagliostrolab/animagine-xl-3.1",
        "name": "Animagine XL (Diffusers)",
        "tier": "specialized",
        "best_for": "Anime and manga style (Diffusers format)",
        "description": "High-quality anime generation with diffusers pipeline for better control.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [6.0, 8.0],
        "keywords": ["anime", "manga", "illustration", "cartoon", "character", "diffusers"]
    },
    "cyberrealistic-xl-diffusers": {
        "hf_id": "cyberdelia/CyberRealisticXL",
        "name": "CyberRealistic XL (Diffusers)",
        "tier": "gold",
        "best_for": "Skin texture and portraits (Diffusers format)",
        "description": "Diffusers format for step-by-step pipeline control. Same quality as SafeTensors version.",
        "scheduler": "dpm_pp_2m_sde_karras",
        "optimal_steps": 40,
        "cfg_range": [4.0, 5.5],
        "keywords": ["portrait", "face", "skin", "closeup", "texture", "detail", "diffusers"]
    },
    "dreamshaper-xl-diffusers": {
        "hf_id": "Lykon/dreamshaper-xl-1-0",
        "name": "DreamShaper XL (Diffusers)",
        "tier": "specialized",
        "best_for": "Fantasy realism (Diffusers format)",
        "description": "Diffusers pipeline for fantasy and concept art with flexible control.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [5.0, 6.5],
        "keywords": ["fantasy", "sci-fi", "warrior", "concept", "diffusers"]
    },
    "nightvision-xl-diffusers": {
        "hf_id": "Disra/NightVisionXL",
        "name": "NightVision XL (Diffusers)",
        "tier": "specialized",
        "best_for": "Low-light photography (Diffusers format)",
        "description": "Diffusers format for advanced low-light and night scene control.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 35,
        "cfg_range": [4.5, 6.0],
        "keywords": ["night", "dark", "neon", "low-light", "diffusers"]
    },
    "proteus-xl-diffusers": {
        "hf_id": "dataautogpt3/ProteusV0.2",
        "name": "Proteus XL (Diffusers)",
        "tier": "specialized",
        "best_for": "Versatile realism (Diffusers format)",
        "description": "Diffusers pipeline for flexible, high-quality photorealistic generation.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [5.0, 7.0],
        "keywords": ["versatile", "realistic", "photo", "flexible", "diffusers"]
    },
    "realvisxl-v5-diffusers": {
        "hf_id": "SG161222/RealVisXL_V5.0",
        "name": "RealVisXL V5 (Diffusers)",
        "tier": "gold",
        "best_for": "Raw photography (Diffusers format)",
        "description": "Diffusers format for fine-tuned control over photographic realism.",
        "scheduler": "dpm_pp_2m_sde_karras",
        "optimal_steps": 35,
        "cfg_range": [4.0, 6.0],
        "keywords": ["photo", "photography", "raw", "realistic", "diffusers"]
    },
    "realcartoon-xl-diffusers": {
        "hf_id": "stablediffusionapi/realcartoon-xl-v4",
        "name": "RealCartoon XL (Diffusers)",
        "tier": "specialized",
        "best_for": "3D cartoon and stylized realism",
        "description": "Diffusers-only model blending realistic rendering with cartoon/3D animation aesthetics.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [5.5, 7.5],
        "keywords": ["cartoon", "3d", "animation", "stylized", "character", "diffusers"]
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
