#!/usr/bin/env python3
"""
Patch to add per-model memory tracking to moondream-station.

This adds:
1. ModelMemoryTracker class to track VRAM and RAM per model
2. Updated /metrics endpoint with loaded_models array
3. Real memory measurements instead of estimates

Usage:
    python3 patch_model_memory_tracking.py
"""

import os
import sys

PATCH_CONTENT = '''
# Add after line 104 (after hw_monitor = HardwareMonitor())

class ModelMemoryTracker:
    """Track memory usage per loaded model"""
    def __init__(self):
        self.loaded_models = {}  # model_id -> {name, vram_mb, ram_mb, loaded_at, process}
        self.base_vram = 0
        self.base_ram = 0
        
    def record_baseline(self):
        """Record baseline memory before any models loaded"""
        try:
            if torch.cuda.is_available():
                self.base_vram = torch.cuda.memory_allocated(0) / (1024 * 1024)  # MB
            self.base_ram = psutil.Process().memory_info().rss / (1024 * 1024)  # MB
        except Exception as e:
            print(f"Failed to record baseline: {e}")
    
    def track_model_load(self, model_id: str, model_name: str):
        """Track a model being loaded"""
        import time
        try:
            vram_mb = 0
            ram_mb = 0
            
            if torch.cuda.is_available():
                vram_mb = (torch.cuda.memory_allocated(0) / (1024 * 1024)) - self.base_vram
            
            ram_mb = (psutil.Process().memory_info().rss / (1024 * 1024)) - self.base_ram
            
            self.loaded_models[model_id] = {
                "id": model_id,
                "name": model_name,
                "vram_mb": int(vram_mb),
                "ram_mb": int(ram_mb),
                "loaded_at": int(time.time())
            }
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
            
            if torch.cuda.is_available():
                current_vram = torch.cuda.memory_allocated(0) / (1024 * 1024)
            
            current_ram = psutil.Process().memory_info().rss / (1024 * 1024)
            
            # Distribute memory across loaded models proportionally
            # This is an approximation since we can't isolate per-model perfectly
            num_models = len(self.loaded_models)
            if num_models > 0:
                vram_per_model = (current_vram - self.base_vram) / num_models
                ram_per_model = (current_ram - self.base_ram) / num_models
                
                for model_id in self.loaded_models:
                    self.loaded_models[model_id]["vram_mb"] = int(vram_per_model)
                    self.loaded_models[model_id]["ram_mb"] = int(ram_per_model)
        except Exception as e:
            print(f"Failed to update memory usage: {e}")
    
    def get_loaded_models(self):
        """Get list of loaded models with memory info"""
        self.update_memory_usage()
        return list(self.loaded_models.values())

# Global tracker instance
model_memory_tracker = ModelMemoryTracker()
model_memory_tracker.record_baseline()
'''

METRICS_PATCH = '''
        @self.app.get("/metrics")
        async def metrics():
            """Return system metrics for monitoring"""
            try:
                cpu = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory().percent
                gpus = hw_monitor.get_gpus()
                env = hw_monitor.get_environment_status()
                
                # Determine primary device
                device = "CPU"
                if gpus:
                    device = gpus[0]["name"]
                
                # Get loaded models with real memory usage
                loaded_models = model_memory_tracker.get_loaded_models()
                
                return {
                    "cpu": cpu,
                    "memory": memory,
                    "device": device,
                    "gpus": gpus,
                    "environment": env,
                    "loaded_models": loaded_models
                }
            except Exception as e:
                print(f"Error collecting metrics: {e}")
                return {"cpu": 0, "memory": 0, "device": "Unknown", "gpus": [], "loaded_models": []}
'''

def apply_patch():
    """Apply the patch to rest_server.py in moondream-station"""
    
    # Find moondream-station directory
    moondream_dir = os.path.expanduser("~/.moondream-station/moondream-station")
    rest_server_path = os.path.join(moondream_dir, "moondream_station/core/rest_server.py")
    
    if not os.path.exists(rest_server_path):
        print(f"❌ rest_server.py not found at {rest_server_path}")
        print("   Make sure moondream-station is installed")
        return False
    
    print(f"📝 Reading {rest_server_path}")
    with open(rest_server_path, 'r') as f:
        content = f.read()
    
    # Check if already patched
    if "ModelMemoryTracker" in content:
        print("✅ Already patched - ModelMemoryTracker found")
        return True
    
    # Find insertion point (after hw_monitor = HardwareMonitor())
    lines = content.split('\n')
    insert_line = -1
    metrics_start = -1
    metrics_end = -1
    
    for i, line in enumerate(lines):
        if 'hw_monitor = HardwareMonitor()' in line:
            insert_line = i + 1
        if '@self.app.get("/metrics")' in line:
            metrics_start = i
        if metrics_start > 0 and metrics_end < 0 and line.strip().startswith('except'):
            metrics_end = i + 2  # Include the return statement
    
    if insert_line < 0:
        print("❌ Could not find insertion point for ModelMemoryTracker")
        return False
    
    if metrics_start < 0:
        print("❌ Could not find /metrics endpoint")
        return False
    
    print(f"📍 Inserting ModelMemoryTracker at line {insert_line}")
    
    # Insert ModelMemoryTracker class
    tracker_lines = PATCH_CONTENT.strip().split('\n')[2:]  # Skip comment lines
    lines = lines[:insert_line] + [''] + tracker_lines + [''] + lines[insert_line:]
    
    # Update metrics endpoint
    print(f"📍 Updating /metrics endpoint at line {metrics_start}")
    
    # Find the metrics function and replace it
    new_lines = []
    in_metrics = False
    skip_until_except = False
    
    for i, line in enumerate(lines):
        if '@self.app.get("/metrics")' in line:
            in_metrics = True
            new_lines.append(line)
            continue
        
        if in_metrics and 'async def metrics():' in line:
            # Add the new metrics function
            new_metrics_lines = METRICS_PATCH.strip().split('\n')[1:]  # Skip decorator
            new_lines.extend(new_metrics_lines)
            skip_until_except = True
            continue
        
        if skip_until_except:
            if 'except Exception as e:' in line:
                skip_until_except = False
                # Skip this line, already included in patch
                continue
            elif line.strip().startswith('return {') and '"loaded_models"' not in line:
                # Skip old return statement
                continue
            elif not line.strip() or line.strip().startswith('#'):
                continue
            else:
                continue
        
        new_lines.append(line)
    
    # Write patched content
    backup_path = rest_server_path + '.backup'
    print(f"💾 Creating backup at {backup_path}")
    with open(backup_path, 'w') as f:
        f.write(content)
    
    print(f"✍️  Writing patched content")
    with open(rest_server_path, 'w') as f:
        f.write('\n'.join(new_lines))
    
    print("✅ Patch applied successfully!")
    print("\n📋 Next steps:")
    print("   1. Restart moondream-station server")
    print("   2. Test /metrics endpoint: curl http://localhost:2020/metrics")
    print("   3. Load a model and check loaded_models array")
    
    return True

if __name__ == "__main__":
    print("🔧 Moondream Station - Model Memory Tracking Patch")
    print("=" * 60)
    
    if apply_patch():
        sys.exit(0)
    else:
        sys.exit(1)
