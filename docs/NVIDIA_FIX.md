# Nvidia System Freeze & "Failed to grab modeset ownership"

## Issue Description
The system freezes randomly or during heavy GPU load (like AI model inference).
**Error Log:** `[drm:nv_drm_master_set [nvidia_drm]] *ERROR* [nvidia-drm] [GPU ID 0x00000100] Failed to grab modeset ownership`

**Cause:**
This is a known instability with **Nvidia Driver 560+** on Linux. The driver conflicts with the Desktop Environment (GNOME/Wayland) for control of the display (DRM Master), causing the desktop to freeze while the mouse might still move or the system becomes unresponsive.

**App Context:**
The `moondream-station` backend uses `device_map="auto"` to load models. While this is standard practice, it triggers this driver bug because it initializes the CUDA context in a way that races with the display driver's modesetting.

## Solution
Enable Nvidia DRM Modesetting in the kernel.

### Steps to Fix
1.  **Edit GRUB configuration:**
    ```bash
    sudo nano /etc/default/grub
    ```
2.  **Find the line:**
    `GRUB_CMDLINE_LINUX_DEFAULT="quiet splash ..."`
3.  **Add** `nvidia-drm.modeset=1` inside the quotes.
    *   *Example:* `GRUB_CMDLINE_LINUX_DEFAULT="quiet splash nvidia-drm.modeset=1"`
4.  **Update GRUB:**
    ```bash
    sudo update-grub
    ```
5.  **Reboot:**
    ```bash
    sudo reboot
    ```

### Why this works
This parameter forces the Nvidia driver to fully handle kernel modesetting early in the boot process, enabling better integration with the display server and preventing the race condition that causes the "failed to grab ownership" error.
