from fastapi import APIRouter, Request
import logging
from backend import config
from backend.core.memory import model_memory_tracker
from backend.utils.model_scanner import discover_all_models

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/v1/models")
async def list_models():
    """List all available models (auto-discovered from directories + vision/analysis models)"""
    
    # 1. Auto-discover generation models from directories
    generation_models = discover_all_models()
    
    # Add VRAM tracking to each model
    for model in generation_models:
        model['last_known_vram_mb'] = model_memory_tracker.get_last_known_vram(model['id']) or 6000
    
    all_models = generation_models
    
    # 2. Add Vision/Analysis Models (Static list - these are managed differently)
    all_models.append({
        "id": "moondream-2",
        "name": "Moondream 2",
        "type": "vision",
        "description": "Efficient vision-language model (Local)",
        "is_downloaded": True,
        "last_known_vram_mb": 2500
    })

    all_models.append({
        "id": "moondream-3",
        "name": "Moondream 3 (4-bit)",
        "type": "vision",
        "description": "Newer, smarter vision model (Requires ~4GB VRAM).",
        "is_downloaded": False,
        "last_known_vram_mb": 3500
    })
    
    all_models.append({
        "id": "wd14-vit-v2",
        "name": "WD14 Tagger V2",
        "type": "analysis",
        "description": "Standard anime tagger (Local)",
        "is_downloaded": True,
        "last_known_vram_mb": 450
    })

    all_models.append({
        "id": "wd14-vit-v3",
        "name": "WD14 Tagger V3",
        "type": "analysis",
        "description": "Newer tagger with more tags.",
        "is_downloaded": False,
        "last_known_vram_mb": 1100
    })

    return {"models": all_models}


@router.post("/v1/models/recommend")
async def recommend_model(request: Request):
    """Analyze prompt and recommend best SDXL model"""
    try:
        data = await request.json()
        prompt = data.get("prompt", "").lower()
        
        if not prompt:
            return {
                "recommended": "juggernaut-xl",
                "confidence": 0.5,
                "matches": ["juggernaut-xl"]
            }
        
        # Simple keyword matching against config
        scores = {}
        for model_id, meta in config.SDXL_MODELS.items():
            score = 0
            matched = []
            for keyword in meta.get("keywords", []):
                if keyword in prompt:
                    score += 1
                    matched.append(keyword)
            
            if meta.get("tier") == "gold":
                score += 0.2
            
            if score > 0:
                scores[model_id] = {"score": score, "matched": matched}
        
        if not scores:
            return {
                "recommended": "juggernaut-xl",
                "confidence": 0.3,
                "reason": "No match, using default",
                "matches": ["juggernaut-xl", "realvisxl-v5", "albedobase-xl"]
            }
            
        sorted_models = sorted(scores.items(), key=lambda x: x[1]["score"], reverse=True)
        top_model = sorted_models[0][0]
        
        return {
            "recommended": top_model,
            "confidence": min(scores[top_model]["score"] / 5.0, 1.0),
            "matches": [m[0] for m in sorted_models[:3]]
        }

    except Exception as e:
        logger.error(f"Recommend failed: {e}")
        return {"error": str(e)}
