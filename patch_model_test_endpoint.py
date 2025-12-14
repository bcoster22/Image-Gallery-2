#!/usr/bin/env python3
"""
Patch to IMPROVE /v1/models/switch endpoint.

1. Fixes unload logic (capture previous_model before update).
2. Returns VRAM/RAM usage in the response so frontend gets immediate feedback.

Usage:
    python3 patch_model_test_endpoint.py
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
    
    # We want to replace the switch block with a comprehensive version
    # Since we might have partial patches applied, let's look for the function signature
    
    # Search for the switch endpoint definition
    switch_def = '@self.app.post("/v1/models/switch")'
    if switch_def not in content:
        print("❌ Could not find /v1/models/switch endpoint")
        return False
        
    start_idx = content.find(switch_def)
    
    # Find the success return statement to identify the end of the block
    success_return = 'return {"status": "success", "model": model_id}'
    end_idx = content.find(success_return, start_idx)
    
    if end_idx == -1:
        # Maybe it was already patched to include something else?
        print("⚠️ Could not find standard success return. Checking if already patched.")
        if '"vram_mb":' in content and 'previous_model = self.config.get' in content:
             print("✅ Already patched with robust logic")
             return True
        else:
            print("❌ Could not locate the success block to replace")
            return False
            
    # We want to find the start of the "if success:" block for the logical replacement
    # Pattern: success = self.inference_service.start(model_id)
    pattern = 'success = self.inference_service.start(model_id)'
    pattern_idx = content.find(pattern, start_idx)
    
    if pattern_idx == -1:
        print("❌ Could not find inference start call")
        return False
        
    # Extract the indentation
    indent = content[pattern_idx-12:pattern_idx] # rough guess, usually 12 spaces
    if not indent.isspace():
        indent = "            " # Fallback to 12 spaces if extraction failed
        
    # This is the block we want to replace (from start call to return)
    # But since we have multiple previous patches potentially messing things up,
    # let's be strategic.
    
    # Let's replace the whole `if success:` block.
    
    # Search for the block start
    block_start = content.find(pattern, start_idx)
    
    # Finding the end is tricky because we might have injected code.
    # Let's find the `return {"status": "success", "model": model_id}` and go to its end.
    block_end = content.find('}', end_idx) + 1
    
    original_block = content[block_start:block_end]
    print(f"Old block found ({len(original_block)} chars)")
    
    new_block = '''success = self.inference_service.start(model_id)
            if success:
                # Capture previous model BEFORE updating config (Critical for unload logic)
                previous_model = self.config.get("current_model")
                
                self.config.set("current_model", model_id)
                
                # Unload previous model from tracker
                try:
                    if previous_model and previous_model != model_id:
                        model_memory_tracker.track_model_unload(previous_model)
                        print(f"Unloaded previous model from tracker: {previous_model}")
                except Exception as e:
                    print(f"Warning: Failed to unload previous model: {e}")
                
                # Track model load and get stats
                vram_mb = 0
                ram_mb = 0
                try:
                    model_info = self.manifest_manager.get_models().get(model_id)
                    if model_info:
                        model_memory_tracker.track_model_load(model_id, model_info.name)
                        # Get the stats we just tracked
                        if model_id in model_memory_tracker.loaded_models:
                            stats = model_memory_tracker.loaded_models[model_id]
                            vram_mb = stats.get("vram_mb", 0)
                            ram_mb = stats.get("ram_mb", 0)
                except Exception as e:
                    print(f"Warning: Failed to track model load: {e}")
                
                return {
                    "status": "success", 
                    "model": model_id,
                    "vram_mb": vram_mb,
                    "ram_mb": ram_mb
                }'''
    
    # We need to preserve the indentation of the first line
    # The `original_block` starts with `success = ...`
    # The replacement should match.
    
    # Apply replacement
    new_content = content.replace(original_block, new_block)
    
    # Write patched content
    backup_path = rest_server_path + '.backup7'
    print(f"💾 Creating backup at {backup_path}")
    with open(backup_path, 'w') as f:
        with open(rest_server_path, 'r') as orig:
            f.write(orig.read())
    
    print(f"✍️  Writing patched content")
    with open(rest_server_path, 'w') as f:
        f.write(new_content)
    
    print("✅ Patch applied successfully!")
    print("\n📋 Next steps:")
    print("   1. Restart moondream-station server")
    
    return True

if __name__ == "__main__":
    print("🔧 Moondream Station - Robust Model Test Patch")
    print("=" * 60)
    
    if apply_patch():
        sys.exit(0)
    else:
        sys.exit(1)
