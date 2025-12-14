#!/usr/bin/env python3
"""
Patch to fix model unload tracking.

When a model is switched, the previous model should be unloaded from
the ModelMemoryTracker so only ONE model shows as loaded at a time.

Usage:
    python3 patch_model_unload_tracking.py
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
    if "# Unload previous model" in content and "model_memory_tracker.track_model_unload" in content:
        print("✅ Already patched - model unload tracking found")
        return True
    
    # Find the model switch integration we added earlier and enhance it
    old_tracking = '''                # Track model load for memory monitoring
                try:
                    model_info = self.manifest_manager.get_models().get(model_id)
                    if model_info:
                        model_memory_tracker.track_model_load(model_id, model_info.name)
                except Exception as e:
                    print(f"Warning: Failed to track model load: {e}")'''
    
    new_tracking = '''                # Unload previous model from tracker (only one model loaded at a time)
                try:
                    # Get current model before switching
                    previous_model = self.config.get("current_model")
                    if previous_model and previous_model != model_id:
                        model_memory_tracker.track_model_unload(previous_model)
                        print(f"Unloaded previous model from tracker: {previous_model}")
                except Exception as e:
                    print(f"Warning: Failed to unload previous model: {e}")
                
                # Track model load for memory monitoring
                try:
                    model_info = self.manifest_manager.get_models().get(model_id)
                    if model_info:
                        model_memory_tracker.track_model_load(model_id, model_info.name)
                except Exception as e:
                    print(f"Warning: Failed to track model load: {e}")'''
    
    if old_tracking not in content:
        print("❌ Could not find model tracking code to enhance")
        return False
    
    content = content.replace(old_tracking, new_tracking)
    
    # Also patch the auto-switch location
    old_auto_tracking = '''                        # Track model load for memory monitoring
                        try:
                            model_info = self.manifest_manager.get_models().get(requested_model)
                            if model_info:
                                model_memory_tracker.track_model_load(requested_model, model_info.name)
                        except Exception as e:
                            print(f"Warning: Failed to track model load: {e}")'''
    
    new_auto_tracking = '''                        # Unload previous model from tracker
                        try:
                            if current_model and current_model != requested_model:
                                model_memory_tracker.track_model_unload(current_model)
                                print(f"Unloaded previous model from tracker: {current_model}")
                        except Exception as e:
                            print(f"Warning: Failed to unload previous model: {e}")
                        
                        # Track model load for memory monitoring
                        try:
                            model_info = self.manifest_manager.get_models().get(requested_model)
                            if model_info:
                                model_memory_tracker.track_model_load(requested_model, model_info.name)
                        except Exception as e:
                            print(f"Warning: Failed to track model load: {e}")'''
    
    if old_auto_tracking in content:
        content = content.replace(old_auto_tracking, new_auto_tracking)
        print("✓ Also patched auto-switch location")
    
    # Write patched content
    backup_path = rest_server_path + '.backup4'
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
    print("   2. Click 'Test Load' button again")
    print("   3. Only ONE model should show 🟢 at a time")
    print("   4. VRAM values should be accurate per model")
    
    return True

if __name__ == "__main__":
    print("🔧 Moondream Station - Model Unload Tracking Patch")
    print("=" * 60)
    
    if apply_patch():
        sys.exit(0)
    else:
        sys.exit(1)
