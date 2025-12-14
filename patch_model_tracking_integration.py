#!/usr/bin/env python3
"""
Patch to integrate ModelMemoryTracker with model switching.

This ensures that when models are loaded via /v1/models/switch,
the ModelMemoryTracker.track_model_load() is called to record VRAM usage.

Usage:
    python3 patch_model_tracking_integration.py
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
    if "model_memory_tracker.track_model_load" in content:
        print("✅ Already patched - track_model_load integration found")
        return True
    
    # Find the /v1/models/switch endpoint and add tracking
    old_switch = '''            success = self.inference_service.start(model_id)
            if success:
                self.config.set("current_model", model_id)
                return {"status": "success", "model": model_id}'''
    
    new_switch = '''            success = self.inference_service.start(model_id)
            if success:
                self.config.set("current_model", model_id)
                
                # Track model load for memory monitoring
                try:
                    model_info = self.manifest_manager.get_models().get(model_id)
                    if model_info:
                        model_memory_tracker.track_model_load(model_id, model_info.name)
                except Exception as e:
                    print(f"Warning: Failed to track model load: {e}")
                
                return {"status": "success", "model": model_id}'''
    
    if old_switch not in content:
        print("❌ Could not find /v1/models/switch success block to patch")
        print("Trying alternative pattern...")
        
        # Try alternative pattern
        old_switch_alt = '''                if self.inference_service.start(requested_model):
                        self.config.set("current_model", requested_model)
                        current_model = requested_model'''
        
        new_switch_alt = '''                if self.inference_service.start(requested_model):
                        self.config.set("current_model", requested_model)
                        current_model = requested_model
                        
                        # Track model load for memory monitoring
                        try:
                            model_info = self.manifest_manager.get_models().get(requested_model)
                            if model_info:
                                model_memory_tracker.track_model_load(requested_model, model_info.name)
                        except Exception as e:
                            print(f"Warning: Failed to track model load: {e}")'''
        
        if old_switch_alt in content:
            content = content.replace(old_switch_alt, new_switch_alt)
            print("✓ Applied patch to auto-switch block")
        else:
            print("❌ Could not find model switch pattern to patch")
            return False
    else:
        content = content.replace(old_switch, new_switch)
        print("✓ Applied patch to /v1/models/switch endpoint")
    
    # Write patched content
    backup_path = rest_server_path + '.backup3'
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
    print("   2. Click 'Test Load' button")
    print("   3. Watch VRAM graph and models list update")
    print("   4. Check console for 'Tracked model load' messages")
    
    return True

if __name__ == "__main__":
    print("🔧 Moondream Station - Model Tracking Integration Patch")
    print("=" * 60)
    
    if apply_patch():
        sys.exit(0)
    else:
        sys.exit(1)
