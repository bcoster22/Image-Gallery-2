from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.concurrency import run_in_threadpool
import time
from backend_server.config import SDXL_MODELS, MODEL_MAP
from backend_server.monitoring import model_memory_tracker

router = APIRouter()

@router.post("/v1/generate")
async def generate_image(request: Request):
    state = request.app.state
    sdxl_backend = state.sdxl_backend
    
    if not sdxl_backend:
            return JSONResponse(content={"error": "SDXL Backend not available"}, status_code=500)

    vram_mode = request.headers.get("X-VRAM-Mode", "balanced") 

    try:
        data = await request.json()
        prompt = data.get("prompt")
        if not prompt:
                return JSONResponse(content={"error": "Prompt is required"}, status_code=400)

        if vram_mode in ["balanced", "low"]:
            if state.inference_service.is_running():
                print(f"[VRAM] Unloading Moondream for SDXL generation ({vram_mode} mode)...")
                state.inference_service.unload_model()

        requested_model = data.get("model", "sdxl-realism")
        full_model_id = MODEL_MAP.get(requested_model, requested_model)
        
        print(f"Initializing Backend: {requested_model} -> {full_model_id}")

        success = sdxl_backend.init_backend(
            model_id=full_model_id,
            use_4bit=True
        )
        if not success:
                return JSONResponse(content={"error": "Failed to initialize SDXL backend"}, status_code=500)
        
        try:
            name = SDXL_MODELS.get(requested_model, {}).get("name", requested_model)
            model_memory_tracker.track_model_load(requested_model, name)
        except: pass

        width = data.get("width", 1024)
        height = data.get("height", 1024)
        steps = data.get("steps", 8)
        image = data.get("image") 
        strength = data.get("strength", 0.75)
        scheduler = data.get("scheduler", "euler")

        try:
            result = await run_in_threadpool(
                sdxl_backend.generate,
                prompt=prompt,
                width=width,
                height=height,
                steps=steps,
                image=image,
                strength=strength,
                scheduler=scheduler
            )
        except Exception as gen_err:
            if "out of memory" in str(gen_err).lower():
                print("[VRAM] OOM detected. Retrying...")
                # self.unload_all_models() equiv
                if state.inference_service: state.inference_service.unload_model()
                try: sdxl_backend.unload_backend()
                except: pass
                model_memory_tracker.loaded_models.clear()
                
                success = sdxl_backend.init_backend(
                    model_id=full_model_id,
                    use_4bit=True
                )
                result = await run_in_threadpool(
                    sdxl_backend.generate,
                    prompt=prompt,
                    width=width,
                    height=height,
                    steps=steps,
                    image=image,
                    strength=strength,
                    scheduler=scheduler
                )
            else:
                raise gen_err

        generated_images = []
        stats = {}
        
        if isinstance(result, dict) and "images" in result:
            generated_images = result["images"]
            stats = result.get("stats", {})
        else:
            generated_images = result 
            
        if vram_mode == "low":
            print("[VRAM] Low mode: Unloading SDXL after generation.")
            sdxl_backend.unload_backend()
            try:
                model_memory_tracker.track_model_unload(requested_model)
            except: pass

        return {
            "created": int(time.time()), 
            "data": [{"b64_json": img} for img in generated_images], 
            "images": generated_images, 
            "image": generated_images[0] if generated_images else None,
            "stats": stats
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=500)
