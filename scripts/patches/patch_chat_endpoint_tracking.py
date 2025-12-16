#!/usr/bin/env python3
"""
Patch to fix auto-switch tracking in /v1/chat/completions.

The chat completion endpoint has its own independent auto-start and auto-switch logic
that was missed by previous patches. This is why captioning/querying was switching 
models without updating the tracker.

Usage:
    python3 patch_chat_endpoint_tracking.py
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
    
    # Target Block 1: Auto-start logic in _handle_chat_completion
    old_start = '''            # --- AUTO-START / SWITCH LOGIC ---
            if not self.inference_service.is_running():
                target_model = requested_model if requested_model else "moondream-2"
                print(f"DEBUG: Service stopped. Auto-starting {target_model}...")
                if self.inference_service.start(target_model):
                     self.config.set("current_model", target_model)
                else:
                     raise HTTPException(status_code=500, detail="Failed to start model")'''
                     
    new_start = '''            # --- AUTO-START / SWITCH LOGIC ---
            if not self.inference_service.is_running():
                target_model = requested_model if requested_model else "moondream-2"
                print(f"DEBUG: Service stopped. Auto-starting {target_model}...")
                
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
                     raise HTTPException(status_code=500, detail="Failed to start model")'''
    
    if old_start in content:
        content = content.replace(old_start, new_start)
        print("✓ Patched chat completion auto-start logic")
    else:
        print("⚠️  Could not find exact auto-start logic match")
    
    # Target Block 2: Auto-switch logic in _handle_chat_completion
    # This is the critical one for "switched to Moondream but UI didn't update"
    old_switch = '''            # Auto-switch model if requested and different
            if requested_model and requested_model != current_model:
                if requested_model in self.manifest_manager.get_models():
                    print(f"Auto-switching to requested model: {requested_model}")
                    if self.inference_service.start(requested_model):
                        self.config.set("current_model", requested_model)
                        current_model = requested_model
                    else:
                        raise HTTPException(status_code=500, detail=f"Failed to switch to model {requested_model}")'''
                        
    new_switch = '''            # Auto-switch model if requested and different
            if requested_model and requested_model != current_model:
                if requested_model in self.manifest_manager.get_models():
                    print(f"Auto-switching to requested model: {requested_model}")
                    
                    # Capture previous for unload
                    previous_before_switch = current_model
                    
                    if self.inference_service.start(requested_model):
                        self.config.set("current_model", requested_model)
                        current_model = requested_model
                        
                        # TRACKER UPDATE
                        try:
                            if previous_before_switch:
                                model_memory_tracker.track_model_unload(previous_before_switch)
                                print(f"[Tracker] Auto-switch unloaded: {previous_before_switch}")
                                
                            model_info = self.manifest_manager.get_models().get(requested_model)
                            if model_info:
                                model_memory_tracker.track_model_load(requested_model, model_info.name)
                                print(f"[Tracker] Auto-switch loaded: {requested_model}")
                        except Exception as e:
                            print(f"Warning: Failed to track auto-switch: {e}")
                    else:
                        raise HTTPException(status_code=500, detail=f"Failed to switch to model {requested_model}")'''

    if old_switch in content:
        content = content.replace(old_switch, new_switch)
        print("✓ Patched chat completion auto-switch logic")
    else:
        print("⚠️  Could not find exact auto-switch logic match")
        
    # Write patched content
    backup_path = rest_server_path + '.backup9'
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
    print("   2. Try captioning again - UI should now update!")
    
    return True

if __name__ == "__main__":
    print("🔧 Moondream Station - Chat Endpoint Tracker Patch")
    print("=" * 60)
    
    if apply_patch():
        sys.exit(0)
    else:
        sys.exit(1)
