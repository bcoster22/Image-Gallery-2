#!/usr/bin/env python3
"""
Patch to add Ghost/Zombie Model Detection to ModelMemoryTracker.

This patch upgrades the ModelMemoryTracker class to calculate "Ghost VRAM"
(Unaccounted VRAM usage > expected usage) and exposes it via /metrics.

Usage:
    python3 patch_ghost_detection.py
"""

import os
import sys

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
    
    # 1. Add EXPECTED_VRAM constants and update ModelMemoryTracker
    # We replace the entire class to ensure clean logic
    old_class_start = 'class ModelMemoryTracker:'
    
    new_class = '''class ModelMemoryTracker:
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
                print(f"[Tracker] ZOMBIE DETECTED! Expected: {expected_total_vram}MB, Actual: {effective_vram:.0f}MB, Ghost: {variance:.0f}MB")
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
        return self.last_known_vram.get(model_id, 0)'''

    # Pattern match existing class (finding end is tricky with python indentation, 
    # but we can assume it ends before 'class RestServer' or similar)
    # Actually, let's use a robust replacement for the whole class block if possible
    # or just regex replace key methods.
    
    # Since previous patches might have changed indentation/content, replacing the whole class 
    # blindly is risky unless we match specific content. 
    # Ideally, we used `patch_model_memory_tracking.py` previously.
    
    # Let's target the __init__ and update_memory_usage specifically? 
    # No, adding new methods requires class level context.
    
    # Strategy: Find lines from "class ModelMemoryTracker:" down to "# Global tracker instance"
    # and replace them.
    
    import re
    pattern = re.compile(r'class ModelMemoryTracker:.*?# Global tracker instance', re.DOTALL)
    
    # Check if match exists
    match = pattern.search(content)
    if match:
        print("✓ Found ModelMemoryTracker block")
        replacement = new_class + "\n\n# Global tracker instance"
        content = content.replace(match.group(0), replacement)
    else:
        print("⚠️  Could not find ModelMemoryTracker block via Regex. Trying simpler hook.")
        return False

    # 2. Update /metrics endpoint to include ghost info
    # Target: loaded_models = model_memory_tracker.get_loaded_models()
    # Inject: ghost_status = model_memory_tracker.get_ghost_status()
    
    metric_hook = 'loaded_models = model_memory_tracker.get_loaded_models()'
    metric_injection = '''loaded_models = model_memory_tracker.get_loaded_models()
                ghost_status = model_memory_tracker.get_ghost_status()'''
    
    if metric_hook in content:
        content = content.replace(metric_hook, metric_injection)
        print("✓ Injected ghost status retrieval in /metrics")
    else:
        print("⚠️  Could not find metrics hook")

    # Target: "loaded_models": loaded_models
    # Inject: "loaded_models": loaded_models, "ghost_memory": ghost_status
    
    json_hook = '"loaded_models": loaded_models'
    json_injection = '"loaded_models": loaded_models,\n                    "ghost_memory": ghost_status'
    
    if json_hook in content:
        content = content.replace(json_hook, json_injection)
        print("✓ Injected ghost field in JSON response")
    else:
        print("⚠️  Could not find JSON return hook")

    # Write patched content
    backup_path = rest_server_path + '.backup_ghost'
    print(f"💾 Creating backup at {backup_path}")
    with open(backup_path, 'w') as f:
        with open(rest_server_path, 'r') as orig:
            f.write(orig.read())
    
    print(f"✍️  Writing patched content")
    with open(rest_server_path, 'w') as f:
        f.write(content)
    
    print("✅ Patch applied successfully!")
    return True

if __name__ == "__main__":
    print("👻 Moondream Station - Ghost Detection Patch")
    print("=" * 60)
    
    if apply_patch():
        sys.exit(0)
    else:
        sys.exit(1)
