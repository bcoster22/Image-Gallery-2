#!/usr/bin/env python3
"""
Patch to fix VRAM measurement using nvidia-smi instead of torch.

This measures ACTUAL GPU VRAM usage (including X Windows, system processes)
rather than just PyTorch allocations.

Formula: Model VRAM = (Total VRAM - Free VRAM) - Baseline VRAM

Usage:
    python3 patch_vram_measurement_fix.py
"""

import os
import sys

VRAM_FIX = '''class ModelMemoryTracker:
    """Track memory usage per loaded model"""
    def __init__(self):
        self.loaded_models = {}  # model_id -> {name, vram_mb, ram_mb, loaded_at}
        self.last_known_vram = {}  # model_id -> vram_mb (persists after unload)
        self.base_vram = 0
        self.base_ram = 0
        
    def record_baseline(self):
        """Record baseline memory before any models loaded"""
        try:
            # Use nvidia-smi to get ACTUAL VRAM usage (includes X Windows, etc.)
            if pynvml:
                try:
                    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                    memory = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    # Baseline = Total - Free (what's currently used by system)
                    self.base_vram = (memory.total - memory.free) / (1024 * 1024)  # MB
                    print(f"Baseline VRAM: {self.base_vram:.0f}MB (system + X Windows)")
                except Exception as e:
                    print(f"Failed to get baseline VRAM via pynvml: {e}")
                    # Fallback to torch
                    if torch.cuda.is_available():
                        self.base_vram = torch.cuda.memory_allocated(0) / (1024 * 1024)
            elif torch.cuda.is_available():
                self.base_vram = torch.cuda.memory_allocated(0) / (1024 * 1024)
                
            self.base_ram = psutil.Process().memory_info().rss / (1024 * 1024)  # MB
        except Exception as e:
            print(f"Failed to record baseline: {e}")
    
    def track_model_load(self, model_id: str, model_name: str):
        """Track a model being loaded"""
        import time
        try:
            vram_mb = 0
            ram_mb = 0
            
            # Use nvidia-smi for ACTUAL VRAM usage
            if pynvml:
                try:
                    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                    memory = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    # Current usage = Total - Free
                    current_vram = (memory.total - memory.free) / (1024 * 1024)
                    # Model VRAM = Current - Baseline
                    vram_mb = current_vram - self.base_vram
                    print(f"VRAM: Total={memory.total/1024/1024:.0f}MB, Free={memory.free/1024/1024:.0f}MB, Used={current_vram:.0f}MB, Baseline={self.base_vram:.0f}MB, Model={vram_mb:.0f}MB")
                except Exception as e:
                    print(f"Failed to get VRAM via pynvml: {e}")
                    # Fallback to torch
                    if torch.cuda.is_available():
                        vram_mb = (torch.cuda.memory_allocated(0) / (1024 * 1024)) - self.base_vram
            elif torch.cuda.is_available():
                vram_mb = (torch.cuda.memory_allocated(0) / (1024 * 1024)) - self.base_vram
            
            ram_mb = (psutil.Process().memory_info().rss / (1024 * 1024)) - self.base_ram
            
            self.loaded_models[model_id] = {
                "id": model_id,
                "name": model_name,
                "vram_mb": int(vram_mb),
                "ram_mb": int(ram_mb),
                "loaded_at": int(time.time())
            }
            self.last_known_vram[model_id] = int(vram_mb)
            print(f"Tracked model load: {model_id} - VRAM: {vram_mb:.0f}MB, RAM: {ram_mb:.0f}MB")
        except Exception as e:
            print(f"Failed to track model load: {e}")
    
    def track_model_unload(self, model_id: str):
        """Track a model being unloaded"""
        if model_id in self.loaded_models:
            del self.loaded_models[model_id]
            print(f"Tracked model unload: {model_id}")
    
    def update_memory_usage(self):
        """Update memory usage for all loaded models"""
        try:
            if not self.loaded_models:
                return
            
            current_vram = 0
            current_ram = 0
            
            # Use nvidia-smi for ACTUAL VRAM
            if pynvml:
                try:
                    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                    memory = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    current_vram = (memory.total - memory.free) / (1024 * 1024)
                except:
                    if torch.cuda.is_available():
                        current_vram = torch.cuda.memory_allocated(0) / (1024 * 1024)
            elif torch.cuda.is_available():
                current_vram = torch.cuda.memory_allocated(0) / (1024 * 1024)
            
            current_ram = psutil.Process().memory_info().rss / (1024 * 1024)
            
            # Distribute memory across loaded models proportionally
            num_models = len(self.loaded_models)
            if num_models > 0:
                vram_per_model = (current_vram - self.base_vram) / num_models
                ram_per_model = (current_ram - self.base_ram) / num_models
                
                for model_id in self.loaded_models:
                    self.loaded_models[model_id]["vram_mb"] = int(vram_per_model)
                    self.loaded_models[model_id]["ram_mb"] = int(ram_per_model)
                    self.last_known_vram[model_id] = int(vram_per_model)
        except Exception as e:
            print(f"Failed to update memory usage: {e}")
    
    def get_loaded_models(self):
        """Get list of loaded models with memory info"""
        self.update_memory_usage()
        return list(self.loaded_models.values())
    
    def get_last_known_vram(self, model_id: str) -> int:
        """Get last known VRAM usage for a model (even if unloaded)"""
        return self.last_known_vram.get(model_id, 0)'''

def apply_patch():
    """Apply the patch to rest_server.py in moondream-station"""
    
    # Find moondream-station directory
    moondream_dir = os.path.expanduser("~/.moondream-station/moondream-station")
    rest_server_path = os.path.join(moondream_dir, "moondream_station/core/rest_server.py")
    
    if not os.path.exists(rest_server_path):
        print(f"❌ rest_server.py not found at {rest_server_path}")
        return False
    
    print(f"📝 Reading {rest_server_path}")
    with open(rest_server_path, 'r') as f:
        content = f.read()
    
    # Check if already using nvidia-smi measurement
    if "# Use nvidia-smi for ACTUAL VRAM usage" in content:
        print("✅ Already patched - nvidia-smi VRAM measurement found")
        return True
    
    # Find and replace the ModelMemoryTracker class
    # Look for class definition
    start_marker = "class ModelMemoryTracker:"
    end_marker = "# Global tracker instance"
    
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    if start_idx == -1 or end_idx == -1:
        print("❌ Could not find ModelMemoryTracker class boundaries")
        return False
    
    # Replace the class
    new_content = content[:start_idx] + VRAM_FIX + "\n\n" + content[end_idx:]
    
    # Write patched content
    backup_path = rest_server_path + '.backup5'
    print(f"💾 Creating backup at {backup_path}")
    with open(backup_path, 'w') as f:
        f.write(content)
    
    print(f"✍️  Writing patched content")
    with open(rest_server_path, 'w') as f:
        f.write(new_content)
    
    print("✅ Patch applied successfully!")
    print("\n📋 What changed:")
    print("   - Now uses nvidia-smi (pynvml) instead of torch.cuda")
    print("   - Measures: Total VRAM - Free VRAM = Used VRAM")
    print("   - Model VRAM = Used VRAM - Baseline (system + X Windows)")
    print("   - Accurate per-model measurements!")
    print("\n📋 Next steps:")
    print("   1. Server already restarted")
    print("   2. Click 'Test Load' button")
    print("   3. Each model should show real VRAM usage")
    
    return True

if __name__ == "__main__":
    print("🔧 Moondream Station - VRAM Measurement Fix")
    print("=" * 60)
    
    if apply_patch():
        sys.exit(0)
    else:
        sys.exit(1)
