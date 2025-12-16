import os

def fix_v3():
    path = os.path.expanduser("~/.moondream-station/moondream-station/moondream_station/core/rest_server.py")
    
    with open(path, 'r') as f:
        content = f.read()
        
    # The broken block as seen in cat output:
    #                 # Unload SDXL if present (Zombie Prevention)
    #                 if sdxl_backend_new:
    #                         try:
    #                             sdxl_backend_new.unload_backend()
    #                             print("[ZombiePrevention] Unloaded SDXL before auto-switch")
    #                     except: pass
    
    # We construct a regex or exact string replacement
    # Using specific unique strings to locate start/end is safer than big blocks if spacing varies
    
    # Locate the lines
    
    lines = content.splitlines()
    new_lines = []
    skip = 0
    
    for i, line in enumerate(lines):
        if skip > 0:
             skip -= 1
             continue
             
        # Detect start of broken block
        if "if sdxl_backend_new:" in line and "Zombie Prevention" not in line and i < len(lines)-1:
             # Check if next line is the indented try
             next_line = lines[i+1]
             if "try:" in next_line and len(next_line.split("try:")[0]) > len(line.split("if")[0]) + 4:
                 print(f"Found broken block at line {i+1}")
                 
                 # Write correct block
                 # Base indent = 16 spaces
                 base = " " * 16
                 new_lines.append(base + "if sdxl_backend_new:\n")
                 new_lines.append(base + "    try:\n")
                 new_lines.append(base + "        sdxl_backend_new.unload_backend()\n")
                 new_lines.append(base + "        print(\"[ZombiePrevention] Unloaded SDXL before auto-switch\")\n")
                 new_lines.append(base + "    except: pass\n")
                 
                 # Now we need to skip the broken lines
                 # We skip until we pass "except: pass"
                 
                 k = 1
                 while i+k < len(lines):
                     if "except: pass" in lines[i+k]:
                         skip = k
                         break
                     k += 1
                 continue
                 
        new_lines.append(line + "\n")

    with open(path, 'w') as f:
        f.writelines(new_lines)
        
    print("V3 Fix Applied.")

if __name__ == "__main__":
    fix_v3()
