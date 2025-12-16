#!/usr/bin/env python3
"""
Patch to fix auto-switch tracking.

The previous patches only fixed explicit /v1/models/switch calls.
API calls that trigger auto-switching (e.g. captioning) were bypassing the tracker.

This patch adds tracking to the implicit auto-switch logic.

Usage:
    python3 patch_auto_switch_tracking.py
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
    
    # Identify the auto-switch block
    # It looks like:
    # if self.inference_service.start(requested_model):
    #     self.config.set("current_model", requested_model)
    #     current_model = requested_model
    
    # We want to insert tracking logic.
    
    old_block = '''                print(f"Auto-switching to requested model: {requested_model}")
                if self.inference_service.start(requested_model):
                    self.config.set("current_model", requested_model)
                    current_model = requested_model
                else:'''
    
    new_block = '''                print(f"Auto-switching to requested model: {requested_model}")
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
                else:'''
    
    if old_block in content:
        content = content.replace(old_block, new_block)
        print("✓ Patched implicit auto-switch logic")
    else:
        print("⚠️ Could not find exact auto-switch block match. Checking for variations...")
        # Try a slightly broader or narrower match if indentation varies
        old_block_compact = '''                if self.inference_service.start(requested_model):
                    self.config.set("current_model", requested_model)
                    current_model = requested_model'''
        
        if old_block_compact in content:
            # We found the core logic, let's construct the replacement relative to it
            new_block_compact = '''                # Capture previous for tracker
                previous_model_auto = self.config.get("current_model")
                
                if self.inference_service.start(requested_model):
                    self.config.set("current_model", requested_model)
                    current_model = requested_model
                    
                    # SYSTEM INTEGRATION: Track model switch
                    try:
                        if previous_model_auto and previous_model_auto != requested_model:
                            model_memory_tracker.track_model_unload(previous_model_auto)
                        
                        model_info = self.manifest_manager.get_models().get(requested_model)
                        if model_info:
                            model_memory_tracker.track_model_load(requested_model, model_info.name)
                    except Exception:
                        pass # Squelch tracker errors during auto-switch'''
            content = content.replace(old_block_compact, new_block_compact)
            print("✓ Patched implicit auto-switch logic (compact match)")
        else:
            print("❌ Failed to find auto-switch block!")
            return False

    # Write patched content
    backup_path = rest_server_path + '.backup8'
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
    
    return True

if __name__ == "__main__":
    print("🔧 Moondream Station - Auto-Switch Tracking Patch")
    print("=" * 60)
    
    if apply_patch():
        sys.exit(0)
    else:
        sys.exit(1)
