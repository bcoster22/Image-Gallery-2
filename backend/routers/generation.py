from fastapi import APIRouter, Request, BackgroundTasks
import logging
from backend.services.inference import model_service
from backend.core.memory import model_memory_tracker

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/v1/chat/completions")
async def chat_completions(request: Request):
    """Unified endpoint for Vision models (Moondream, Florence, WD14)"""
    data = await request.json()
    model_id = data.get("model", "moondream-2")
    messages = data.get("messages", [])
    
    if not messages:
        return {"error": "No messages provided"}
    
    # Parse message content for image and text
    last_msg = messages[-1]
    content = last_msg.get("content", [])
    
    image_url = None
    text_query = ""
    
    if isinstance(content, str):
        text_query = content
    elif isinstance(content, list):
        for part in content:
            if part.get("type") == "image_url":
                image_url = part["image_url"]["url"]
            elif part.get("type") == "text":
                text_query = part["text"]

    if not image_url:
        return {"error": "No image provided for vision model"}
    
    # Route to appropriate service based on model type
    try:
        # Use advanced model service for WD14, Florence, and advanced Moondream
        if "wd14" in model_id or "wd-vit" in model_id or "florence" in model_id or "moondream" in model_id:
            from backend.services.advanced_models import advanced_model_service
            
            # Load model
            if not advanced_model_service.start(model_id):
                return {"error": f"Failed to load model {model_id}"}
            
            # Track model load
            model_memory_tracker.track_model_load(model_id, model_id)
            
            # Run inference
            import json
            result_str = advanced_model_service.run(model_id, text_query, image_url)
            
            # Parse result
            try:
                result = json.loads(result_str)
                if "error" in result:
                    return result
                    
                # For WD14, format tags as text response
                if "tags" in result:
                    answer = f"Tags: {', '.join(result['tags'][:20])}"
                    if result.get("scores"):
                        answer += f"\n\nRatings: {result['scores']}"
                else:
                    answer = result_str
            except json.JSONDecodeError:
                answer = result_str
            
            return {
                "choices": [{
                    "message": {"role": "assistant", "content": answer}
                }]
            }
        
        # Use regular model service for standard Moondream
        else:
            # Load Model
            await model_service.load_model(model_id, "vision")
            
            # Access the loaded backend
            if "moondream" not in model_service.backends:
                return {"error": "Moondream backend not loaded"}
            
            backend = model_service.backends["moondream"]
            
            # Decide between caption and query
            if not text_query or text_query.lower().strip() in ["describe this image", "describe this", "caption this", ""]:
                result = backend.caption(image_url=image_url)
                answer = result.get("caption", result.get("text", ""))
            else:
                result = backend.query(image_url=image_url, question=text_query)
                answer = result.get("answer", result.get("text", ""))
                
            if "error" in result:
                return result
            
            return {
                "choices": [{
                    "message": {"role": "assistant", "content": answer}
                }]
            }
    
    except Exception as e:
        logger.error(f"Chat completion failed: {e}", exc_info=True)
        return {"error": str(e)}

@router.post("/v1/images/generations")
async def openai_generate_image(request: Request):
    """
    OpenAI-compatible Generation Endpoint
    Maps standard OpenAI 'images/generations' payload to our internal format.
    """
    data = await request.json()
    
    # Map OpenAI params to our params
    prompt = data.get("prompt", "")
    model_id = data.get("model", "juggernaut-xl")
    
    # Parse size (e.g., "1024x1024")
    size = data.get("size", "1024x1024")
    width, height = 1024, 1024
    if "x" in size:
        try:
            w, h = size.split("x")
            width = int(w)
            height = int(h)
        except: pass
        
    # Construct internal request
    # We can just call the internal logic, but we need to pass a Request object or refactor
    # Refactoring generate_image to be a helper function is cleaner.
    
    # Call internal helper (we will refactor generate_image below to separate logic)
    return await _run_generation(
        model_id=model_id,
        prompt=prompt,
        negative_prompt=data.get("negative_prompt", ""), # Extension
        width=width,
        height=height,
        steps=data.get("steps", 30),
        guidance_scale=data.get("guidance_scale", 7.0),
        seed=data.get("seed", -1)
    )

@router.post("/v1/generate")
async def generate_image(request: Request):
    """SDXL Generation Endpoint (Internal)"""
    data = await request.json()
    return await _run_generation(
        model_id=data.get("model", "juggernaut-xl"),
        prompt=data.get("prompt", ""),
        negative_prompt=data.get("negative_prompt", ""),
        width=data.get("width", 1024),
        height=data.get("height", 1024),
        steps=data.get("steps", 30),
        guidance_scale=data.get("guidance_scale", 7.0),
        seed=data.get("seed", -1)
    )

async def _run_generation(model_id, prompt, negative_prompt, width, height, steps, guidance_scale, seed):
    # Load
    await model_service.load_model(model_id, "generation")
    
    # Import legacy backend logic
    from scripts import backend_fixed as sdxl
    from fastapi.concurrency import run_in_threadpool
    
    # Trigger generation
    try:
        # Use module-level generate wrapper which handles the global BACKEND instance
        # run in threadpool to avoid blocking main loop
        result = await run_in_threadpool(
            sdxl.generate,
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            steps=steps, # Note: backend_fixed.generate maps generic kwargs to generate_image
            guidance_scale=guidance_scale,
            seed=seed,
            model_id=model_id
        )
        
        # Backend returns dict with error or list of b64 strings?
        # backend_fixed.generate -> BACKEND.generate_image -> returns list of b64 strings
        # OR returns {"error": ...} if failed checks
        
        if isinstance(result, dict) and "error" in result:
             return result
             
        # Map to expected format
        return {
            "created": 1234567890, 
            "data": [{"b64_json": img} for img in result],
            "images": result
        }
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        return {"error": str(e)}

@router.get("/v1/schedulers")
async def list_schedulers():
    from scripts import backend_fixed as sdxl
    if sdxl.sdxl_backend_new:
        return {"schedulers": sdxl.sdxl_backend_new.get_available_schedulers()}
    return {"schedulers": [{"id": "euler", "name": "Euler"}]}

@router.get("/v1/samplers")
async def list_samplers():
    from scripts import backend_fixed as sdxl
    if sdxl.sdxl_backend_new:
        return {"samplers": sdxl.sdxl_backend_new.get_available_samplers()}
    return {"samplers": [{"id": "dpmpp_2m", "name": "DPM++ 2M"}]}
