import os
import re

def fix_indentation():
    path = os.path.expanduser("~/.moondream-station/moondream-station/moondream_station/core/rest_server.py")
    
    with open(path, 'r') as f:
        lines = f.readlines()
        
    new_lines = []
    
    # We are looking for the block sticking out with 20 spaces when it should be 16
    # Context: inside auto-switch logic
    
    for i, line in enumerate(lines):
        # Detect the over-indented Zombie block
        if "Unload SDXL if present (Zombie Prevention)" in line:
            # Check current indentation
            indent = len(line) - len(line.lstrip())
            if indent > 16:
                print(f"Fixing indent at line {i+1}: {indent} -> 16")
                # Fix this line and following lines until we hit the next block
                # The block is:
                # # Unload...
                # if sdxl...
                #     try:
                #         ...
                #     except: pass
                
                # Simple heuristic: remove 4 spaces from start if it starts with spaces
                new_line = line.replace("    ", "", 1)
                new_lines.append(new_line)
                continue
        
        # Also fix the lines following it if they are part of the block
        # The block uses variables `sdxl_backend_new`
        if "if sdxl_backend_new:" in line and "Zombie Prevention" not in line: # Avoid matching the comment if possible, but comment was handled above
             indent = len(line) - len(line.lstrip())
             if indent > 16:
                 new_lines.append(line.replace("    ", "", 1))
                 continue
        
        if "sdxl_backend_new.unload_backend()" in line:
             indent = len(line) - len(line.lstrip())
             if indent > 20: 
                 new_lines.append(line.replace("    ", "", 1))
                 continue
                 
        if '[ZombiePrevention] Unloaded SDXL' in line:
             indent = len(line) - len(line.lstrip())
             if indent > 20:
                 new_lines.append(line.replace("    ", "", 1))
                 continue

        # Catch trailing except pass 
        if "except: pass" in line and i > 10 and "sdxl_backend_new" in lines[i-2]:
             indent = len(line) - len(line.lstrip())
             if indent > 20:
                 new_lines.append(line.replace("    ", "", 1))
                 continue
        
        # Default: keep line as is
        new_lines.append(line)

    with open(path, 'w') as f:
        f.writelines(new_lines)
        
    print("Indentation fixed.")

if __name__ == "__main__":
    fix_indentation()
