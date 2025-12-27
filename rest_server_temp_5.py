import asyncio
import sys
import os
# Dynamic Path Setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# Add Moondream Station path (ENV or Default)
MOONDREAM_PATH = os.environ.get("MOONDREAM_PATH", os.path.expanduser("~/.moondream-station/moondream-station"))
if MOONDREAM_PATH not in sys.path:
    if os.path.exists(MOONDREAM_PATH):
        sys.path.append(MOONDREAM_PATH)
    else:
        print(f"Warning: Moondream path not found at {MOONDREAM_PATH}")

# Add scripts path for backend
SCRIPTS_PATH = os.path.join(BASE_DIR, "scripts")
if SCRIPTS_PATH not in sys.path:
    sys.path.append(SCRIPTS_PATH)

try:
    import backend_fixed as sdxl_backend_new
    print("Successfully imported backend_fixed as sdxl_backend_new")
except ImportError as e:
    print(f"Warning: Could not import backend_fixed ({e}). Gen AI will not work.")
    sdxl_backend_new = None

import json
import time
import uvicorn
import psutil
import torch
import os
import sys
import subprocess
import urllib.request
from threading import Thread
import gc
try:
    import pynvml
except ImportError:
    pynvml = None

try:
    from transformers import AutoModelForCausalLM, AutoProcessor, BitsAndBytesConfig, AutoTokenizer, AutoModelForImageClassification, AutoImageProcessor
    from PIL import Image
    import io
    import requests
    import torch
    import numpy as np
    from fastapi.concurrency import run_in_threadpool
except ImportError:
    print("Warning: Transformers/BitsAndBytes/PIL not found. Advanced models will fail.")

class AdvancedModelService:
    def __init__(self):
        self.model = None
        self.processor = None
        self.tokenizer = None
        self.current_model_id = None
        self.labels = None
        
    def download_image(self, url):
        try:
            if url.startswith("data:"):
                from base64 import b64decode
                header, encoded = url.split(",", 1)
                data = b64decode(encoded)
                with io.BytesIO(data) as buffer:
                    return Image.open(buffer).convert("RGB").copy()  # .copy() to detach from buffer
            elif url.startswith("http"):
                with requests.get(url, stream=True) as response:
                    return Image.open(response.raw).convert("RGB").copy()
        except Exception as e:
            print(f"Error downloading image: {e}")
        return None

    def start(self, model_id):
        if self.current_model_id == model_id and self.model is not None:
             return True
             
        # Proper Unload with CPU offload
        if self.model is not None:
             try:
                 # Move to CPU first to release VRAM
                 if hasattr(self.model, 'cpu'):
                     self.model.cpu()
             except: pass
             
             # Delete references in order
             if hasattr(self, 'processor') and self.processor is not None:
                 del self.processor
                 self.processor = None
                 
             if hasattr(self, 'tokenizer') and self.tokenizer is not None:
                 del self.tokenizer
                 self.tokenizer = None
                 
             if hasattr(self, 'labels') and self.labels is not None:
                 del self.labels
                 self.labels = None
             
             del self.model
             self.model = None
             
             # Aggressive cleanup
             import gc
             gc.collect()
             gc.collect() # Double collect
             
             if torch.cuda.is_available():
                 torch.cuda.empty_cache()
                 torch.cuda.ipc_collect()
                 torch.cuda.synchronize()  # Ensure all CUDA operations complete
             
             # TRACKER UPDATE: Record manual unload
             if 'model_memory_tracker' in globals() and self.current_model_id:
                 try:
                     model_memory_tracker.track_model_unload(self.current_model_id)
                 except: pass

             # Broadcast unload event
             try:
                 requests.post("http://localhost:3001/log", json={
                     "level": "INFO", 
                     "message": f"[Backend] Unloaded model to free VRAM.",
                     "source": "AdvancedModelService"
                 }, timeout=1)
             except: pass
        
        print(f"[Advanced] Loading {model_id}...")
        
        # Clean up old quantization config if it exists
        if hasattr(self, 'bnb_config'):
            del self.bnb_config
            
        # 4-Bit Config
        self.bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True
        )
        
        try:
            if "wd-vit-tagger-v3" in model_id:
                # WD14 V3 Loading
                repo = "SmilingWolf/wd-vit-tagger-v3"
                self.model = AutoModelForImageClassification.from_pretrained(repo, trust_remote_code=True)
                self.processor = AutoImageProcessor.from_pretrained(repo, trust_remote_code=True)
                self.model.to("cuda")
                self.labels = self.model.config.id2label

            elif "moondream" in model_id:
                try:
                    print("[Advanced] Attempting to load Moondream 3 (4-bit)...")
                    model_name = "alecccdd/moondream3-preview-4bit"
                    self.model = AutoModelForCausalLM.from_pretrained(
                        model_name, trust_remote_code=True, quantization_config=bnb_config, device_map="auto"
                    )
                    self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                    print("[Advanced] Moondream 3 loaded successfully.")
                except Exception as e:
                    print(f"[Advanced] Failed to load Moondream 3 ({e}). Falling back to Moondream 2.")
                    model_name = "vikhyatk/moondream2"
                    self.model = AutoModelForCausalLM.from_pretrained(
                        model_name, trust_remote_code=True, quantization_config=bnb_config, device_map="auto"
                    )
                    self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                    print("[Advanced] Moondream 2 loaded as fallback.")
                
            elif "florence" in model_id:
                model_name = "microsoft/Florence-2-large"
                self.model = AutoModelForCausalLM.from_pretrained(
                    model_name, trust_remote_code=True, quantization_config=bnb_config, device_map="auto"
                )
                self.processor = AutoProcessor.from_pretrained(model_name, trust_remote_code=True)
                
            self.current_model_id = model_id
            print(f"[Advanced] Loaded {model_id} successfully.")
            try:
                 requests.post("http://localhost:3001/log", json={
                     "level": "INFO", 
                     "message": f"Successfully loaded model: {model_id}",
                     "source": "AdvancedModelService"
                 }, timeout=1)
            except: pass
            
            if 'model_memory_tracker' in globals():
                model_memory_tracker.track_model_load(model_id, model_id)
                
            return True
        except Exception as e:
            print(f"[Advanced] Failed to load {model_id}: {e}")
            try:
                 requests.post("http://localhost:3001/log", json={
                     "level": "ERROR", 
                     "message": f"Failed to load model {model_id}: {str(e)}",
                     "source": "AdvancedModelService"
                 }, timeout=1)
            except: pass
            return False

    def run(self, model_id, prompt, image_url):
        image = self.download_image(image_url)
        if not image: raise Exception("Failed to load image")
        
        try:
            if "wd-vit-tagger-v3" in model_id:
                # WD14 Logic - Extract Tags AND Scores
                inputs = self.processor(images=image, return_tensors="pt").to("cuda")
                with torch.no_grad():
                    outputs = self.model(**inputs)
                
                logits = outputs.logits[0]
                probs = torch.sigmoid(logits).cpu().numpy()
                
                # Format results
                results = { "tags": [], "scores": {} }
                
                # Extract
                for i, score in enumerate(probs):
                    label = self.labels[i]
                    
                    # Check for Rating tags
                    if label.startswith("rating:"):
                        # rating:general, rating:explicit, etc.
                        clean_name = label.replace("rating:", "")
                        results["scores"][clean_name] = float(score)
                    
                    # Standard tags (threshold 0.35)
                    elif score > 0.35:
                         # Escape special chars if needed
                         results["tags"].append(label)
                         
                return json.dumps(results)

            elif "moondream" in model_id:
                enc_image = self.model.encode_image(image)
                return self.model.answer_question(enc_image, prompt, self.tokenizer)

            elif "florence" in model_id:
                 task_prompt = "<MORE_DETAILED_CAPTION>"
                 if "tag" in prompt.lower(): task_prompt = "<OD>" 
                 inputs = self.processor(text=task_prompt, images=image, return_tensors="pt").to("cuda")
                 generated_ids = self.model.generate(
                      input_ids=inputs["input_ids"],
                      pixel_values=inputs["pixel_values"],
                      max_new_tokens=1024,
                      do_sample=False,
                      num_beams=3
                 )
                 generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
                 parsed = self.processor.post_process_generation(generated_text, task=task_prompt, image_size=(image.width, image.height))
                 return parsed.get(task_prompt, str(parsed))
                 
            return "Model not supported"
        finally:
            # CRITICAL: Close PIL image to free RAM
            if image:
                try:
                    image.close()
                except:
                    pass

class HardwareMonitor:
    def __init__(self):
        self.nvidia_available = False
        if pynvml:
            try:
                pynvml.nvmlInit()
                self.nvidia_available = True
            except Exception:
                pass

    def get_environment_status(self):
        import os
        
        # Detect execution type
        execution_type = "System"
        if os.path.exists("/.dockerenv"):
            execution_type = "Docker"
        elif os.environ.get("VIRTUAL_ENV"):
            execution_type = "Venv"

        status = {
            "platform": "CPU",
            "accelerator_available": False,
            "torch_version": torch.__version__,
            "cuda_version": getattr(torch.version, 'cuda', 'Unknown'),
            "hip_version": getattr(torch.version, 'hip', None),
            "execution_type": execution_type
        }
        
        if torch.cuda.is_available():
            status["platform"] = "CUDA"
            status["accelerator_available"] = True
        elif hasattr(torch.version, 'hip') and torch.version.hip:
            status["platform"] = "ROCm"
            status["accelerator_available"] = True
        elif hasattr(torch, 'xpu') and torch.xpu.is_available():
             status["platform"] = "XPU"
             status["accelerator_available"] = True
        elif self.nvidia_available:
            # Fallback: Driver is working, but Torch might not see it
            status["platform"] = "NVIDIA Driver"
            status["accelerator_available"] = True
            try:
                driver = pynvml.nvmlSystemGetDriverVersion()
                if isinstance(driver, bytes):
                    driver = driver.decode()
                status["cuda_version"] = f"Driver {driver}"
            except:
                pass
        
        return status

    def get_gpus(self):
        gpus = []
        if self.nvidia_available:
            try:
                device_count = pynvml.nvmlDeviceGetCount()
                for i in range(device_count):
                    handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                    name = pynvml.nvmlDeviceGetName(handle)
                    if isinstance(name, bytes):
                        name = name.decode("utf-8")
                    
                    memory = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    utilization = pynvml.nvmlDeviceGetUtilizationRates(handle)
                    temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                    
                    gpus.append({
                        "id": i,
                        "name": name,
                        "load": utilization.gpu,
                        "memory_used": int(memory.used / 1024 / 1024), # MB
                        "memory_total": int(memory.total / 1024 / 1024), # MB
                        "temperature": temp,
                        "type": "NVIDIA"
                    })
            except Exception as e:
                print(f"Nvidia monitoring error: {e}")
        return gpus

# Global monitor instance
hw_monitor = HardwareMonitor()

class ModelMemoryTracker:
    """Track memory usage per loaded model with Ghost Detection"""
    
    # Expected VRAM usage map (MB)
    EXPECTED_VRAM = {
        "moondream-2": 2600,
        "moondream-3": 2600,
        "nsfw-detector": 800,
        "sdxl-realism": 6000,
        "sdxl-anime": 6000,
        "sdxl-base": 6000,
        "sdxl-surreal": 6000
    }

    def __init__(self):
        self.loaded_models = {}  # model_id -> {name, vram_mb, ram_mb, loaded_at}
        self.last_known_vram = {}  # model_id -> vram_mb
        self.base_vram = 0
        self.base_ram = 0
        self.ghost_vram_mb = 0
        self.zombie_detected = False
        
    def record_baseline(self):
        """Record baseline memory before any models loaded"""
        try:
            if pynvml:
                try:
                    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                    memory = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    self.base_vram = (memory.total - memory.free) / (1024 * 1024)
                    print(f"Baseline VRAM: {self.base_vram:.0f}MB")
                except:
                    pass
            elif torch.cuda.is_available():
                self.base_vram = torch.cuda.memory_allocated(0) / (1024 * 1024)
            self.base_ram = psutil.Process().memory_info().rss / (1024 * 1024)
        except:
            pass
    
    def track_model_load(self, model_id: str, model_name: str):
        import time
        try:
            # Simple init, accurate update happens in update_memory_usage
            self.loaded_models[model_id] = {
                "id": model_id,
                "name": model_name,
                "vram_mb": 0,
                "ram_mb": 0,
                "loaded_at": int(time.time())
            }
            self.update_memory_usage()
        except:
            pass
    
    def track_model_unload(self, model_id: str):
        if model_id in self.loaded_models:
            del self.loaded_models[model_id]
            self.update_memory_usage()
    
    def update_memory_usage(self):
        """Update memory usage and calculate Ghost VRAM"""
        try:
            current_vram = 0
            current_ram = 0
            
            # 1. Get Actual System Usage
            if pynvml:
                try:
                    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                    memory = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    current_vram = (memory.total - memory.free) / (1024 * 1024)
                except:
                    pass
            if current_vram == 0 and torch.cuda.is_available():
                current_vram = torch.cuda.memory_allocated(0) / (1024 * 1024)
            
            current_ram = psutil.Process().memory_info().rss / (1024 * 1024)
            
            # 2. Calculate Effective Usage (Current - Baseline)
            # Ensure we don't go below zero if baseline was high (e.g. restart)
            effective_vram = max(0, current_vram - self.base_vram)
            effective_ram = max(0, current_ram - self.base_ram)
            
            # 3. Calculate Expected Usage based on loaded models
            expected_total_vram = 0
            for vid in self.loaded_models:
                expected = self.EXPECTED_VRAM.get(vid, 2500) # Default 2.5GB
                expected_total_vram += expected
            
            # 4. Detect Ghost VRAM (Zombie Models)
            # If we are using WAY more than expected (> 1.5GB variance), it's likely a zombie
            variance = effective_vram - expected_total_vram
            if variance > 1500: # Threshold 1.5GB
                self.ghost_vram_mb = int(variance)
                self.zombie_detected = True
                msg = f"[Tracker] ZOMBIE DETECTED! Expected: {expected_total_vram}MB, Actual: {effective_vram:.0f}MB, Ghost: {variance:.0f}MB"
                print(msg)
                try:
                     requests.post("http://localhost:3001/log", json={
                         "level": "ERROR", 
                         "message": msg,
                         "source": "ModelMemoryTracker"
                     }, timeout=1)
                except: pass
            else:
                self.ghost_vram_mb = 0
                self.zombie_detected = False

            # 5. Distribute Effective VRAM to models (normalized to avoid confusing user)
            # If Zombie detected, we clamp model usage to their EXPECTED size so the chart looks "sane"
            # and show the rest as warning. If no zombie, we distribute normally.
            num_models = len(self.loaded_models)
            if num_models > 0:
                if self.zombie_detected:
                    # Assign expected sizes
                    for mid in self.loaded_models:
                         expected = self.EXPECTED_VRAM.get(mid, 2500)
                         self.loaded_models[mid]["vram_mb"] = int(expected)
                         self.loaded_models[mid]["ram_mb"] = int(effective_ram / num_models)
                         self.last_known_vram[mid] = int(expected)
                else:
                    # Distribute normally
                    vram_per = effective_vram / num_models
                    ram_per = effective_ram / num_models
                    for mid in self.loaded_models:
                        self.loaded_models[mid]["vram_mb"] = int(vram_per)
                        self.loaded_models[mid]["ram_mb"] = int(ram_per)
                        self.last_known_vram[mid] = int(vram_per)
                        
        except Exception as e:
            print(f"Failed to update memory usage: {e}")
    
    def get_loaded_models(self):
        """Get list of loaded models"""
        self.update_memory_usage()
        return list(self.loaded_models.values())
        
    def get_ghost_status(self):
        """Get ghost memory status"""
        return {
            "detected": self.zombie_detected,
            "ghost_vram_mb": self.ghost_vram_mb
        }

    def get_last_known_vram(self, model_id: str) -> int:
        return self.last_known_vram.get(model_id, 0)

# Global tracker instance
model_memory_tracker = ModelMemoryTracker()
model_memory_tracker.record_baseline()

# Initialize Diagnostician (Refactored)
from moondream_station.core.system_diagnostics import SystemDiagnostician
# Config root is relative to this file
_config_root = os.path.dirname(__file__)
system_diagnostician = SystemDiagnostician(_config_root)


from threading import Thread
from typing import Any, Dict
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from moondream_station.core.inference_service import InferenceService

# Comprehensive SDXL Model Database with Metadata
SDXL_MODELS = {
    "juggernaut-xl": {
        "hf_id": "RunDiffusion/Juggernaut-XL-Lightning",
        "name": "Juggernaut XL",
        "tier": "gold",
        "best_for": "Cinematic lighting and composition",
        "description": "The most intelligent model for complex scenes. Creates high-budget movie still quality with perfect anatomy.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [4.5, 6.5],
        "keywords": ["cinematic", "movie", "dramatic", "composition", "scene", "lighting", "professional"]
    },
    "realvisxl-v5": {
        "hf_id": "SG161222/RealVisXL_V5.0",
        "name": "RealVisXL V5",
        "tier": "gold",
        "best_for": "Raw photography and imperfect realism",
        "description": "DSLR/smartphone quality with natural imperfections. Messy hair, skin texture, less idealized lighting.",
        "scheduler": "dpm_pp_2m_sde_karras",
        "optimal_steps": 35,
        "cfg_range": [4.0, 6.0],
        "keywords": ["photo", "photography", "raw", "candid", "natural", "realistic", "camera", "lens"]
    },
    "cyberrealistic-xl": {
        "hf_id": "cyberdelia/CyberRealisticXL",
        "name": "CyberRealistic XL",
        "tier": "gold",
        "best_for": "Skin texture and portraits",
        "description": "Pore-level detail master. Excels at close-up portraits with exceptional skin, fabric, and metal texture.",
        "scheduler": "dpm_pp_2m_sde_karras",
        "optimal_steps": 40,
        "cfg_range": [4.0, 5.5],
        "keywords": ["portrait", "face", "skin", "closeup", "texture", "detail", "pores", "fabric"]
    },
    "epicrealism-xl": {
        "hf_id": "stablediffusionapi/epicrealism-xl-v5",
        "name": "epiCRealism XL PureFix",
        "tier": "specialized",
        "best_for": "Natural unpolished realism",
        "description": "Avoids plastic AI look aggressively. Produces unedited raw camera file aesthetics.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [4.5, 6.0],
        "keywords": ["natural", "raw", "unpolished", "authentic", "real", "candid"]
    },
    "cyberrealistic-xl": {
        "hf_id": "Cyberdelia/CyberRealistic_XL",
        "name": "CyberRealistic XL",
        "tier": "gold",
        "best_for": "Skin texture and portraits",
        "description": "Pore-level detail master. Excels at close-up portraits with exceptional skin, fabric, and metal texture.",
        "scheduler": "dpm_pp_2m_sde_karras",
        "optimal_steps": 40,
        "cfg_range": [4.0, 5.5],
        "keywords": ["portrait", "face", "skin", "closeup", "texture", "detail", "pores", "fabric"]
    },
    "epicella-xl": {
        "hf_id": "stablediffusionapi/epicella-xl",
        "name": "epiCella XL Photo",
        "tier": "specialized",
        "best_for": "Portrait Photography",
        "description": "Specialized for beautiful, clean portrait photography.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [4.5, 6.0],
        "keywords": ["portrait", "clean", "photo", "photography", "beauty"]
    },
    "zavychroma-xl": {
        "hf_id": "stablediffusionapi/zavychromaxl-v80",
        "name": "ZavyChroma XL",
        "tier": "specialized",
        "best_for": "Magic realism with vibrant color",
        "description": "Realistic subjects with punchy magazine-cover color grading out of the box.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [5.0, 6.5],
        "keywords": ["vibrant", "colorful", "magazine", "cover", "saturated", "punchy", "vivid"]
    },
    "helloworld-xl": {
        "hf_id": "Leosam/HelloWorld_XL",
        "name": "HelloWorld XL",
        "tier": "specialized",
        "best_for": "Diverse subjects and architecture",
        "description": "Neutral bias for diverse ethnicities and architectural styles. Excellent for commercial stock photos.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 32,
        "cfg_range": [5.0, 6.5],
        "keywords": ["diversity", "architecture", "building", "commercial", "stock", "global", "ethnic"]
    },
    "nightvision-xl": {
        "hf_id": "Disra/NightVisionXL",
        "name": "NightVision XL",
        "tier": "specialized",
        "best_for": "Low-light and night photography",
        "description": "Handles true black values and dynamic lighting (street lamps, neon) without artifacts.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 35,
        "cfg_range": [4.5, 6.0],
        "keywords": ["night", "dark", "neon", "low-light", "evening", "street", "lamp", "glow"]
    },
    "albedobase-xl": {
        "hf_id": "stablediffusionapi/albedobase-xl-v13",
        "name": "AlbedoBase XL",
        "tier": "specialized",
        "best_for": "General purpose safe realism",
        "description": "Stable and strictly prompt-adherent. Less opinionated, won't force a style unless requested.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [5.0, 7.0],
        "keywords": ["general", "versatile", "neutral", "stable", "reliable", "accurate"]
    },
    "copax-timeless-xl": {
        "hf_id": "Copax/Copax_TimeLessXL",
        "name": "Copax Timeless XL",
        "tier": "specialized",
        "best_for": "Artistic/painterly realism",
        "description": "Border between photograph and hyper-realistic oil painting. Too good to be true but still photographic.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 35,
        "cfg_range": [5.5, 7.0],
        "keywords": ["artistic", "painterly", "oil", "painting", "art", "hyper-realistic", "refined"]
    },
    "dreamshaper-xl": {
        "hf_id": "Lykon/dreamshaper-xl-1-0",
        "name": "DreamShaper XL",
        "tier": "specialized",
        "best_for": "Fantasy realism and concept art",
        "description": "Top-tier for realistic fantasy. Warriors, cyborgs, sci-fi environments with creative edge.",
        "scheduler": "dpm_pp_2m_karras",
        "optimal_steps": 30,
        "cfg_range": [5.0, 6.5],
        "keywords": ["fantasy", "sci-fi", "warrior", "cyborg", "concept", "creative", "imaginative"]
    }
}

# Legacy compatibility map (short names -> model IDs)
MODEL_MAP = {k: v["hf_id"] for k, v in SDXL_MODELS.items()}
# Add legacy aliases
MODEL_MAP.update({
    "sdxl-realism": SDXL_MODELS["juggernaut-xl"]["hf_id"],
    "sdxl-anime": "cagliostrolab/animagine-xl-3.1",
    "sdxl-surreal": SDXL_MODELS["dreamshaper-xl"]["hf_id"],
    "sdxl": SDXL_MODELS["juggernaut-xl"]["hf_id"],
    "sdxl-base": SDXL_MODELS["juggernaut-xl"]["hf_id"]
})


class RestServer:
    def __init__(self, config, manifest_manager, session_state=None, analytics=None):
        # ... (init code remains same)
        self.config = config
        self.manifest_manager = manifest_manager
        self.session_state = session_state
        self.analytics = analytics
        self.inference_service = InferenceService(config, manifest_manager)
        
        # Monkey-patch InferenceService.start() to track all model loads
        _original_start = self.inference_service.start
        def _tracked_start(model_id: str):
            print(f"[Debug] Attempting to start model: {model_id}")
            result = _original_start(model_id)
            print(f"[Debug] Start result for {model_id}: {result}")
            if result:
                # Track the model load
                try:
                    model_info = self.manifest_manager.get_models().get(model_id)
                    if model_info:
                        model_memory_tracker.track_model_load(model_id, model_info.name)
                        print(f"[ModelTracker] Tracked model load: {model_id} ({model_info.name})")
                except Exception as e:
                    print(f"[ModelTracker] Warning: Failed to track model load: {e}")
            return result
        self.inference_service.start = _tracked_start

        # Initialize Advanced Model Service (4-Bit & WD14 V3)
        self.advanced_service = AdvancedModelService()
        
        # Inject models into manifest so they appear in UI
        try:
            models = self.manifest_manager.get_models()
            # DISABLED: moondream-3-preview-4bit has dtype errors (Float vs Half)
            # Using moondream2 instead which works correctly
            # models['moondream-3-preview-4bit'] = type('ModelInfo', (object,), {
            #     'id': 'moondream-3-preview-4bit',
            #     'name': 'Moondream 3 (4-bit 8GB)',
            #     'type': 'vision',
            #     'description': 'Optimized 4-bit Moondream 3 for 8GB VRAM cards.',
            #     'version': '3.0-preview'
            # })
            models['florence-2-large-4bit'] = type('ModelInfo', (object,), {
                'id': 'florence-2-large-4bit',
                'name': 'Florence-2 Large (4-bit)',
                'type': 'vision',
                'description': 'Microsoft Florence-2 Large with 4-bit quantization.',
                'version': '2.0'
            })
            models['wd-vit-tagger-v3'] = type('ModelInfo', (object,), {
                'id': 'wd-vit-tagger-v3',
                'name': 'WD14 ViT Tagger v3',
                'type': 'vision',
                'description': 'SmilingWolf WD Tagger V3. Returns tags and Image ratings.',
                'version': '3.0'
            })
            print("[Advanced] Injected advanced models into manifest.")
        except Exception as e:
            print(f"[Advanced] Warning: Failed to inject models: {e}")
        
        self.app = FastAPI(title="Moondream Station (Advanced Logic)", version="1.2.0")
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

    def _zombie_monitor_loop(self):
        print("[System] Zombie Killer Monitor Thread Started")
        while True:
            try:
                if self.zombie_killer_enabled:
                    self._check_zombies()
            except Exception as e:
                print(f"[System] Zombie Monitor Error: {e}")
            
            # Sleep for interval (min 5s)
            time.sleep(max(5, self.zombie_check_interval))

    def _check_zombies(self):
        if not self.zombie_killer_enabled: return

        # Check if Tracker detects zombie
        # We access the global model_memory_tracker
        if model_memory_tracker.zombie_detected:
             print(f"[ZombieKiller] 🧟 ZOMBIE DETECTED! (Ghost: {model_memory_tracker.last_ghost_size_mb:.1f}MB). Terminating...")
             
             # 1. Unload everything
             try:
                 if hasattr(self, "inference_service") and self.inference_service:
                     self.inference_service.unload_model()
             except: pass
                 
             try:
                 if sdxl_backend_new:
                     sdxl_backend_new.unload_backend()
             except: pass
                 
             # 2. Reset Tracker
             model_memory_tracker.loaded_models.clear()
             model_memory_tracker.zombie_detected = False
             model_memory_tracker.update_memory_usage()
             
             # 3. Force GC
             gc.collect()
             if torch.cuda.is_available():
                 torch.cuda.empty_cache()
                 
             print("[ZombieKiller] 🔫 Headshot! Zombie memory cleared.")

    def _sse_event_generator(self, raw_generator):
        # ... (remains same)
        token_count = 0
        start_time = time.time()

        try:
            for token in raw_generator:
                token_count += 1
                yield f"data: {json.dumps({'chunk': token})}\\n\\n"

            # Send final stats
            duration = time.time() - start_time
            if duration > 0 and token_count > 0:
                tokens_per_sec = round(token_count / duration, 1)
                stats = {
                    "tokens": token_count,
                    "duration": round(duration, 2),
                    "tokens_per_sec": tokens_per_sec,
                }
                yield f"data: {json.dumps({'stats': stats})}\\n\\n"

            yield f"data: {json.dumps({'completed': True})}\\n\\n"
        except GeneratorExit:
            # Client disconnected - cleanup
            print("[SSE] Client disconnected, cleaning up generator")
            try:
                raw_generator.close()
            except:
                pass
        finally:
            # Ensure generator is closed
            if hasattr(raw_generator, 'close'):
                try:
                    raw_generator.close()
                except:
                    pass

    def _setup_routes(self):
        @self.app.get("/health")
        @self.app.get("/v1/health")
        async def health():
            return {"status": "ok", "server": "moondream-station"}

        @self.app.get("/diagnostics/scan")
        async def run_diagnostics():
            """Run all system diagnostics checks"""
            # Pass strict dependency logic, including memory tracker for Ghost VRAM detection
            return system_diagnostician.run_all_checks(
                nvidia_available=hw_monitor.nvidia_available,
                memory_tracker=model_memory_tracker
            )

        @self.app.post("/diagnostics/fix/{fix_id}")
        async def fix_diagnostic(fix_id: str):
            """Execute a fix for a specific diagnostic issue"""
            result = system_diagnostician.apply_fix(fix_id)
            if not result["success"]:
                 raise HTTPException(status_code=500, detail=result["message"])
            return result

        @self.app.post("/diagnostics/setup-autofix")
        async def setup_autofix(request: Request):
            """
            Run the Auto Fix setup script with sudo password.
            This configures passwordless sudo for the fix wrapper script.
            """
            import subprocess
            
            try:
                body = await request.json()
                password = body.get("password", "")
                
                if not password:
                    raise HTTPException(status_code=400, detail="Password required")
                
                # Path to setup script
                script_path = os.path.join(_config_root, "scripts", "setup", "setup_gpu_reset.sh")
                
                if not os.path.exists(script_path):
                    raise HTTPException(status_code=500, detail=f"Setup script not found: {script_path}")
                
                # Execute with sudo -S (read password from stdin)
                process = subprocess.Popen(
                    ["sudo", "-S", "bash", script_path],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                stdout, stderr = process.communicate(input=password + "\n", timeout=30)
                
                if process.returncode == 0:
                    return {"success": True, "message": "Auto Fix setup completed successfully"}
                else:
                    # Check for auth failure
                    if "Sorry, try again" in stderr or "authentication failure" in stderr.lower():
                        raise HTTPException(status_code=401, detail="Incorrect password")
                    raise HTTPException(status_code=500, detail=f"Setup failed: {stderr}")
                    
            except subprocess.TimeoutExpired:
                raise HTTPException(status_code=504, detail="Setup script timed out")
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))


        @self.app.get("/metrics")
        async def metrics():
            """Return system metrics for monitoring"""
            try:
                cpu = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory().percent
                gpus = hw_monitor.get_gpus()
                env = hw_monitor.get_environment_status()
                
                # Add Process Memory
                try:
                    proc = psutil.Process()
                    env["process_memory_mb"] = proc.memory_info().rss / (1024 * 1024)
                except:
                    env["process_memory_mb"] = 0
                
                # Determine primary device
                device = "CPU"
                if gpus:
                    device = gpus[0]["name"]
                
                # Get loaded models with real memory usage
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
                print(f"Error collecting metrics: {e}")
                return {"cpu": 0, "memory": 0, "device": "Unknown", "gpus": []}

        @self.app.post("/v1/system/gpu-reset")
        async def reset_gpu(gpu_id: int = 0):
            """
            Reset the specified GPU.
            Requires passwordless sudo for nvidia-smi.
            """
            import subprocess
            
            try:
                # Check if nvidia-smi is available and we have permission
                # -n: non-interactive (fails if password needed)
                # Use the new nuclear reset script
                script_path = "/home/bcoster/.moondream-station/moondream-station/nuclear_gpu_reset.sh"
                cmd = ["sudo", "-n", script_path]
                
                process = subprocess.run(
                    cmd, 
                    capture_output=True, 
                    text=True,
                    timeout=30
                )
                
                if process.returncode == 0:
                    return {"status": "success", "message": f"GPU {gpu_id} reset successfully."}
                
                # Handle permission denied (sudo failed)
                if "password is required" in process.stderr:
                    from fastapi import HTTPException
                    raise HTTPException(
                        status_code=403, 
                        detail="Permission denied. Passwordless sudo not configured for nvidia-smi."
                    )
                
                # Handle other errors (e.g. GPU busy)
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=500, 
                    detail=f"Reset failed. Stderr: {process.stderr.strip()}. Stdout: {process.stdout.strip()}"
                )
                
            except subprocess.TimeoutExpired:
                from fastapi import HTTPException
                raise HTTPException(status_code=504, detail="Command timed out.")
            except Exception as e:
                # Re-raise HTTP exceptions
                if hasattr(e, "status_code"):
                    raise e
                from fastapi import HTTPException
                raise HTTPException(status_code=500, detail=str(e))

        # Unload route moved to end of file to support updated logic


        
        @self.app.post("/v1/system/update-packages")
        async def update_packages(request: Request):
            """
            Update specified npm packages.
            """
            import re
            import subprocess
            
            try:
                body = await request.json()
                packages = body.get("packages", [])
                
                if not packages or not isinstance(packages, list):
                     return JSONResponse(status_code=400, content={"status": "error", "message": "No packages specified"})

                # Security: Validate package names (alphanumeric, -, @, /)
                # Prevents command injection like "; rm -rf /"
                safe_packages = []
                for pkg in packages:
                    if re.match(r"^[@a-zA-Z0-9\-\/\.\^~]+$", pkg):
                        safe_packages.append(pkg)
                    else:
                        print(f"Skipping invalid package name: {pkg}")
                
                if not safe_packages:
                     return JSONResponse(status_code=400, content={"status": "error", "message": "No valid packages provided"})

                # Construct command: npm install pkg1@latest pkg2@latest ...
                # We assume we are in the project root where package.json exists.
                cmd = ["npm", "install"] + [f"{pkg}@latest" for pkg in safe_packages]
                
                print(f"[System] Updating frontend packages: {' '.join(cmd)}")
                
                process = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=300 # 5 minutes
                )
                
                if process.returncode == 0:
                    return {"status": "success", "message": f"Successfully updated: {', '.join(safe_packages)}"}
                else:
                    return JSONResponse(status_code=500, content={
                        "status": "error", 
                        "message": "Update failed", 
                        "details": process.stderr
                    })
                    
            except Exception as e:
                return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

        @self.app.get("/v1/system/backend-version")
        async def get_backend_versions():
            """
            Get versions of key backend libraries and check for critical updates.
            """
            import importlib.metadata
            import torch
            from packaging import version
            import sys
            
            libs = ['torch', 'torchvision', 'torchaudio', 'diffusers', 'transformers', 'accelerate', 'moondream']
            versions = {}
            for lib in libs:
                try:
                    versions[lib] = importlib.metadata.version(lib)
                except importlib.metadata.PackageNotFoundError:
                    versions[lib] = "Not Installed"

            # Check for critical vulnerability CVE-2025-32434
            current_torch = versions.get('torch', '0.0.0').split('+')[0]
            has_critical_update = False
            critical_message = ""
            
            try:
                if version.parse(current_torch) < version.parse("2.6.0"):
                    has_critical_update = True
                    critical_message = "CRITICAL: Torch version < 2.6.0 detected. Vulnerability CVE-2025-32434 present. Upgrade immediately."
            except:
                pass

            return {
                "versions": versions,
                "has_critical_update": has_critical_update,
                "critical_message": critical_message,
                "python_version": sys.version.split(' ')[0],
                "platform": sys.platform
            }

        @self.app.post("/v1/system/upgrade-backend")
        async def upgrade_backend():
            """
            Upgrade backend dependencies to fix security vulnerabilities.
            Specifically targets torch 2.6.0+ and compatible libraries.
            """
            import subprocess
            import sys
            from fastapi.responses import JSONResponse
            
            # Command to upgrade torch, torchvision, torchaudio to 2.6.0+ for CUDA 12.4 (compatible with 12.6)
            # We use --no-cache-dir to ensure we get fresh wheels
            # We explicitly target the index url for compatibility
            pip_cmd = [
                sys.executable, "-m", "pip", "install", 
                "torch>=2.6.0", "torchvision>=0.21.0", "torchaudio>=2.6.0", 
                "diffusers>=0.36.0", "transformers>=4.48.0", "accelerate>=1.3.0",
                "--index-url", "https://download.pytorch.org/whl/cu124", 
                "--upgrade", "--no-cache-dir"
            ]
            
            print(f"[System] Upgrading backend: {' '.join(pip_cmd)}")
            
            try:
                process = subprocess.run(
                    pip_cmd,
                    capture_output=True,
                    text=True,
                    timeout=600 # 10 minutes for big downloads
                )
                
                if process.returncode == 0:
                    return {"status": "success", "message": "Backend upgraded successfully. Please restart the backend server."}
                else:
                    return JSONResponse(status_code=500, content={
                        "status": "error", 
                        "message": "Upgrade failed", 
                        "details": process.stderr[-1000:] # Last 1000 chars
                    })
            except subprocess.TimeoutExpired:
                 return JSONResponse(status_code=504, content={"status": "error", "message": "Upgrade timed out (download taking too long). Check server logs."})
            except Exception as e:
                return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

        @self.app.get("/v1/system/verify-backend")
        async def verify_backend():
            """
            Run comprehensive system health checks.
            """
            import torch
            import shutil
            import subprocess
            import time
            import requests
            from packaging import version
            import importlib.metadata
            import sys
            from fastapi.responses import JSONResponse
            
            checks = []
            all_passed = True
            
            def add_result(name, passed, message):
                nonlocal all_passed
                if not passed: all_passed = False
                checks.append({"name": name, "passed": passed, "message": message})

            # 1. Framework Versions
            try:
                torch_ver = importlib.metadata.version('torch')
                if version.parse(torch_ver) >= version.parse("2.6.0"):
                    add_result("PyTorch Version", True, f"v{torch_ver} (Secure)")
                else:
                    add_result("PyTorch Version", False, f"v{torch_ver} (Insecure - CVE-2025-32434)")
            except:
                add_result("PyTorch Version", False, "Not Installed")

            # 2. CUDA Availability
            if torch.cuda.is_available():
                device_name = torch.cuda.get_device_name(0)
                add_result("CUDA GPU", True, f"Available: {device_name}")
            else:
                add_result("CUDA GPU", False, "Not available (Running on CPU)")

            # 3. VRAM Check
            try:
                if torch.cuda.is_available():
                    free_mem = torch.cuda.mem_get_info()[0] / 1024**3
                    total_mem = torch.cuda.mem_get_info()[1] / 1024**3
                    add_result("VRAM", True, f"{free_mem:.1f}GB free / {total_mem:.1f}GB total")
                else:
                    add_result("VRAM", True, "N/A (CPU Mode)")
            except Exception as e:
                add_result("VRAM", False, f"Error checking VRAM: {str(e)}")

            # 4. Disk Space (Check current directory volume)
            try:
                total, used, free = shutil.disk_usage(".")
                free_gb = free / 1024**3
                if free_gb > 10:
                    add_result("Disk Space", True, f"{free_gb:.1f} GB available")
                elif free_gb > 2:
                    add_result("Disk Space", True, f"Low space: {free_gb:.1f} GB available (Warning)")
                else:
                    add_result("Disk Space", False, f"Critical low space: {free_gb:.1f} GB")
                    
            except Exception as e:
                add_result("Disk Space", False, f"Error: {str(e)}")

            # 5. Network Connectivity (HuggingFace)
            try:
                start = time.time()
                requests.head("https://huggingface.co", timeout=3)
                latency = (time.time() - start) * 1000
                add_result("Network (HuggingFace)", True, f"Reachable ({latency:.0f}ms)")
            except:
                add_result("Network (HuggingFace)", False, "Unreachable - Models cannot download")

            # 6. FFmpeg Check
            if shutil.which("ffmpeg"):
                add_result("FFmpeg", True, "Installed (Video generation ready)")
            else:
                add_result("FFmpeg", False, "Not found (Video/Audio generation will fail)")
                
            # 7. Functional Test (Tensor Op)
            try:
                if torch.cuda.is_available():
                    x = torch.rand(5, 5).cuda()
                    y = x * x
                    add_result("GPU Tensor Op", True, "Pass")
                else:
                     add_result("GPU Tensor Op", True, "Skipped (CPU Mode)")
            except Exception as e:
                add_result("GPU Tensor Op", False, f"Failed: {str(e)}")

            return {"checks": checks, "overallStatus": "ok" if all_passed else "failed"}

        @self.app.get("/v1/system/prime-profile")
        async def get_prime_profile():
            """Get the current NVIDIA Prime profile (nvidia/on-demand/intel)"""
            import subprocess
            try:
                # prime-select query does not require sudo
                process = subprocess.run(
                    ["prime-select", "query"], 
                    capture_output=True, 
                    text=True,
                    timeout=5
                )
                if process.returncode == 0:
                    return {"profile": process.stdout.strip()}
                return {"profile": "unknown", "error": process.stderr.strip()}
            except Exception as e:
                return {"profile": "unknown", "error": str(e)}

        @self.app.post("/v1/system/prime-profile")
        async def set_prime_profile(profile: str):
            """Set the NVIDIA Prime profile (requires sudo/root via script)"""
            import subprocess
            from fastapi import HTTPException
            
            valid_profiles = ["nvidia", "on-demand", "intel"]
            if profile not in valid_profiles:
                raise HTTPException(status_code=400, detail="Invalid profile")
                
            try:
                # Use the script helper
                script_path = "/home/bcoster/.moondream-station/moondream-station/switch_prime_profile.sh"
                cmd = ["sudo", "-n", script_path, profile]
                
                process = subprocess.run(
                    cmd, 
                    capture_output=True, 
                    text=True,
                    timeout=30
                )
                
                if process.returncode == 0:
                    return {"status": "success", "message": f"Switched to {profile}. Please logout/reboot."}
                
                if "password is required" in process.stderr:
                    raise HTTPException(
                        status_code=403, 
                        detail="Permission denied. Sudo requires password."
                    )
                    
                raise HTTPException(status_code=500, detail=f"Failed: {process.stderr}")
                
            except subprocess.TimeoutExpired:
                raise HTTPException(status_code=504, detail="Command timed out.")
            except Exception as e:
                if hasattr(e, "status_code"): raise e
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/v1/generate")
        async def generate_image(request: Request):
            """
            Generate generic image using SDXL Backend with Smart VRAM Management
            """
            if not sdxl_backend_new:
                 return JSONResponse(content={"error": "SDXL Backend not available"}, status_code=500)

            # Get VRAM Mode from Header (high, balanced, low)
            vram_mode = request.headers.get("X-VRAM-Mode", "balanced") 

            try:
                data = await request.json()
                prompt = data.get("prompt")
                if not prompt:
                     return JSONResponse(content={"error": "Prompt is required"}, status_code=400)

                # Smart Switching: Unload Moondream if needed
                if vram_mode in ["balanced", "low"]:
                    if hasattr(self, "inference_service") and self.inference_service.is_running():
                        print(f"[VRAM] Unloading Moondream for SDXL generation ({vram_mode} mode)...")
                        self.inference_service.unload_model()

                # Init Backend
                requested_model = data.get("model", "sdxl-realism")
                full_model_id = MODEL_MAP.get(requested_model, requested_model)
                
                print(f"Initializing Backend: {requested_model} -> {full_model_id}")

                success = sdxl_backend_new.init_backend(
                    model_id=full_model_id,
                    use_4bit=True
                )
                if not success:
                     return JSONResponse(content={"error": "Failed to initialize SDXL backend"}, status_code=500)
                
                # Update Memory Tracker
                try:
                    model_memory_tracker.track_model_load(requested_model, SDXL_MODELS.get(requested_model, {}).get("name", requested_model))
                except: pass

                # Generation Logic with Retry
                width = data.get("width", 1024)
                height = data.get("height", 1024)
                steps = data.get("steps", 8)
                image = data.get("image") 
                strength = data.get("strength", 0.75)

                scheduler = data.get("scheduler", "euler")

                try:
                    result = await run_in_threadpool(
                        sdxl_backend_new.generate,
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
                        print("[VRAM] OOM detected during generation. Triggering Emergency Unload and Retry...")
                        self.unload_all_models()
                        # Retry once
                        success = sdxl_backend_new.init_backend(
                            model_id=data.get("model", "sdxl-realism"),
                            use_4bit=True
                        )
                        result = await run_in_threadpool(
                            sdxl_backend_new.generate,
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

                # Parse Result (Dict or List)
                generated_images = []
                stats = {}
                
                if isinstance(result, dict) and "images" in result:
                    generated_images = result["images"]
                    stats = result.get("stats", {})
                else:
                    generated_images = result # Legacy list support
                    
                # Low VRAM Cleanup
                if vram_mode == "low":
                    print("[VRAM] Low mode: Unloading SDXL after generation.")
                    sdxl_backend_new.unload_backend()
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

        @self.app.get("/v1/models")
        async def list_models():
            try:
                all_models = []
                
                # 1. Add Manifest Models
                manifest_models_raw = list(self.manifest_manager.get_models().values())
                for m_raw in manifest_models_raw:
                    m = {}
                    
                    # 1. Convert to Dict (Safe)
                    m_data = {}
                    if hasattr(m_raw, "model_dump"): m_data = m_raw.model_dump()
                    elif hasattr(m_raw, "dict"): m_data = m_raw.dict()
                    elif hasattr(m_raw, "__dict__"): m_data = m_raw.__dict__
                    elif isinstance(m_raw, dict): m_data = m_raw
                    
                    # 2. Extract ID (Robust)
                    mid = m_data.get("id")
                    if not mid:
                        mid = m_data.get("model_id")
                    if not mid and "args" in m_data:
                        mid = m_data["args"].get("model_id")
                        
                    if not mid:
                         print(f"Warning: Skipping model without ID: {m_data}")
                         continue
                         
                    # 3. Construct Clean Object (Prevents Serialization Errors)
                    m["id"] = mid
                    m["name"] = m_data.get("name", mid)
                    m["description"] = m_data.get("description", "")
                    m["version"] = m_data.get("version", "1.0.0")
                    
                    # 4. Determine Type
                    mid_lower = mid.lower()
                    if "moondream" in mid_lower or "florence" in mid_lower or "joycaption" in mid_lower:
                        m["type"] = "vision"
                    elif "wd14" in mid_lower or "tagger" in mid_lower or "nsfw" in mid_lower:
                        m["type"] = "analysis"
                    elif "sdxl" in mid_lower or "juggernaut" in mid_lower or "animagine" in mid_lower or "dreamshaper" in mid_lower or "flux" in mid_lower or "epicrealism" in mid_lower:
                        m["type"] = "generation"
                    else:
                        m["type"] = "analysis" # Default

                    m["is_downloaded"] = True
                    m["last_known_vram_mb"] = model_memory_tracker.get_last_known_vram(mid)
                    
                    all_models.append(m)

                # 2. Add SDXL Models (with format detection)
                for model_id, model_info in SDXL_MODELS.items():
                     # Check availability
                     is_downloaded = False
                     try:
                         if sdxl_backend_new and hasattr(sdxl_backend_new, "is_model_downloaded"):
                             is_downloaded = sdxl_backend_new.is_model_downloaded(model_info.get("hf_id"))
                         else:
                             pass
                     except Exception as ex:
                         print(f"Error checking download status for {model_id}: {ex}")

                     # Get file size and detect format
                     size_bytes = 0
                     detected_format = None
                     try:
                         if sdxl_backend_new and hasattr(sdxl_backend_new, "get_model_file_details"):
                             file_path, size_bytes = sdxl_backend_new.get_model_file_details(model_info.get("hf_id"))
                             
                             # Detect format based on file path
                             if file_path:
                                 if os.path.isdir(file_path):
                                     # Check if it's a Diffusers directory
                                     if os.path.exists(os.path.join(file_path, "model_index.json")):
                                         detected_format = "diffusers"
                                 elif os.path.isfile(file_path):
                                     ext = os.path.splitext(file_path)[1].lower()
                                     if ext == '.safetensors':
                                         detected_format = "safetensors"
                                     elif ext == '.ckpt':
                                         detected_format = "ckpt"
                                     elif ext == '.pt':
                                         detected_format = "pt"
                                     elif ext == '.bin':
                                         detected_format = "bin"
                     except: 
                         pass

                     # Build display name with format tag
                     display_name = model_info["name"]
                     if detected_format:
                         format_labels = {
                             'diffusers': 'Diffusers',
                             'safetensors': 'SafeTensors',
                             'ckpt': 'CKPT',
                             'pt': 'PyTorch',
                             'bin': 'Binary'
                         }
                         format_label = format_labels.get(detected_format, detected_format.upper())
                         display_name = f"{model_info['name']} [{format_label}]"

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
                
                # 3. Dynamic Scan for Local Checkpoints (Enhanced Multi-Format Support)
                try:
                    models_dir = os.environ.get("MOONDREAM_MODELS_DIR", os.path.expanduser("~/.moondream-station/models"))
                    
                    # Scan multiple directories for models
                    scan_dirs = [
                        os.path.join(models_dir, "diffusers"),      # Diffusers format models
                        os.path.join(models_dir, "checkpoints"),     # Single-file checkpoints  
                        os.path.join(models_dir, "sdxl-checkpoints") # Legacy directory (if exists)
                    ]
                    
                    # Supported checkpoint formats
                    CHECKPOINT_FORMATS = {
                        '.safetensors': 'SafeTensors',
                        '.ckpt': 'CKPT',
                        '.pt': 'PyTorch',
                        '.bin': 'Binary'
                    }
                    
                    for scan_dir in scan_dirs:
                        if not os.path.exists(scan_dir):
                            continue
                            
                        for item in os.listdir(scan_dir):
                            full_path = os.path.join(scan_dir, item)
                            
                            # Check for Diffusers format (directory with model_index.json)
                            if os.path.isdir(full_path):
                                model_index_path = os.path.join(full_path, "model_index.json")
                                if os.path.exists(model_index_path):
                                    model_id_inferred = item
                                    already_listed = any(m["id"] == model_id_inferred for m in all_models)
                                    
                                    if not already_listed:
                                        # Get directory size
                                        size_bytes = 0
                                        try:
                                            for dirpath, dirnames, filenames in os.walk(full_path):
                                                for f in filenames:
                                                    fp = os.path.join(dirpath, f)
                                                    if os.path.exists(fp):
                                                        size_bytes += os.path.getsize(fp)
                                        except: pass
                                        
                                        all_models.append({
                                            "id": model_id_inferred,
                                            "name": f"{item.replace('-', ' ').replace('_', ' ').title()} [Diffusers]",
                                            "description": "Diffusers format model (directory-based).",
                                            "version": "Local",
                                            "last_known_vram_mb": 6000,
                                            "type": "generation",
                                            "is_downloaded": True,
                                            "size_bytes": size_bytes,
                                            "format": "diffusers"
                                        })
                            
                            # Check for single-file checkpoints
                            elif os.path.isfile(full_path):
                                file_ext = os.path.splitext(item)[1].lower()
                                
                                if file_ext in CHECKPOINT_FORMATS:
                                    model_id_inferred = item
                                    already_listed = any(m["id"] == model_id_inferred for m in all_models)
                                    
                                    if not already_listed:
                                        size_bytes = 0
                                        try: 
                                            size_bytes = os.path.getsize(full_path)
                                        except: pass
                                        
                                        # Clean up the name and add format tag
                                        clean_name = os.path.splitext(item)[0].replace("-", " ").replace("_", " ").title()
                                        format_tag = CHECKPOINT_FORMATS[file_ext]
                                        
                                        all_models.append({
                                            "id": model_id_inferred,
                                            "name": f"{clean_name} [{format_tag}]",
                                            "description": f"Local {format_tag} checkpoint file.",
                                            "version": "Local",
                                            "last_known_vram_mb": 6000,
                                            "type": "generation",
                                            "is_downloaded": True,
                                            "size_bytes": size_bytes,
                                            "format": file_ext[1:]  # Remove the dot
                                        })
                
                except Exception as e:
                    print(f"Failed to scan local checkpoints: {e}")
                
                 # 4. WD14 Fallback
                has_wd14 = any(m["id"] == "wd14-vit-v2" for m in all_models)
                if not has_wd14:
                     all_models.append({
                        "id": "wd14-vit-v2",
                        "name": "WD14 Tagger V2",
                        "description": "Waifu Diffusion 1.4 Tagger for Anime/Illustration analysis.",
                        "version": "v2",
                        "last_known_vram_mb": model_memory_tracker.get_last_known_vram("wd14-vit-v2") or 900,
                        "type": "analysis",
                        "is_downloaded": True
                    })

                # Debug: Print models types
                # for m in all_models:
                #     print(f"[Debug] Model {m['id']} Type: {m.get('type')}")

                return JSONResponse(content={"models": all_models})

                return {
                    "models": model_list
                }
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/v1/schedulers")
        async def list_schedulers():
            """Get available SDXL schedulers with metadata"""
            try:
                if sdxl_backend_new:
                    schedulers = sdxl_backend_new.get_available_schedulers()
                    return {"schedulers": schedulers}
                else:
                    # Fallback if backend not loaded
                    return {
                        "schedulers": [
                            {"id": "euler", "name": "Euler", "description": "Default scheduler", "recommended": True}
                        ]
                    }
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/v1/system/unload")
        async def unload_model():
            """Force unload the current model from memory"""
            try:
                # Unload Moondream
                if hasattr(self, "inference_service") and self.inference_service:
                    self.inference_service.unload_model()
                
                # Unload SDXL
                if sdxl_backend_new:
                 sdxl_backend_new.unload_backend()
                 
                # CRITICAL Fix: Update Memory Tracker
                # Since we force unloaded everything, we clear the tracker
                model_memory_tracker.loaded_models.clear()
                model_memory_tracker.update_memory_usage() # Update metrics immediately

                return {"status": "success", "message": "All models unloaded and VRAM cleared"}
            except Exception as e:
                import traceback
                traceback.print_exc()
                return {"status": "error", "message": str(e)}

        @self.app.get("/v1/system/zombie-killer")
        async def get_zombie_killer_config():
            return {
                "enabled": self.zombie_killer_enabled,
                "interval": self.zombie_check_interval
            }

        @self.app.post("/v1/system/zombie-killer")
        async def set_zombie_killer_config(request: Request):
            try:
                data = await request.json()
                if "enabled" in data:
                    self.zombie_killer_enabled = bool(data["enabled"])
                    print(f"[System] Zombie Killer {'ENABLED' if self.zombie_killer_enabled else 'DISABLED'}")
                if "interval" in data:
                    self.zombie_check_interval = int(data["interval"])
                
                # Immediate check if enabled
                if self.zombie_killer_enabled:
                    Thread(target=self._check_zombies, daemon=True).start()

                return {
                    "status": "success",
                    "enabled": self.zombie_killer_enabled,
                    "interval": self.zombie_check_interval
                }
            except Exception as e:
                return {"status": "error", "message": str(e)}

        @self.app.get("/v1/samplers")
        async def list_samplers():
            """Get available SDXL samplers with metadata"""
            try:
                if sdxl_backend_new:
                    samplers = sdxl_backend_new.get_available_samplers()
                    return {"samplers": samplers}
                else:
                    # Fallback if backend not loaded
                    return {
                        "samplers": [
                            {"id": "dpmpp_2m", "name": "DPM++ 2M", "description": "Default sampler", "recommended": True}
                        ]
                    }
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/v1/models/sdxl")
        async def list_sdxl_models():
            """Get all SDXL models with full metadata"""
            try:
                models_with_meta = []
                for model_id, meta in SDXL_MODELS.items():
                    models_with_meta.append({
                        "id": model_id,
                        **meta
                    })
                return {"models": models_with_meta}
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/v1/models/recommend")
        async def recommend_model(request: Request):
            """Analyze prompt and recommend best SDXL model"""
            try:
                data = await request.json()
                prompt = data.get("prompt", "").lower()
                
                if not prompt:
                    # Default to Juggernaut if no prompt
                    return {
                        "recommended": "juggernaut-xl",
                        "confidence": 0.5,
                        "matches": ["juggernaut-xl"]
                    }
                
                # Score each model based on keyword matches
                scores = {}
                for model_id, meta in SDXL_MODELS.items():
                    score = 0
                    matched_keywords = []
                    
                    # Check if any keywords appear in prompt
                    for keyword in meta["keywords"]:
                        if keyword in prompt:
                            score += 1
                            matched_keywords.append(keyword)
                    
                    # Boost gold tier models slightly
                    if meta["tier"] == "gold":
                        score += 0.2
                    
                    if score > 0:
                        scores[model_id] = {
                            "score": score,
                            "matched_keywords": matched_keywords,
                            "meta": meta
                        }
                
                # If no matches, return top gold models
                if not scores:
                    return {
                        "recommended": "juggernaut-xl",
                        "confidence": 0.3,
                        "reason": "No specific keywords matched. Using versatile default.",
                        "matches": [
                            {"id": "juggernaut-xl", **SDXL_MODELS["juggernaut-xl"]},
                            {"id": "realvisxl-v5", **SDXL_MODELS["realvisxl-v5"]},
                            {"id": "albedobase-xl", **SDXL_MODELS["albedobase-xl"]}
                        ]
                    }
                
                # Sort by score
                sorted_models = sorted(scores.items(), key=lambda x: x[1]["score"], reverse=True)
                
                # Get top 3
                top_model_id = sorted_models[0][0]
                top_score = sorted_models[0][1]
                
                confidence = min(top_score["score"] / 5.0, 1.0)  # Normalize to 0-1
                
                matches = []
                for model_id, data in sorted_models[:3]:
                    matches.append({
                        "id": model_id,
                        "score": data["score"],
                        "matched_keywords": data["matched_keywords"],
                        **data["meta"]
                    })
                
                return {
                    "recommended": top_model_id,
                    "confidence": confidence,
                    "reason": f"Matched keywords: {', '.join(top_score['matched_keywords'])}",
                    "matches": matches
                }
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/v1/stats")
        async def get_stats():
            stats = self.inference_service.get_stats()
            # Add requests processed from session state
            if self.session_state:
                stats["requests_processed"] = self.session_state.state["requests_processed"]
            else:
                stats["requests_processed"] = 0
            return stats

        @self.app.post("/v1/models/switch")
        async def switch_model(request: Request):
            body = await request.json()
            model_id = body.get("model")
            if not model_id:
                raise HTTPException(status_code=400, detail="model is required")
            
            # Case 1: Manifest Model (Moondream, Florence, etc.)
            # Robust Lookup: The model_id from frontend might be an 'alias' (args.model_id) 
            # and not the actual key in manifest_manager. We need to find the correct key.
            found_key = None
            if model_id in self.manifest_manager.get_models():
                found_key = model_id
            else:
                # Search values for a match
                for key, m_raw in self.manifest_manager.get_models().items():
                    m_data = {}
                    if hasattr(m_raw, "model_dump"): m_data = m_raw.model_dump()
                    elif hasattr(m_raw, "dict"): m_data = m_raw.dict()
                    elif hasattr(m_raw, "__dict__"): m_data = m_raw.__dict__
                    elif isinstance(m_raw, dict): m_data = m_raw
                    
                    # Check all potential ID fields
                    possible_ids = [
                        m_data.get("id"),
                        m_data.get("model_id"),
                        m_data.get("args", {}).get("model_id")
                    ]
                    if model_id in possible_ids:
                        found_key = key
                        break
            
            if found_key:
                # Unload SDXL if present (Zombie Prevention)
                if sdxl_backend_new:
                    try:
                        sdxl_backend_new.unload_backend()
                        print("[ZombiePrevention] Unloaded SDXL before manual switch")
                    except: pass
                
                # Check previous for unloading
                previous_model = self.config.get("current_model")
                
                print(f"[Switch] Switching to Manifest Model: {found_key} (Requested: {model_id})")
                
                if self.inference_service.start(found_key):
                    self.config.set("current_model", found_key)
                    
                    # TRACKER UPDATE
                    try:
                        if previous_model and previous_model != found_key:
                            model_memory_tracker.track_model_unload(previous_model)
                        
                        model_info = self.manifest_manager.get_models().get(found_key)
                        if model_info:
                            model_memory_tracker.track_model_load(model_id, model_info.name)
                    except Exception as e:
                        print(f"Warning: Failed to track model load: {e}")
                else:
                    raise HTTPException(status_code=500, detail="Failed to switch model")

            # Case 2: SDXL Model
            elif model_id in SDXL_MODELS:
                print(f"[Switch] Switching to SDXL model: {model_id}")
                
                # Unload Manifest Model
                try:
                    self.inference_service.unload_model()
                    print("[Switch] Unloaded InferenceService (Manifest Model)")
                except Exception as e:
                    print(f"Warning unloading inference service: {e}")
                
                # Initialize SDXL
                try:
                    from scripts import backend_fixed
                    hf_id = SDXL_MODELS[model_id]['hf_id']
                    
                    # Unload previous SDXL if different (init_backend handles re-init but good to be clean)
                    if sdxl_backend_new:
                        if hasattr(sdxl_backend_new, 'BACKEND') and sdxl_backend_new.BACKEND:
                             pass
                    
                    success = backend_fixed.init_backend(model_id=hf_id)
                    if not success:
                         raise HTTPException(status_code=500, detail=f"Failed to initialize SDXL Backend for {model_id}")
                    
                    # Track Load
                    model_memory_tracker.track_model_load(model_id, SDXL_MODELS[model_id]['name'])
                    self.config.set("current_model", model_id)

                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    raise HTTPException(status_code=500, detail=f"SDXL Switch Failed: {str(e)}")

            else:
                 raise HTTPException(status_code=404, detail=f"Model {model_id} not found in Manifest or SDXL list")
                
            # Return Stats
            vram_mb = 0
            ram_mb = 0
            try:
                if model_id in model_memory_tracker.loaded_models:
                    stats = model_memory_tracker.loaded_models[model_id]
                    vram_mb = stats.get("vram_mb", 0)
                    ram_mb = stats.get("ram_mb", 0)
            except Exception as e:
                print(f"Warning: Failed to get stats: {e}")
            
            return {
                "status": "success", 
                "model": model_id,
                "vram_mb": vram_mb,
                "ram_mb": ram_mb
            }

        @self.app.post("/v1/chat/completions")
        async def chat_completions(request: Request):
            return await self._handle_chat_completion(request)

        @self.app.api_route(
            "/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
        )
        async def dynamic_route(request: Request, path: str):
            return await self._handle_dynamic_request(request, path)



    async def _handle_chat_completion(self, request: Request):
        # NOTE: Removed initial is_running check to allow auto-start

        try:
            body = await request.json()
            messages = body.get("messages", [])
            stream = body.get("stream", False)
            requested_model = body.get("model")
            
            # --- ADVANCED MODEL INTERCEPTION ---
            # Removed moondream-3-preview-4bit (dtype errors) - will use moondream2 fallback
            intercept_models = ['florence-2-large-4bit', 'wd-vit-tagger-v3']
            if requested_model in intercept_models:
                try:
                    # Parse image from messages
                    image_url = None
                    prompt_text = ""
                    for msg in messages:
                        if msg.get("role") == "user":
                            content = msg.get("content")
                            if isinstance(content, list):
                                for item in content:
                                    if item.get("type") == "image_url":
                                        image_url = item.get("image_url", {}).get("url")
                                    elif item.get("type") == "text":
                                        prompt_text += item.get("text", "")
                            elif isinstance(content, str):
                                prompt_text = content
                    
                    if not image_url:
                        raise HTTPException(status_code=400, detail="Image required")

                    print(f"[Advanced] Intercepted request for {requested_model}")
                    
                    # Unload SDXL if present
                    if 'sdxl_backend_new' in sys.modules:
                         sys.modules['sdxl_backend_new'].unload_backend()
                    
                    # Ensure model is started
                    if self.advanced_service.start(requested_model):
                        answer = self.advanced_service.run(requested_model, prompt_text, image_url)
                        
                        # Return OpenAI-compatible response
                        return {
                            "id": f"chatcmpl-{int(time.time())}",
                            "object": "chat.completion",
                            "created": int(time.time()),
                            "model": requested_model,
                            "choices": [{
                                "index": 0,
                                "message": {
                                    "role": "assistant",
                                    "content": answer
                                },
                                "finish_reason": "stop"
                            }],
                            "usage": {
                                "prompt_tokens": 0,
                                "completion_tokens": 0,
                                "total_tokens": 0
                            }
                        }
                    else:
                        raise HTTPException(status_code=500, detail=f"Failed to load {requested_model}")
                except Exception as e:
                    print(f"[Advanced] Request failed: {e}")
                    raise HTTPException(status_code=500, detail=str(e))
            
            # --- AUTO-START / SWITCH LOGIC ---
            if not self.inference_service.is_running():
                target_model = requested_model if requested_model else "moondream-2"
                print(f"DEBUG: Service stopped. Auto-starting {target_model}...")
                
                # Unload SDXL if present (Zombie Prevention)
                if sdxl_backend_new:
                    try: 
                        sdxl_backend_new.unload_backend()
                        print("[ZombiePrevention] Unloaded SDXL before auto-start")
                    except: pass
                
                # Check previous for unloading (edge case where service stopped but tracker has state)
                previous_model = self.config.get("current_model")
                
                if self.inference_service.start(target_model):
                     self.config.set("current_model", target_model)
                     
                     # TRACKER UPDATE
                     try:
                         if previous_model and previous_model != target_model:
                             model_memory_tracker.track_model_unload(previous_model)
                         
                         model_info = self.manifest_manager.get_models().get(target_model)
                         if model_info:
                             model_memory_tracker.track_model_load(target_model, model_info.name)
                     except Exception as e:
                         print(f"Warning: Failed to track auto-start: {e}")
                else:
                     raise HTTPException(status_code=500, detail="Failed to start model")

            current_model = self.config.get("current_model")

            # Auto-switch model if requested and different
            if requested_model and requested_model != current_model:
                available_models = list(self.manifest_manager.get_models().keys())
                sys.stderr.write(f'DEBUG: Switch requested. From: {current_model} To: {requested_model}\n')
                sys.stderr.write(f'DEBUG: requested_model repr: {repr(requested_model)}\n')
                sys.stderr.write(f'DEBUG: Available models repr: {repr(available_models)}\n')
                
                # Check directly
                is_in = requested_model in self.manifest_manager.get_models()
                sys.stderr.write(f'DEBUG: {requested_model} in models == {is_in}\n')

                if is_in:
                    sys.stderr.write(f'Auto-switching to requested model: {requested_model}\n')
                    try:
                        sdxl_backend_new.unload_backend()
                        print('[ZombiePrevention] Unloaded SDXL before switch')
                    except: pass

                    if self.inference_service.start(requested_model):
                         self.config.set('current_model', requested_model)
                         
                         # TRACKER UPDATE
                         try:
                             if current_model and current_model != requested_model:
                                 model_memory_tracker.track_model_unload(current_model)
                             
                             model_info = self.manifest_manager.get_models().get(requested_model)
                             if model_info:
                                 model_memory_tracker.track_model_load(requested_model, model_info.name)
                         except Exception as e:
                             print(f'Warning: Failed to track switch: {e}')
                    else:
                        raise HTTPException(status_code=500, detail=f'Failed to switch to model {requested_model}')
                else:
                    print(f'DEBUG: Requested model {requested_model} NOT FOUND in manifest.')
                    pass
                    pass

            model = current_model

            if not messages:
                raise HTTPException(status_code=400, detail="Messages required")

            # Extract last user message
            last_user_msg = None
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    last_user_msg = msg
                    break

            if not last_user_msg:
                raise HTTPException(status_code=400, detail="No user message found")

            content = last_user_msg.get("content", "")
            
            # Parse content for text and image
            prompt_text = ""
            image_url = None

            if isinstance(content, str):
                prompt_text = content
            elif isinstance(content, list):
                for item in content:
                    if item.get("type") == "text":
                        prompt_text += item.get("text", "")
                    elif item.get("type") == "image_url":
                        image_url = item.get("image_url", {}).get("url")

            # Determine function to call
            function_name = "caption"
            kwargs = {"stream": stream}

            if image_url:
                kwargs["image_url"] = image_url
                if prompt_text and prompt_text.lower().strip() not in ["describe this", "caption this", ""]:
                    function_name = "query"
                    kwargs["question"] = prompt_text
                else:
                    # Generic prompt or no prompt -> caption
                    function_name = "caption"
            else:
                # Text only
                raise HTTPException(status_code=400, detail="Image required for Moondream")

            # --- SMART VRAM MANAGEMENT START ---
            vram_mode = request.headers.get("X-VRAM-Mode", "balanced")
            if vram_mode in ["balanced", "low"]:
                # Ensure SDXL is unloaded to free space for Moondream
                if 'sdxl_backend_new' in sys.modules:
                    try:
                        # Only unload if it looks like it might be loaded (backend instance exists)
                        # But our unload_backend check is safe
                        print(f"DEBUG: Smart Switching (Mode: {vram_mode}) - Unloading SDXL before analysis...")
                        sys.modules['sdxl_backend_new'].unload_backend()
                    except Exception as e:
                        print(f"WARNING: Failed to unload SDXL: {e}")
            # --- SMART VRAM MANAGEMENT END ---

            # Execute with OOM Retry
            start_time = time.time()
            try:
                result = await self.inference_service.execute_function(
                    function_name, None, **kwargs
                )
            except Exception as e:
                # Check for OOM
                error_str = str(e).lower()
                if "out of memory" in error_str or "cuda" in error_str or "alloc" in error_str:
                    print(f"CRITICAL: OOM detected during Moondream analysis. Logic: Auto-Recovery. Error: {e}")
                    
                    # 1. Unload everything
                    self.unload_all_models()
                    
                    # 2. Restart Moondream Service
                    print(f"Re-initializing Moondream service for model: {model}")
                    if self.inference_service.start(model):
                        print("Service restarted. Retrying operation...")
                        # 3. Retry execution
                        result = await self.inference_service.execute_function(
                            function_name, None, **kwargs
                        )
                    else:
                        raise HTTPException(status_code=500, detail="OOM Recovery failed: Could not restart service.")
                else:
                    raise e


            # Handle Streaming
            if stream:
                return StreamingResponse(
                    self._sse_chat_generator(result, model), 
                    media_type="text/event-stream"
                )

            # Handle Standard Response
            response_text = ""
            if isinstance(result, dict):
                if "caption" in result:
                    response_text = result["caption"]
                elif "answer" in result:
                    response_text = result["answer"]
                else:
                    # Fallback to JSON string
                    response_text = json.dumps(result)
            else:
                response_text = str(result)

            return {
                "id": f"chatcmpl-{int(time.time())}",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": model,
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response_text
                    },
                    "finish_reason": "stop"
                }],
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": len(response_text.split()),
                    "total_tokens": len(response_text.split())
                }
            }

        except Exception as e:
            if self.analytics:
                self.analytics.track_error(type(e).__name__, str(e), "api_chat_completions")
            print(f"Error in chat_completions: {e}")
            raise HTTPException(status_code=500, detail=str(e))


    def _sse_chat_generator(self, raw_generator, model):
        """Convert generator to OpenAI-compatible SSE format"""
        yield f"data: {json.dumps({'id': f'chatcmpl-{int(time.time())}', 'object': 'chat.completion.chunk', 'created': int(time.time()), 'model': model, 'choices': [{'index': 0, 'delta': {'role': 'assistant', 'content': ''}, 'finish_reason': None}]})}\n\n"
        
        for token in raw_generator:
            chunk = {
                "id": f"chatcmpl-{int(time.time())}",
                "object": "chat.completion.chunk",
                "created": int(time.time()),
                "model": model,
                "choices": [{
                    "index": 0,
                    "delta": {"content": token},
                    "finish_reason": None
                }]
            }
            yield f"data: {json.dumps(chunk)}\n\n"

        yield f"data: {json.dumps({'id': f'chatcmpl-{int(time.time())}', 'object': 'chat.completion.chunk', 'created': int(time.time()), 'model': model, 'choices': [{'index': 0, 'delta': {}, 'finish_reason': 'stop'}]})}\n\n"
        yield "data: [DONE]\n\n"

    async def _handle_dynamic_request(self, request: Request, path: str):
        # --- PATCH: System Restart Endpoint ---
        if "system/restart" in path:
            print("[System] Received system/restart request.")
            
            def _restart_process():
                print("[System] Restarting server process in 1s...")
                time.sleep(1)
                python = sys.executable
                os.execl(python, python, *sys.argv)
            
            Thread(target=_restart_process, daemon=True).start()
            return JSONResponse({"status": "restarting"})
        # --------------------------------------

        if not self.inference_service.is_running():
            raise HTTPException(status_code=503, detail="Inference service not running")

        function_name = self._extract_function_name(path)
        kwargs = await self._extract_request_data(request)

        # Auto-switch model if requested and different
        requested_model = kwargs.get("model")
        current_model = self.config.get("current_model")

        if requested_model and requested_model != current_model:
            # Check if it's in Manifest OR Model Map
            is_valid_model = (requested_model in self.manifest_manager.get_models()) or (requested_model in MODEL_MAP)
            
            if is_valid_model:
                print(f"Auto-switching to requested model: {requested_model}")
                    
                # Unload SDXL if present (Zombie Prevention)
                if sdxl_backend_new:
                    try:
                        sdxl_backend_new.unload_backend()
                        print("[ZombiePrevention] Unloaded SDXL before auto-switch")
                    except: pass
                # Capture previous model for tracking unloading BEFORE switch
                previous_model_auto = self.config.get("current_model")
                
                if self.inference_service.start(requested_model):
                    self.config.set("current_model", requested_model)
                    current_model = requested_model
                    
                    # SYSTEM INTEGRATION: Track model switch in memory tracker
                    try:
                        # 1. Unload previous
                        if previous_model_auto and previous_model_auto != requested_model:
                            model_memory_tracker.track_model_unload(previous_model_auto)
                            print(f"[Tracker] Unloaded previous model on auto-switch: {previous_model_auto}")
                            
                        # 2. Load new
                        model_info = self.manifest_manager.get_models().get(requested_model)
                        if model_info:
                            model_memory_tracker.track_model_load(requested_model, model_info.name)
                            print(f"[Tracker] Tracked new model on auto-switch: {requested_model}")
                    except Exception as e:
                        print(f"[Tracker] Warning: Failed to track auto-switch: {e}")
                else:
                    raise HTTPException(status_code=500, detail=f"Failed to switch to model {requested_model}")
            else:
                raise HTTPException(status_code=404, detail=f"Model {requested_model} not found")

        timeout = kwargs.pop("timeout", None)
        if timeout:
            try:
                timeout = float(timeout)
            except (ValueError, TypeError):
                timeout = None

        # Check if streaming is requested
        stream = kwargs.get("stream", False)

        start_time = time.time()
        try:
            result = await self.inference_service.execute_function(
                function_name, timeout, **kwargs
            )

            # --- PATCH: OOM Check for non-raised errors ---
            if isinstance(result, dict) and result.get("error"):
                err_msg = str(result["error"])
                if "CUDA out of memory" in err_msg or "OutOfMemoryError" in err_msg:
                    # Force raise to trigger the OOM handler in the except block
                    raise Exception(f"CUDA out of memory: {err_msg}")
            # ---------------------------------------------

            # Record the request in session state
            if self.session_state:
                self.session_state.record_request(f"/{path}")

            success = not (isinstance(result, dict) and result.get("error"))

            # --- PATCH: Auto-Unload Logic ---
            # Check for header or env var to unload model after inference
            should_unload = request.headers.get("X-Auto-Unload") == "true" or \
                            os.environ.get("MOONDREAM_AUTO_UNLOAD") == "true"
            
            if should_unload:
                print(f"[System] Auto-unloading model (Reason: Auto-Unload requested)")
                # Run unload in a separate thread to avoid blocking the return
                Thread(target=self.inference_service.unload_model, daemon=True).start()
            # -------------------------------
        except Exception as e:
            # --- PATCH: OOM Logging & Auto-Restart ---
            error_str = str(e)
            if "CUDA out of memory" in error_str or "OutOfMemoryError" in type(e).__name__:
                print(f"\n{'='*40}")
                print(f"CRITICAL ERROR: GPU OOM Detected!")
                print(f"Error: {error_str}")
                print(f"{'='*40}\n")
                
                gpu_stats = "N/A"
                mem_stats = "N/A"

                # Run nvidia-smi
                print("[Diagnostics] Running nvidia-smi...")
                try:
                    proc_res = subprocess.run(["nvidia-smi"], capture_output=True, text=True, check=False)
                    gpu_stats = proc_res.stdout
                    print(gpu_stats)
                except Exception as log_err:
                    print(f"Failed to run nvidia-smi: {log_err}")
                    gpu_stats = f"Failed: {log_err}"

                # Capture Python process memory
                try:
                    process = psutil.Process(os.getpid())
                    mem_info = process.memory_info()
                    mem_stats = f"RSS={mem_info.rss / 1024 / 1024:.2f} MB, VMS={mem_info.vms / 1024 / 1024:.2f} MB"
                    print(f"[Diagnostics] Python Process Memory: {mem_stats}")
                except Exception as log_err:
                    print(f"Failed to get process memory: {log_err}")
                    mem_stats = f"Failed: {log_err}"

                # SEND TO APP LOG SERVER
                try:
                    # Extract Task Details
                    task_info = f"Function: {function_name}\nModel: {kwargs.get('model', 'unknown')}"
                    if 'prompt' in kwargs:
                        p = str(kwargs['prompt'])
                        task_info += f"\nPrompt: {p[:100]}..." if len(p) > 100 else f"\nPrompt: {p}"
                    if 'width' in kwargs and 'height' in kwargs:
                        task_info += f"\nResolution: {kwargs.get('width')}x{kwargs.get('height')}"
                    
                    log_payload = {
                        "level": "CRITICAL",
                        "context": "MoondreamBackend",
                        "message": f"OOM Crash in {function_name}! Auto-Restart Initiated.",
                        "stack": f"Error: {error_str}\n\nTask Details:\n{task_info}\n\nGPU Stats:\n{gpu_stats}\n\nProcess Mem: {mem_stats}" 
                    }
                    
                    req = urllib.request.Request(
                        "http://localhost:3001/log",
                        data=json.dumps(log_payload).encode('utf-8'),
                        headers={'Content-Type': 'application/json'}
                    )
                    urllib.request.urlopen(req, timeout=2)
                    print("[Diagnostics] Sent OOM report to App Log Server.")
                except Exception as log_send_err:
                    print(f"[Diagnostics] Failed to send log to app server: {log_send_err}")

                print("\n[System] Initiating EMERGENCY RESTART to recover from OOM...")
                print(f"{'='*40}\n")
                
                time.sleep(2)
                
                # Re-execute the current process
                python = sys.executable
                os.execl(python, python, *sys.argv)
            # -----------------------------------------

            if self.analytics:
                self.analytics.track_error(
                    type(e).__name__,
                    str(e),
                    f"api_{function_name}"
                )
            raise

        # Handle streaming response
        if stream and isinstance(result, dict) and not result.get("error"):
            # Look for any generator in result (any capability can stream)
            generator_key = None
            generator = None

            for key, value in result.items():
                if hasattr(value, "__iter__") and hasattr(value, "__next__"):
                    generator_key = key
                    generator = value
                    break

            if generator:
                event_generator = self._sse_event_generator(generator)
                return StreamingResponse(
                    event_generator, media_type="text/event-stream"
                )

        # Add token stats and analytics for non-streaming responses
        if isinstance(result, dict) and not result.get("error"):
            token_count = 0
            # Count tokens from any string result
            for key, value in result.items():
                if isinstance(value, str):
                    token_count += len(value.split())

            duration = time.time() - start_time
            if duration > 0 and token_count > 0:
                result["_stats"] = {
                    "tokens": token_count,
                    "duration": round(duration, 2),
                    "tokens_per_sec": round(token_count / duration, 1),
                }

            if self.analytics:
                self.analytics.track_api_call(
                    function_name,
                    duration,
                    tokens=token_count,
                    success=success,
                    model=self.config.get("current_model")
                )

        return JSONResponse(result)

    def _extract_function_name(self, path: str) -> str:
        path_parts = [p for p in path.split("/") if p]
        name = "index"
        
        if path_parts and path_parts[0] == "v1" and len(path_parts) > 1:
            name = path_parts[1]
        elif path_parts:
            name = path_parts[-1]
            
        # Alias mapping
        if name == "answer":
            return "query"
            
        return name

    async def _extract_request_data(self, request: Request) -> Dict[str, Any]:
        kwargs = {}

        content_type = request.headers.get("content-type", "")

        if "application/json" in content_type:
            try:
                body = await request.json()
                kwargs.update(body)
            except json.JSONDecodeError:
                pass
        elif "application/x-www-form-urlencoded" in content_type:
            form = await request.form()
            kwargs.update(dict(form))
        elif "multipart/form-data" in content_type:
            form = await request.form()
            for key, value in form.items():
                kwargs[key] = value

        kwargs.update(dict(request.query_params))

        kwargs["_headers"] = dict(request.headers)
        kwargs["_method"] = request.method

        return kwargs

    def unload_all_models(self):
        """Unloads both Moondream and SDXL to free maximum VRAM"""
        print("[System] Emergency Unload Triggered")
        try:
            if hasattr(self, "inference_service") and self.inference_service:
                self.inference_service.unload_model()
        except: pass
        
        try:
            if sdxl_backend_new:
                sdxl_backend_new.unload_backend()
        except: pass
        
        torch.cuda.empty_cache()
        import gc
        gc.collect()


    def start(self, host: str = "127.0.0.1", port: int = 2020) -> bool:
        if self.server_thread and self.server_thread.is_alive():
            return False

        current_model = self.config.get("current_model")
        if not current_model:
            return False

        if not self.inference_service.start(current_model):
            print(f"[Warning] Failed to start {current_model}. Continuing mostly for SDXL features.")

        try:
            config = uvicorn.Config(
                self.app,
                host=host,
                port=port,
                log_level="info",  # Suppress more logs
                access_log=False,
            )
            self.server = uvicorn.Server(config)

            self.server_thread = Thread(target=self._run_server, daemon=True)
            self.server_thread.start()

            time.sleep(1)

            return self.is_running()
        except Exception as e:
            print(f"Error starting server: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _run_server(self):
        try:
            asyncio.run(self.server.serve())
        except (Exception, asyncio.CancelledError):
            # Suppress normal shutdown errors
            pass

    def stop(self) -> bool:
        """Stop the REST server properly"""
        if self.server:
            # Signal server to stop
            self.server.should_exit = True

            # Force shutdown the server
            # if hasattr(self.server, "force_exit"):
            #     self.server.force_exit = True

        # Wait for server thread to finish
        if self.server_thread and self.server_thread.is_alive():
            self.server_thread.join(timeout=3)

            # If thread is still alive, something went wrong
            if self.server_thread.is_alive():
                import logging

                logging.warning("Server thread did not shut down cleanly")

        # Stop inference service
        if hasattr(self, "inference_service") and self.inference_service:
            try:
                # Run the async stop in a sync context
                import asyncio
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        # Create task if loop is running
                        asyncio.create_task(self.inference_service.stop())
                    else:
                        # Run directly if loop is not running
                        loop.run_until_complete(self.inference_service.stop())
                except RuntimeError:
                    # No event loop, run in new loop
                    asyncio.run(self.inference_service.stop())
            except Exception:
                pass

        # Clean up references
        self.server = None
        self.server_thread = None

        return True

    def is_running(self) -> bool:
        return (
            self.server_thread
            and self.server_thread.is_alive()
            and self.server
            and not self.server.should_exit
        )

if __name__ == "__main__":
    from moondream_station.core.config import ConfigManager as Config
    from moondream_station.core.manifest import ManifestManager
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=2020)
    args = parser.parse_args()

    config = Config()
    manifest_manager = ManifestManager(config)
    
    # Load Manifest
    manifest_path = os.path.join(MOONDREAM_PATH, "local_manifest.json")
    if os.path.exists(manifest_path):
        manifest_manager.load_manifest(manifest_path)
        print(f"[System] Loaded manifest from {manifest_path}")
    else:
        print(f"[Warning] Manifest not found at {manifest_path}")

    server = RestServer(config, manifest_manager)
    print(f"Starting Moondream Station on port {args.port}...")
    if server.start(port=args.port):
        print(f"Server started on port {args.port}")
        try:
            while server.is_running():
                time.sleep(1)
        except KeyboardInterrupt:
            print("Stopping server...")
            server.stop()
    else:
        print("Failed to start server")
