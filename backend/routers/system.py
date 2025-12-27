from fastapi import APIRouter, HTTPException, BackgroundTasks
import requests
import gc
import torch
import os
import psutil
from backend.core.hardware import hw_monitor
from backend.core.memory import model_memory_tracker
from backend.services.inference import model_service
from backend import paths

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint for provider connection testing"""
    return {"status": "ok", "service": "moondream-station"}

@router.get("/v1/system/status")
async def get_system_status():
    status = hw_monitor.get_environment_status()
    ghost_status = model_memory_tracker.get_ghost_status()
    
    return {
        "hardware": status,
        "memory": {
            "baseline_vram_mb": model_memory_tracker.baseline_vram_mb,
            "ghost_vram_mb": ghost_status["ghost_vram_mb"],
            "zombie_detected": ghost_status["detected"]
        },
        "model_service": model_service.get_status()
    }

@router.get("/diagnostics/gpus")
async def get_gpus():
    return {"gpus": hw_monitor.get_gpus()}

@router.post("/v1/system/unload")
async def unload_model():
    """Force unload current model"""
    await model_service._unload_current()
    return {"status": "unloaded"}

@router.get("/metrics")
async def get_metrics():
    # Return Prometheus text format metrics
    lines = []
    
    # Model tracking
    loaded_models = model_memory_tracker.get_loaded_models()
    for m in loaded_models:
        lines.append(f'loaded_model_vram_mb{{id="{m["id"]}", name="{m["name"]}"}} {m["vram_mb"]}')
        lines.append(f'loaded_model_ram_mb{{id="{m["id"]}", name="{m["name"]}"}} {m.get("ram_mb", 0)}') # Added safe access

    # Ghost tracking
    ghost = model_memory_tracker.get_ghost_status()
    lines.append(f'model_ghost_vram_mb {ghost["ghost_vram_mb"]}')
    lines.append(f'model_zombie_detected {1 if ghost["detected"] else 0}')
    
    # System stats
    try:
        cpu = psutil.cpu_percent()
        ram = psutil.virtual_memory().percent
        lines.append(f'system_cpu_usage {cpu}')
        lines.append(f'system_ram_usage {ram}')
        
        status = hw_monitor.get_environment_status()
        if status["gpu_available"]:
             lines.append(f'gpu_vram_free_mb {status["vram_free_mb"]}')
             lines.append(f'gpu_vram_total_mb {status["vram_total_mb"]}')
    except: pass

    return "\n".join(lines)
