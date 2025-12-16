import os

def fix_indentation_final():
    path = os.path.expanduser("~/.moondream-station/moondream-station/moondream_station/core/rest_server.py")
    
    with open(path, 'r') as f:
        lines = f.readlines()
        
    new_lines = []
    
    for i, line in enumerate(lines):
        # Fix the specific "try:" block that is broken
        # Problem: 
        # try: 
        # sdxl_backend_new.unload_backend()
        
        # Detection: any line starting with spaces that has "sdxl_backend_new.unload_backend()"
        # Check if previous line was "try:" or "try: \n"
        
        trimmed = line.lstrip()
        indent = len(line) - len(trimmed)
        
        if "sdxl_backend_new.unload_backend()" in line:
            # Check indentation of previous line to match it + 4
            prev_line = lines[i-1]
            if "try:" in prev_line:
                prev_indent = len(prev_line) - len(prev_line.lstrip())
                target_indent = prev_indent + 4
                
                if indent != target_indent:
                    print(f"Fixing unload call at line {i+1}: {indent} -> {target_indent}")
                    new_lines.append(" " * target_indent + trimmed)
                    continue
        
        if "[ZombiePrevention] Unloaded SDXL" in line:
             # Match the previous line (which we hopefully just fixed or was fixed)
             # But safer: match the indentation of the unload call
             # If we just fixed the previous line, we can't easily peek at new_lines[-1] reliably without logic
             # Let's just assume it needs to align with the unload call.
             
             prev_line = lines[i-1] # This is the original previous line, which might be broken? 
             # No, let's look at what we're about to write.
             
             # Heuristic: If this line is the print, and the previous line was unload_backend
             if "sdxl_backend_new.unload_backend()" in prev_line:
                 # Check what we did to the previous line in the loop? 
                 # Too complex.
                 
                 # Simpler: Make it 4 spaces deeper than the "if sdxl_backend_new:" line?
                 # Finding the "if" is hard.
                 
                 # Let's just fix it relative to "try:" if found in i-2
                 if "try:" in lines[i-2]:
                    prev_indent = len(lines[i-2]) - len(lines[i-2].lstrip())
                    target_indent = prev_indent + 4
                    new_lines.append(" " * target_indent + trimmed)
                    continue

        new_lines.append(line)

    with open(path, 'w') as f:
        f.writelines(new_lines)
        
    print("Final indentation fix applied.")

if __name__ == "__main__":
    fix_indentation_final()
