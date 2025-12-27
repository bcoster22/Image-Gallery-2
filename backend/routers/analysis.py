from fastapi import APIRouter, Request, HTTPException
import logging
import json
import time
from backend.services.advanced_models import advanced_model_service
from backend.core.memory import model_memory_tracker

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/v1/analyze/tags")
@router.post("/v1/classify")
async def analyze_tags(request: Request):
    """WD14 Tagging Endpoint - Analyze image and return tags with scores"""
    try:
        data = await request.json()
        model_id = data.get("model", "wd14-vit-v3")
        image_url = data.get("image_url")
        
        if not image_url:
            raise HTTPException(status_code=400, detail="image_url is required")
        
        # Load model if needed
        logger.info(f"Loading WD14 model: {model_id}")
        if not advanced_model_service.start(model_id):
            raise HTTPException(status_code=500, detail=f"Failed to load model {model_id}")
        
        # Track model load
        model_memory_tracker.track_model_load(model_id, "WD14 Tagger")
        
        # Run inference
        result_str = advanced_model_service.run(model_id, "", image_url)
        
        # Parse JSON result
        try:
            result = json.loads(result_str)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse result: {result_str}")
            raise HTTPException(status_code=500, detail="Invalid response from model")
        
        # Check for errors
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # Return OpenAI-compatible format
        return {
            "id": f"tags-{int(time.time())}",
            "object": "image.analysis",
            "created": int(time.time()),
            "model": model_id,
            "tags": result.get("tags", []),
            "scores": result.get("scores", {})
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tagging failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
