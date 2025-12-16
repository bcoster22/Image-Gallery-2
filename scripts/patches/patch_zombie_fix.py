#!/usr/bin/env python3
"""
Patch to fix Zombie Model Issue (SDXL not unloading).

This patch injects `if sdxl_backend_new: sdxl_backend_new.unload_backend()` 
into rest_server.py in:
1. switch_model (manual switches)
2. _handle_chat_completion (auto-start)
3. _handle_chat_completion (auto-switch)
"""

import os
import sys

def apply_patch():
    moondream_dir = os.path.expanduser("~/.moondream-station/moondream-station")
    rest_server_path = os.path.join(moondream_dir, "moondream_station/core/rest_server.py")
    
    if not os.path.exists(rest_server_path):
        print(f"❌ rest_server.py not found at {rest_server_path}")
        return False
    
    print(f"📝 Reading {rest_server_path}")
    with open(rest_server_path, 'r') as f:
        content = f.read()

    # 1. Patch switch_model (Manual)
    # Target: success = self.inference_service.start(model_id)
    # Inject: Unload SDXL before this
    
    patch_1_target = 'success = self.inference_service.start(model_id)'
    patch_1_inject = '''# Unload SDXL if present (Zombie Prevention)
            if sdxl_backend_new:
                try:
                    sdxl_backend_new.unload_backend()
                    print("[ZombiePrevention] Unloaded SDXL before manual switch")
                except: pass

            success = self.inference_service.start(model_id)'''
    
    if patch_1_target in content:
        if "[ZombiePrevention]" not in content: # Avoid double patching
            content = content.replace(patch_1_target, patch_1_inject)
            print("✓ Patched switch_model")
        else:
             print("⚠️  switch_model seems already patched (skipping)")
    else:
        print("❌ Could not find switch_model target")

    # 2. Patch _handle_chat_completion Auto-Start
    # Target: if self.inference_service.start(target_model):
    
    patch_2_target = 'if self.inference_service.start(target_model):'
    patch_2_inject = '''# Unload SDXL if present (Zombie Prevention)
                if sdxl_backend_new:
                    try: 
                        sdxl_backend_new.unload_backend()
                        print("[ZombiePrevention] Unloaded SDXL before auto-start")
                    except: pass
                
                if self.inference_service.start(target_model):'''

    # Use a refined target including previous line to disambiguate if needed
    # But strictly speaking, the start call is unique enough in context? No, wait.
    # There are two .start(target_model) calls in the file? 
    # Let's check context.
    # The first one is in auto-start block. "DEBUG: Service stopped. Auto-starting..."
    
    if patch_2_target in content:
        # We need to be careful about indentation.
        # The replacement string above assumes standard 16 space indentation (inside if inside async def)
        # Let's verify indentation or handle it via regex, 
        # but string replace is safer if we match a block.
        
        # Unique context:
        context_2 = 'print(f"DEBUG: Service stopped. Auto-starting {target_model}...")'
        
        if context_2 in content:
            # We want to insert AFTER this print, BEFORE the if start()
            replacement_2 = context_2 + '\n                \n                # Unload SDXL if present (Zombie Prevention)\n                if sdxl_backend_new:\n                    try: \n                        sdxl_backend_new.unload_backend()\n                        print("[ZombiePrevention] Unloaded SDXL before auto-start")\n                    except: pass'
            
            content = content.replace(context_2, replacement_2)
            print("✓ Patched Auto-Start logic")
        else:
            print("❌ Could not find Auto-Start context")


    # 3. Patch _handle_chat_completion Auto-Switch
    # Target: if self.inference_service.start(requested_model):
    # Context: "Auto-switching to requested model:"
    
    context_3 = 'print(f"Auto-switching to requested model: {requested_model}")'
    
    if context_3 in content:
        replacement_3 = context_3 + '\n                    \n                    # Unload SDXL if present (Zombie Prevention)\n                    if sdxl_backend_new:\n                        try:\n                            sdxl_backend_new.unload_backend()\n                            print("[ZombiePrevention] Unloaded SDXL before auto-switch")\n                        except: pass'
        
        content = content.replace(context_3, replacement_3)
        print("✓ Patched Auto-Switch logic")
    else:
        print("❌ Could not find Auto-Switch context")


    # Write patched content
    backup_path = rest_server_path + '.backup_zombie'
    print(f"💾 Creating backup at {backup_path}")
    with open(backup_path, 'w') as f:
        with open(rest_server_path, 'r') as orig:
            f.write(orig.read())
    
    print(f"✍️  Writing patched content")
    with open(rest_server_path, 'w') as f:
        f.write(content)
    
    print("✅ Zombie Fix Applied Successfully!")
    return True

if __name__ == "__main__":
    if apply_patch():
        sys.exit(0)
    else:
        sys.exit(1)
