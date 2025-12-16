import os

def fix_auto_switch():
    path = os.path.expanduser("~/.moondream-station/moondream-station/moondream_station/core/rest_server.py")
    
    with open(path, 'r') as f:
        lines = f.readlines()
        
    new_lines = []
    
    # We target the block around line 700 which is clearly messed up:
    # 
    #                 # Unload SDXL if present (Zombie Prevention)
    #                 if sdxl_backend_new:
    #                         try:
    #                             sdxl_backend_new.unload_backend()
    #                             print("[ZombiePrevention] Unloaded SDXL before auto-switch")
    #                     except: pass
    
    # Needs to become:
    #
    #                 # Unload SDXL if present (Zombie Prevention)
    #                 if sdxl_backend_new:
    #                     try:
    #                         sdxl_backend_new.unload_backend()
    #                         print("[ZombiePrevention] Unloaded SDXL before auto-switch")
    #                     except: pass

    # Context: it's inside `if requested_model...:` which is at 16 spaces indentation?
    # No, `if requested_model...` (line 692 in output above) starts at 12 spaces.
    # So `if sdxl_backend_new` should be at 16 spaces.
    
    for i, line in enumerate(lines):
        if "[ZombiePrevention] Unloaded SDXL before auto-switch" in line:
            # This is the print inside the try.
            # We will rewrite the surrounding block.
            pass # simpler to just buffer and rewrite
            
        new_lines.append(line)
        
    # Re-approach: rewrite specific lines based on content matching
    final_lines = []
    for line in new_lines:
        sline = line.lstrip()
        
        if "if sdxl_backend_new:" in line and "Zombie Prevention" not in line:
             # Force 16 or 20? 
             # Based on output above:
             # if requested_model ... (12 spaces)
             #     if requested_model in ... (16 spaces)
             #         print (20 spaces)
             
             # The `if sdxl` block was inserted OUTSIDE the inner if?
             # From output:
             # if requested_model and requested_model != current_model:
             #     if requested_model in self.manifest_manager.get_models():
             #         print(...)
             #     
             #     # Unload SDXL ...
             
             # So it should be at 16 spaces (same level as inner if).
             
             final_lines.append(" " * 16 + "if sdxl_backend_new:\n")
             continue
             
        if "sdxl_backend_new.unload_backend()" in line:
             # Should be inside try inside if sdxl (16)
             # try (20)
             # unload (24)
             final_lines.append(" " * 24 + "sdxl_backend_new.unload_backend()\n")
             continue
             
        if "[ZombiePrevention] Unloaded SDXL" in line:
             # Print statement
             final_lines.append(" " * 24 + sline)
             continue
             
        if sline.startswith("try:") and "sdxl_backend_new" in final_lines[-1]: # if check
             # This assumes we just wrote the if line
             # But the if line is written above.
             # Wait, sequence matters.
             pass
        
        # This is getting fragile.
        # Let's simple-replace the known broken block sequence.
        
    # New strategy: Search and Replace Block
    content = "".join(lines)
    
    broken_block_pattern = """
                # Unload SDXL if present (Zombie Prevention)
                if sdxl_backend_new:
                        try:
                            sdxl_backend_new.unload_backend()
                            print("[ZombiePrevention] Unloaded SDXL before auto-switch")
                    except: pass"""
                    
    # The actual content usually has some variation in spaces due to my previous fixes.
    # We will build the correct block and try to replace whatever looks like it.
    
    # Or just write the file line by line with correct indentation for that section.
    
    corrected_lines = []
    skip = 0
    
    for i, line in enumerate(lines):
        if skip > 0:
            skip -= 1
            continue
            
        if "if sdxl_backend_new:" in line and "Zombie Prevention" not in line and "[ZombiePrevention]" not in line:
            # We found the start of the block.
            # We will force-write the next 5 lines correctly.
            
            # Check context: is this the auto-switch one?
            # Look ahead for the print message
            is_auto_switch = False
            for j in range(1, 5):
                if i+j < len(lines) and "before auto-switch" in lines[i+j]:
                    is_auto_switch = True
                    break
            
            if is_auto_switch:
                print(f"Rewriting auto-switch block at line {i+1}")
                corrected_lines.append(" " * 16 + "if sdxl_backend_new:\n")
                corrected_lines.append(" " * 20 + "try:\n")
                corrected_lines.append(" " * 24 + "sdxl_backend_new.unload_backend()\n")
                corrected_lines.append(" " * 24 + "print(\"[ZombiePrevention] Unloaded SDXL before auto-switch\")\n")
                corrected_lines.append(" " * 20 + "except: pass\n")
                
                # Now skip the old broken lines. 
                # We need to skip until we pass the old "except: pass" or "print"
                # Scan ahead until we find something that looks like the end
                
                # Careful: The old lines might be spread out.
                # Let's peek ahead and consume lines until we see 'except: pass'
                
                # Actually, simpler: consume exact number of lines if structure matches?
                # No, structure is broken.
                
                # Consumption loop:
                k = 1
                while i+k < len(lines):
                    l = lines[i+k]
                    if "except: pass" in l:
                        skip = k 
                        break
                    k += 1
                continue

        corrected_lines.append(line)

    with open(path, 'w') as f:
        f.writelines(corrected_lines)
    print("Fixed auto-switch indentation.")

if __name__ == "__main__":
    fix_auto_switch()
