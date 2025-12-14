#!/usr/bin/env python3
"""
Patch to add last_known_vram_mb tracking to ModelMemoryTracker.

This allows the UI to show how much VRAM each model used last time it was loaded,
even when the model is currently unloaded.

Usage:
    python3 patch_model_last_vram.py
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
    
    # Check if already patched
    if "last_known_vram" in content:
        print("✅ Already patched - last_known_vram found")
        return True
    
    # Find and replace the ModelMemoryTracker __init__ method
    old_init = '''class ModelMemoryTracker:
    """Track memory usage per loaded model"""
    def __init__(self):
        self.loaded_models = {}  # model_id -> {name, vram_mb, ram_mb, loaded_at, process}
        self.base_vram = 0
        self.base_ram = 0'''
    
    new_init = '''class ModelMemoryTracker:
    """Track memory usage per loaded model"""
    def __init__(self):
        self.loaded_models = {}  # model_id -> {name, vram_mb, ram_mb, loaded_at, process}
        self.last_known_vram = {}  # model_id -> vram_mb (persists after unload)
        self.base_vram = 0
        self.base_ram = 0'''
    
    if old_init not in content:
        print("❌ Could not find ModelMemoryTracker __init__ to patch")
        return False
    
    content = content.replace(old_init, new_init)
    
    # Update track_model_load to save last_known_vram
    old_track_load = '''            self.loaded_models[model_id] = {
                "id": model_id,
                "name": model_name,
                "vram_mb": int(vram_mb),
                "ram_mb": int(ram_mb),
                "loaded_at": int(time.time())
            }
            print(f"Tracked model load: {model_id} - VRAM: {vram_mb:.0f}MB, RAM: {ram_mb:.0f}MB")'''
    
    new_track_load = '''            self.loaded_models[model_id] = {
                "id": model_id,
                "name": model_name,
                "vram_mb": int(vram_mb),
                "ram_mb": int(ram_mb),
                "loaded_at": int(time.time())
            }
            self.last_known_vram[model_id] = int(vram_mb)
            print(f"Tracked model load: {model_id} - VRAM: {vram_mb:.0f}MB, RAM: {ram_mb:.0f}MB")'''
    
    if old_track_load not in content:
        print("❌ Could not find track_model_load to patch")
        return False
    
    content = content.replace(old_track_load, new_track_load)
    
    # Update update_memory_usage to save last_known_vram
    old_update = '''                for model_id in self.loaded_models:
                    self.loaded_models[model_id]["vram_mb"] = int(vram_per_model)
                    self.loaded_models[model_id]["ram_mb"] = int(ram_per_model)'''
    
    new_update = '''                for model_id in self.loaded_models:
                    self.loaded_models[model_id]["vram_mb"] = int(vram_per_model)
                    self.loaded_models[model_id]["ram_mb"] = int(ram_per_model)
                    self.last_known_vram[model_id] = int(vram_per_model)'''
    
    if old_update not in content:
        print("❌ Could not find update_memory_usage to patch")
        return False
    
    content = content.replace(old_update, new_update)
    
    # Add get_last_known_vram method
    old_get_loaded = '''    def get_loaded_models(self):
        """Get list of loaded models with memory info"""
        self.update_memory_usage()
        return list(self.loaded_models.values())'''
    
    new_get_loaded = '''    def get_loaded_models(self):
        """Get list of loaded models with memory info"""
        self.update_memory_usage()
        return list(self.loaded_models.values())
    
    def get_last_known_vram(self, model_id: str) -> int:
        """Get last known VRAM usage for a model (even if unloaded)"""
        return self.last_known_vram.get(model_id, 0)'''
    
    if old_get_loaded not in content:
        print("❌ Could not find get_loaded_models to patch")
        return False
    
    content = content.replace(old_get_loaded, new_get_loaded)
    
    # Update /v1/models endpoint to include last_known_vram_mb
    # Find the list_models function and update it
    old_models_return = '''                return {
                    "models": [
                        {
                            "id": model_id,
                            "name": model_info.name,
                            "description": model_info.description,
                            "version": getattr(model_info, "version", "unknown"),
                        }
                        for model_id, model_info in models.items()
                    ]
                }'''
    
    new_models_return = '''                return {
                    "models": [
                        {
                            "id": model_id,
                            "name": model_info.name,
                            "description": model_info.description,
                            "version": getattr(model_info, "version", "unknown"),
                            "last_known_vram_mb": model_memory_tracker.get_last_known_vram(model_id),
                        }
                        for model_id, model_info in models.items()
                    ]
                }'''
    
    if old_models_return in content:
        content = content.replace(old_models_return, new_models_return)
    else:
        print("⚠️  Could not find /v1/models return to patch - will skip this part")
    
    # Write patched content
    backup_path = rest_server_path + '.backup2'
    print(f"💾 Creating backup at {backup_path}")
    with open(backup_path, 'w') as f:
        with open(rest_server_path, 'r') as orig:
            f.write(orig.read())
    
    print(f"✍️  Writing patched content")
    with open(rest_server_path, 'w') as f:
        f.write(content)
    
    print("✅ Patch applied successfully!")
    print("\n📋 Next steps:")
    print("   1. Restart moondream-station server")
    print("   2. Load a model and check VRAM usage")
    print("   3. Unload the model - last_known_vram_mb should persist")
    print("   4. Check /v1/models endpoint for last_known_vram_mb field")
    
    return True

if __name__ == "__main__":
    print("🔧 Moondream Station - Last Known VRAM Patch")
    print("=" * 60)
    
    if apply_patch():
        sys.exit(0)
    else:
        sys.exit(1)
