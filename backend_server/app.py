
import asyncio
import sys
import os
import time
import uvicorn
import torch
from threading import Thread
import gc

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Constants
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Moondream Imports
from moondream_station.core.system_diagnostics import SystemDiagnostician

# Local Backend Imports
try:
    import backend_fixed as sdxl_backend_new
    required_methods = ['init_backend', 'generate', 'unload_backend']
    missing_methods = [m for m in required_methods if not hasattr(sdxl_backend_new, m)]
    if missing_methods:
        print(f"Warning: backend_fixed missing methods: {missing_methods}")
        sdxl_backend_new = None
except ImportError:
    print("Warning: Could not import backend_fixed. SDXL features disabled.")
    sdxl_backend_new = None

# Refactored Components
from backend_server.monitoring import model_memory_tracker
from backend_server.services import TrackedInferenceService, AdvancedModelService

# Initialize Diagnostician (Global needed for now)
system_diagnostician = SystemDiagnostician(BASE_DIR)

class RestServer:
    def __init__(self, config, manifest_manager, session_state=None, analytics=None):
        self.config = config
        self.manifest_manager = manifest_manager
        
        # Initialize Services
        self.inference_service = TrackedInferenceService(config, manifest_manager)
        self.advanced_service = AdvancedModelService()
        
        # Inject models into manifest (Legacy behavior preserved)
        self._inject_advanced_models()
        
        self.app = FastAPI(title="Moondream Station (Backend Server)", version="2.5.1")
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        self.server = None
        self.server_thread = None

        # Zombie Killer Init
        self.zombie_killer_enabled = False 
        self.zombie_check_interval = 30
        Thread(target=self._zombie_monitor_loop, daemon=True).start()

        self._setup_routes()

    def _inject_advanced_models(self):
        # Kept inline for now as it modifies manifest_manager state directly
        try:
            from transformers import AutoConfig
            models = self.manifest_manager.get_models()
            print("[Advanced] Checking model availability...")
            
            # Florence-2
            florence_available = False
            try:
                AutoConfig.from_pretrained("microsoft/Florence-2-large", local_files_only=True)
                florence_available = True
                print("  ✓ Florence-2 Large available locally")
            except: print("  ✗ Florence-2 Large not available")
            
            # WD14 v3
            wd14v3_available = False
            try:
                AutoConfig.from_pretrained("SmilingWolf/wd-vit-tagger-v3", local_files_only=True)
                wd14v3_available = True
                print("  ✓ WD14 ViT Tagger v3 available locally")
            except: print("  ✗ WD14 ViT Tagger v3 not available")
            
            if florence_available:
                models['florence-2-large-4bit'] = type('ModelInfo', (object,), {
                    'id': 'florence-2-large-4bit', 'name': 'Florence-2 Large (4-bit)',
                    'type': 'vision', 'description': 'Microsoft Florence-2 Large with 4-bit quantization.',
                    'version': '2.0', 'model_dump': lambda: {'id': 'florence-2-large-4bit', 'name': 'Florence-2 Large (4-bit)', 'description': 'Microsoft Florence-2 Large', 'version': '2.0'}
                })
            
            if wd14v3_available:
                models['wd-vit-tagger-v3'] = type('ModelInfo', (object,), {
                    'id': 'wd-vit-tagger-v3', 'name': 'WD14 ViT Tagger v3',
                    'type': 'vision', 'description': 'SmilingWolf WD Tagger V3.',
                    'version': '3.0', 'model_dump': lambda: {'id': 'wd-vit-tagger-v3', 'name': 'WD14 ViT Tagger v3', 'description': 'SmilingWolf WD Tagger V3', 'version': '3.0'}
                })
        except Exception as e:
            print(f"[Advanced] Warning: Failed to check/inject models: {e}")

    def _setup_routes(self):
        # Dependency Injection via App State
        self.app.state.inference_service = self.inference_service
        self.app.state.advanced_service = self.advanced_service
        self.app.state.manifest_manager = self.manifest_manager
        self.app.state.config = self.config
        self.app.state.sdxl_backend = sdxl_backend_new
        self.app.state.system_diagnostician = system_diagnostician

        # Import Routers
        from backend_server.routes import system, models, generation, chat
        
        self.app.include_router(system.router)
        self.app.include_router(models.router)
        self.app.include_router(generation.router)
        self.app.include_router(chat.router)

    def _zombie_monitor_loop(self):
        # Ideally move to separate service, but keep here for now
        print("[System] Zombie Killer Monitor Thread Started")
        while True:
            try:
                if self.zombie_killer_enabled: self._check_zombies()
            except Exception as e: print(f"[System] Zombie Monitor Error: {e}")
            time.sleep(max(5, self.zombie_check_interval))

    def _check_zombies(self):
        if not self.zombie_killer_enabled: return
        if model_memory_tracker.zombie_detected:
             print(f"[ZombieKiller] 🧟 ZOMBIE DETECTED! (Ghost: {model_memory_tracker.ghost_vram_mb:.1f}MB). Terminating...")
             try: self.inference_service.unload_model()
             except: pass
             try:
                 if sdxl_backend_new: sdxl_backend_new.unload_backend()
             except: pass
             
             model_memory_tracker.loaded_models.clear()
             model_memory_tracker.zombie_detected = False
             model_memory_tracker.ghost_vram_mb = 0
             model_memory_tracker.update_memory_usage()
             gc.collect()
             if torch.cuda.is_available(): torch.cuda.empty_cache()
             print("[ZombieKiller] 🔫 Headshot! Zombie memory cleared.")

    def start(self, host="0.0.0.0", port=2020):
        self.server_thread = Thread(target=self._run_server, args=(host, port), daemon=True)
        self.server_thread.start()
        # Wait for server to start
        for _ in range(10):
            if self.server and self.server.started: return True
            time.sleep(0.5)
        return True

    def _run_server(self, host, port):
        config = uvicorn.Config(app=self.app, host=host, port=port, log_level="info")
        self.server = uvicorn.Server(config)
        self.server.run()

    def stop(self):
        if self.server: self.server.should_exit = True
        if self.inference_service: self.inference_service.stop()

    def is_running(self):
        return self.server_thread and self.server_thread.is_alive()
