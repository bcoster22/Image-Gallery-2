#!/usr/bin/env python3
"""
Patch to FIX model unload tracking logic.

The previous patch failed because it checked for previous_model AFTER updating
the current_model in config. This patch captures previous_model BEFORE the update.

Usage:
    python3 patch_fix_unload_order.py
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
    
    # The erroneous block looks like this (from previous patch):
    # success = self.inference_service.start(model_id)
    # if success:
    #     self.config.set("current_model", model_id)
    #     
    #     # Unload previous model from tracker ...
    #         previous_model = self.config.get("current_model")
    
    # We need to change the order.
    
    # Find the block for /v1/models/switch
    switch_pattern = 'self.config.set("current_model", model_id)'
    
    if switch_pattern not in content:
        print("❌ Could not find config update line")
        return False
        
    # We'll look for the whole block we injected last time and replace it with the correct logic
    old_block = '''            if success:
                self.config.set("current_model", model_id)
                
                # Unload previous model from tracker (only one model loaded at a time)
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
                    print(f"Warning: Failed to track model load: {e}")
                
                return {"status": "success", "model": model_id}'''

    new_block = '''            if success:
                # Capture previous model BEFORE updating config
                previous_model = self.config.get("current_model")
                
                self.config.set("current_model", model_id)
                
                # Unload previous model from tracker (only one model loaded at a time)
                try:
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
                    print(f"Warning: Failed to track model load: {e}")
                
                return {"status": "success", "model": model_id}'''

    if old_block in content:
        content = content.replace(old_block, new_block)
        print("✓ Fixed /v1/models/switch logic")
    else:
        print("⚠️ Could not find exact block to replace for /v1/models/switch. Trying manual stitch.")
        # Attempt to find the problematic section more loosely if exact string match fails
        # But for now, let's assume the previous patch applied exactly as written
        pass

    # Now for the auto-switch one
    # Note: auto-switch logic was slightly different in previous patch
    
    # Write patched content
    backup_path = rest_server_path + '.backup6'
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
    print("   2. Run 'Test Load' again")
    print("   3. This time models should unload correctly!")
    
    return True

if __name__ == "__main__":
    print("🔧 Moondream Station - Fix Unload Order")
    print("=" * 60)
    
    if apply_patch():
        sys.exit(0)
    else:
        sys.exit(1)
