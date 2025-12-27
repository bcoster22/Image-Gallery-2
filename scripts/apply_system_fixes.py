#!/usr/bin/env python3
import sys
import subprocess
import os

"""
Secure wrapper script for applying system diagnostic fixes.
This script is intended to be run with passwordless sudo permissions via /etc/sudoers.d/moondream-gpu-reset.
It only executes a strict allowlist of commands based on a provided fix ID.
"""

def apply_fix_persistence():
    """Enable Nvidia Persistence Mode."""
    print("Enabling Nvidia Persistence Mode...")
    subprocess.check_call(["nvidia-smi", "-pm", "1"])
    print("Success: Persistence Mode enabled.")

def apply_fix_ghost_vram():
    """Kill processes using /dev/nvidia0 (Nuclear option)."""
    print("Scanning for processes holding /dev/nvidia0...")
    try:
        # fuser returns non-zero if no processes found, which is fine
        pIds = subprocess.check_output(["fuser", "-v", "/dev/nvidia0"], text=True, stderr=subprocess.DEVNULL)
        pIds = pIds.strip().split()
        
        if not pIds:
            print("No ghost processes found.")
            return

        print(f"killing processes: {pIds}")
        # kill -9 only the PIDs found
        subprocess.check_call(["kill", "-9"] + pIds)
        
        # Also run the reset script if available as a cleanup
        reset_script = os.path.join(os.path.dirname(__file__), "gpu_reset.py")
        if os.path.exists(reset_script):
             subprocess.call(["python3", reset_script])
             
        print("Success: Ghost VRAM processes terminated.")
    except subprocess.CalledProcessError:
        print("No processes found or failed to kill.")

def apply_fix_modeset():
    """Add nvidia-drm.modeset=1 to GRUB."""
    print("Adding nvidia-drm.modeset=1 to GRUB configuration...")
    
    grub_file = "/etc/default/grub"
    if not os.path.exists(grub_file):
        print(f"Error: {grub_file} not found.")
        sys.exit(1)
        
    with open(grub_file, "r") as f:
        content = f.read()
        
    if "nvidia-drm.modeset=1" in content:
        print("Already configured.")
        return

    # Replace the default line
    # Look for GRUB_CMDLINE_LINUX_DEFAULT="..."
    # We use sed for safety to avoid messing up python file writing permissions on system files
    cmd = "sed -i 's/GRUB_CMDLINE_LINUX_DEFAULT=\"/GRUB_CMDLINE_LINUX_DEFAULT=\"nvidia-drm.modeset=1 /' /etc/default/grub"
    subprocess.check_call(cmd, shell=True)
    
    print("Updating GRUB...")
    subprocess.check_call(["update-grub"])
    print("Success: GRUB updated. Please reboot.")

FIXES = {
    "gpu_persistence": apply_fix_persistence,
    "vram_ghosting": apply_fix_ghost_vram,
    "nvidia_drm_modeset": apply_fix_modeset
}

def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <fix_id>")
        sys.exit(1)

    fix_id = sys.argv[1]
    
    if fix_id not in FIXES:
        print(f"Error: Unknown fix ID '{fix_id}'")
        sys.exit(1)

    try:
        FIXES[fix_id]()
    except Exception as e:
        print(f"Critical Error applying fix {fix_id}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
