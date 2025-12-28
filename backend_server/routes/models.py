from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
import os
from backend_server.config import SDXL_MODELS
from backend_server.monitoring import model_memory_tracker

router = APIRouter()

@router.get("/v1/models")
async def list_models(request: Request):
    try:
        all_models = []
        app_state = request.app.state
        
        # 1. Manifest Models
        manifest_models_raw = list(app_state.manifest_manager.get_models().values())
        for m_raw in manifest_models_raw:
            m_data = {}
            if hasattr(m_raw, "model_dump"): m_data = m_raw.model_dump()
            elif hasattr(m_raw, "dict"): m_data = m_raw.dict()
            elif hasattr(m_raw, "__dict__"): m_data = m_raw.__dict__
            elif isinstance(m_raw, dict): m_data = m_raw
            
            mid = m_data.get("id") or m_data.get("model_id") or m_data.get("args", {}).get("model_id")
            if not mid: continue
                    
            m = {
                "id": mid,
                "name": m_data.get("name", mid),
                "description": m_data.get("description", ""),
                "version": m_data.get("version", "1.0.0"),
                "is_downloaded": True,
                "last_known_vram_mb": model_memory_tracker.get_last_known_vram(mid)
            }
            
            mid_lower = mid.lower()
            if "moondream" in mid_lower or "florence" in mid_lower or "joycaption" in mid_lower:
                m["type"] = "vision"
            elif "wd14" in mid_lower or "tagger" in mid_lower:
                m["type"] = "analysis"
            else:
                m["type"] = "analysis"

            all_models.append(m)

        # 2. SDXL and Checkpoints
        sdxl = app_state.sdxl_backend
        for model_id, model_info in SDXL_MODELS.items():
                is_downloaded = False
                size_bytes = 0
                detected_format = None
                
                if sdxl:
                    try:
                        is_downloaded = sdxl.is_model_downloaded(model_info.get("hf_id"))
                        if hasattr(sdxl, "get_model_file_details"):
                            file_path, size_bytes = sdxl.get_model_file_details(model_info.get("hf_id"))
                            if file_path:
                                if os.path.isdir(file_path) and os.path.exists(os.path.join(file_path, "model_index.json")):
                                    detected_format = "diffusers"
                                elif os.path.isfile(file_path):
                                    ext = os.path.splitext(file_path)[1].lower()
                                    detected_format = ext.replace(".", "")
                    except: pass

                display_name = model_info["name"]
                if detected_format:
                    display_name = f"{display_name} [{detected_format.upper()}]"

                all_models.append({
                "id": model_id,
                "name": display_name,
                "description": model_info["description"],
                "version": "SDXL",
                "last_known_vram_mb": model_memory_tracker.get_last_known_vram(model_id) or 6000,
                "type": "generation",
                "is_downloaded": is_downloaded,
                "size_bytes": size_bytes,
                "format": detected_format
            })
        
        return JSONResponse(content={"models": all_models})
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/v1/models/switch")
async def switch_model(request: Request):
    body = await request.json()
    model_id = body.get("model")
    if not model_id:
        raise HTTPException(status_code=400, detail="model is required")
    
    state = request.app.state
    
    # 1. Manifest Lookup
    found_key = None
    for key, m_raw in state.manifest_manager.get_models().items():
        m_data = {}
        if hasattr(m_raw, "model_dump"): m_data = m_raw.model_dump()
        elif hasattr(m_raw, "dict"): m_data = m_raw.dict()
        elif hasattr(m_raw, "__dict__"): m_data = m_raw.__dict__
        elif isinstance(m_raw, dict): m_data = m_raw
        
        possible_ids = [m_data.get("id"), m_data.get("model_id"), m_data.get("args", {}).get("model_id")]
        if model_id in possible_ids:
            found_key = key
            break
    
    if found_key:
        if state.sdxl_backend:
            try: state.sdxl_backend.unload_backend()
            except: pass
        
        previous_model = state.config.get("current_model")
        if state.inference_service.start(found_key):
            state.config.set("current_model", found_key)
            try:
                if previous_model and previous_model != found_key:
                    model_memory_tracker.track_model_unload(previous_model)
                
                m_info = state.manifest_manager.get_models().get(found_key)
                name = m_info.name if m_info else model_id
                model_memory_tracker.track_model_load(model_id, name)
            except: pass
        else:
            raise HTTPException(status_code=500, detail="Failed to switch model")

    # 2. SDXL Lookup
    elif model_id in SDXL_MODELS:
        try:
            state.inference_service.unload_model()
        except: pass
        
        try:
            # Note: We can't import scripts here easily. 
            # We should rely on state.sdxl_backend
            if not state.sdxl_backend:
                 raise HTTPException(status_code=500, detail="SDXL Backend not available")

            hf_id = SDXL_MODELS[model_id]['hf_id']
            success = state.sdxl_backend.init_backend(model_id=hf_id)
            if not success:
                    raise HTTPException(status_code=500, detail="Failed to initialize SDXL")
            
            model_memory_tracker.track_model_load(model_id, SDXL_MODELS[model_id]['name'])
            state.config.set("current_model", model_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
            raise HTTPException(status_code=404, detail="Model not found")
        
    stats = model_memory_tracker.loaded_models.get(model_id, {})
    return {
        "status": "success", 
        "model": model_id, 
        "vram_mb": stats.get("vram_mb", 0), 
        "ram_mb": stats.get("ram_mb", 0)
    }

@router.post("/v1/system/unload")
async def unload_model(request: Request):
    app = request.app
    # Need access to the unload_all_models method or implement it here
    if app.state.inference_service:
        app.state.inference_service.unload_model()
    if app.state.sdxl_backend:
        try: app.state.sdxl_backend.unload_backend()
        except: pass
    model_memory_tracker.loaded_models.clear()
    model_memory_tracker.update_memory_usage()
    return {"status": "success", "message": "All models unloaded"}
