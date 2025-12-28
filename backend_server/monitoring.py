import os
import time
import psutil
import torch
import requests
try:
    import pynvml
except ImportError:
    pynvml = None

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
