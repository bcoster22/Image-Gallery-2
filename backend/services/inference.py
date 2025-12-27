import os
import time
import asyncio
import logging
import torch
import gc
from typing import Dict, Any, Optional, List
from concurrent.futures import ThreadPoolExecutor

from backend import paths, config
from backend.core.memory import model_memory_tracker
from backend.core.hardware import hw_monitor

# Import backend modules dynamically or statically as needed
# For now, we keep the dynamic loading style but bridged
import sys

logger = logging.getLogger(__name__)

class AdvancedModelService:
    def __init__(self):
        self.current_model_id = None
        self.current_model_type = None
        self.backends = {}  # type: -> backend_module
        self._lock = asyncio.Lock()
        
        # Ensure correct Python path for legacy backends if needed
        # (Though ideally we migrate them to be proper packages)
        sys.path.append(os.path.join(paths.MODELS_ROOT, "backends"))

    async def load_model(self, model_id: str, model_type: str):
        async with self._lock:
            if self.current_model_id == model_id:
                return {"status": "already_loaded", "model": model_id}

            logger.info(f"Requested load: {model_id} ({model_type})")

            # 1. Unload current if different
            if self.current_model_id:
                await self._unload_current()

            # 2. Load new model based on type
            try:
                if model_type == "vision":
                    await self._load_vision_model(model_id)
                elif model_type == "generation":
                    await self._load_generation_model(model_id)
                elif model_type == "analysis":
                    await self._load_analysis_model(model_id)
                else:
                    raise ValueError(f"Unknown model type: {model_type}")

                self.current_model_id = model_id
                self.current_model_type = model_type
                
                # Track in memory tracker
                model_memory_tracker.track_model_load(model_id, model_id)
                
                return {"status": "loaded", "model": model_id}
            except Exception as e:
                logger.error(f"Failed to load {model_id}: {e}")
                # Cleanup on failure
                self.current_model_id = None
                self.current_model_type = None
                await self._force_gc()
                raise e

    async def _unload_current(self):
        if not self.current_model_id: return

        logger.info(f"Unloading current model: {self.current_model_id}")
        
        # Dispatch unload via backend
        try:
            if self.current_model_type == "vision":
                from moondream_backend import backend as mb
                mb.unload()
            elif self.current_model_type == "generation":
                # For SDXL, we might need to talk to the legacy backend wrapper
                # For now, we assume the new SDXL backend has an unload
                if "sdxl_backend" in self.backends:
                     self.backends["sdxl_backend"].unload_model()
            elif self.current_model_type == "analysis":
                if "wd14" in self.current_model_id:
                    from wd14_backend import backend as wb
                    wb.model = None # Manual cleanup if no unload
                elif "nsfw" in self.current_model_id:
                     from nsfw_backend import backend as nb
                     nb.unload()

        except Exception as e:
            logger.warning(f"Error during unload: {e}")

        # Usage Tracking
        model_memory_tracker.track_model_unload(self.current_model_id)
        
        self.current_model_id = None
        self.current_model_type = None
        await self._force_gc()

    async def _force_gc(self):
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()

    def _load_legacy_module(self, folder_name, module_name):
        """Helper to load legacy backend.py files avoiding name collisions"""
        import importlib.util
        import sys
        
        file_path = os.path.join(paths.BACKENDS_DIR, folder_name, "backend.py")
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            return module
        raise ImportError(f"Could not load legacy backend: {folder_name}")

    async def _load_vision_model(self, model_id):
        # Dynamic import of legacy backend
        moondream = self._load_legacy_module("moondream_backend", "legacy_moondream")
        
        # Initialize
        moondream.init_backend(model_id=model_id)
        # Warmup / Load
        Service = moondream.get_model_service()
        self.backends["moondream"] = moondream

    async def _load_analysis_model(self, model_id):
        if "wd14" in model_id.lower():
             wd14 = self._load_legacy_module("wd14_backend", "legacy_wd14")
             wd14_backend = wd14.Backend()
             wd14_backend.load(model_id=model_id)
             self.backends["wd14"] = wd14_backend
        elif "nsfw" in model_id.lower():
             nsfw = self._load_legacy_module("nsfw_backend", "legacy_nsfw")
             nsfw.init_backend(model_id=model_id)
             nsfw.get_model() # Trigger load
             self.backends["nsfw"] = nsfw

    async def _load_generation_model(self, model_id):
        # Reroute to SDXL Backend
        # We need to ensure the shared sdxl_backend_new is accessible or re-import it
        # For this refactor, let's treat it as a service dependency
        try:
             from scripts import backend_fixed as sdxl
             from backend import config
             
             # Translate short ID to HuggingFace ID if needed
             # The frontend uses short IDs like "juggernaut-xl"
             # The backend expects HuggingFace IDs like "RunDiffusion/Juggernaut-XL-Lightning"
             hf_model_id = model_id
             
             # Check if this is a short ID that needs translation
             if model_id in config.MODEL_MAP:
                 hf_model_id = config.MODEL_MAP[model_id]
                 logger.info(f"Translated model ID: {model_id} -> {hf_model_id}")
             
             # Call init_backend (Synchronous, but usually fast enough for a swap if cached, 
             # otherwise might block. Ideally run in threadpool, but for now direct call)
             # We forcing 4-bit as per legacy default
             logger.info(f"Initializing SDXL Backend: {hf_model_id}")
             success = sdxl.init_backend(model_id=hf_model_id, use_4bit=True)
             
             if not success:
                 raise RuntimeError(f"Failed to initialize SDXL backend for {model_id}")
                 
             self.backends["sdxl_backend"] = sdxl.BACKEND
             
        except Exception as e:
            logger.error(f"Error loading generation model {model_id}: {e}")
            raise e

    def get_status(self):
        return {
            "current_model": self.current_model_id,
            "type": self.current_model_type,
            "loaded": bool(self.current_model_id)
        }

# Global Service
model_service = AdvancedModelService()
