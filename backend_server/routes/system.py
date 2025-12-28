from fastapi import APIRouter, Request, HTTPException
import psutil
from backend_server.monitoring import hw_monitor, model_memory_tracker

router = APIRouter()

@router.get("/health")
@router.get("/v1/health")
async def health():
    return {"status": "ok", "server": "backend_server"}

@router.get("/diagnostics/scan")
async def run_diagnostics(request: Request):
    return request.app.state.system_diagnostician.run_all_checks(
        nvidia_available=hw_monitor.nvidia_available,
        memory_tracker=model_memory_tracker
    )

@router.post("/diagnostics/fix/{fix_id}")
async def fix_diagnostic(request: Request, fix_id: str):
    result = request.app.state.system_diagnostician.apply_fix(fix_id)
    if not result["success"]:
            raise HTTPException(status_code=500, detail=result["message"])
    return result

@router.get("/metrics")
async def metrics():
    try:
        cpu = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory().percent
        gpus = hw_monitor.get_gpus()
        env = hw_monitor.get_environment_status()
        
        try:
            proc = psutil.Process()
            env["process_memory_mb"] = proc.memory_info().rss / (1024 * 1024)
        except:
            env["process_memory_mb"] = 0
        
        device = "CPU"
        if gpus:
            device = gpus[0]["name"]
        
        loaded_models = model_memory_tracker.get_loaded_models()
        ghost_status = model_memory_tracker.get_ghost_status()
        
        return {
            "cpu": cpu,
            "memory": memory,
            "device": device,
            "gpus": gpus,
            "environment": env,
            "loaded_models": loaded_models,
            "ghost_memory": ghost_status
        }
    except Exception as e:
        print(f"Error collecting metrics: {e}")
        return {"cpu": 0, "memory": 0, "device": "Unknown", "gpus": [], "loaded_models": []}
