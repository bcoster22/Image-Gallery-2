import time
import psutil
import torch
from .hardware import hw_monitor

class ModelMemoryTracker:
    """Track memory usage per loaded model with Ghost Detection"""
    
    EXPECTED_VRAM = {
        "moondream-2": 2600,
        "moondream-3": 2600,
        "nsfw-detector": 800,
        "sdxl-realism": 6000,
        "sdxl-anime": 6000,
        "sdxl-surreal": 6000,
        "sdxl": 6000,
        "juggernaut-xl": 6000,
        "wd14-vit-v2": 450,
        "joycaption-alpha-2": 4500,
        "florence-2-large": 1500
    }

    def __init__(self):
        self.baseline_vram_mb = 0
        self.baseline_ram_mb = 0
        self.loaded_models = {}  # {model_id: {load_time, vram_usage, name}}
        self.ghost_models = []   # List of suspected ghost models
        self.last_known_vram = {} # History for testing

    def record_baseline(self):
        """Record baseline memory before any models loaded"""
        ram = psutil.Process().memory_info().rss / 1024 / 1024
        
        vram = 0
        # Wait a sec for VRAM to settle
        time.sleep(1)
        
        status = hw_monitor.get_environment_status()
        if status["gpu_available"]:
             vram = status["vram_total_mb"] - status["vram_free_mb"]
             
        self.baseline_vram_mb = vram
        self.baseline_ram_mb = ram
        print(f"Baseline VRAM: {int(vram)}MB")
        
    def track_model_load(self, model_id: str, model_name: str):
        if model_id in self.loaded_models:
             return
             
        # Record pre-load state
        status_pre = hw_monitor.get_environment_status()
        vram_pre = status_pre["vram_total_mb"] - status_pre["vram_free_mb"]
        
        self.loaded_models[model_id] = {
            "id": model_id,
            "name": model_name,
            "load_time": time.time(),
            "vram_start": vram_pre,
            "vram_mb": self.EXPECTED_VRAM.get(model_id, 2000) # Temporary estimate
        }
        
    def track_model_unload(self, model_id: str):
        if model_id in self.loaded_models:
            del self.loaded_models[model_id]
            
    def update_memory_usage(self):
        """Update memory usage and calculate Ghost VRAM"""
        status = hw_monitor.get_environment_status()
        if not status["gpu_available"]: return
        
        current_vram = status["vram_total_mb"] - status["vram_free_mb"]
        
        # Calculate active model usage
        active_usage = 0
        
        # If we have 1 model, assume it takes all VRAM above baseline
        if len(self.loaded_models) == 1:
            mid = list(self.loaded_models.keys())[0]
            usage = max(0, current_vram - self.baseline_vram_mb)
            self.loaded_models[mid]["vram_mb"] = usage
            self.last_known_vram[mid] = usage
            active_usage = usage
        elif len(self.loaded_models) > 1:
            # Fallback to estimates derived from total
            total_delta = max(0, current_vram - self.baseline_vram_mb)
            # Distribute proportionally based on EXPECTED_VRAM
            total_expected = sum(self.EXPECTED_VRAM.get(m, 2000) for m in self.loaded_models)
            
            for mid in self.loaded_models:
                expected = self.EXPECTED_VRAM.get(mid, 2000)
                ratio = expected / (total_expected or 1)
                usage = total_delta * ratio
                self.loaded_models[mid]["vram_mb"] = usage
                self.last_known_vram[mid] = usage
                active_usage += usage
                
        # Ghost Detection
        # Ghost = Current - Baseline - ActiveModels
        ghost_mb = current_vram - self.baseline_vram_mb - active_usage
        
        # Basic hysteresis
        if ghost_mb > 500: # Any unexplained 500MB is a ghost
             if "Unaccounted VRAM" not in [g["name"] for g in self.ghost_models]:
                 self.ghost_models = [{
                     "name": "Unaccounted VRAM",
                     "size_mb": ghost_mb,
                     "severity": "high" if ghost_mb > 2000 else "medium"
                 }]
             else:
                 self.ghost_models[0]["size_mb"] = ghost_mb
        else:
             self.ghost_models = []

    def get_loaded_models(self):
        return list(self.loaded_models.values())
        
    def get_ghost_status(self):
        return {
            "detected": len(self.ghost_models) > 0,
            "ghost_vram_mb": self.ghost_models[0]["size_mb"] if self.ghost_models else 0
        }

    def get_last_known_vram(self, model_id: str):
        return self.last_known_vram.get(model_id, 0)

# Global tracker instance
model_memory_tracker = ModelMemoryTracker()
