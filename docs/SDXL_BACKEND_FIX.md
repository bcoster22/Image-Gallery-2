# SDXL Backend Patch Guide

This document outlines the steps to manually apply the SDXL Image-to-Image fix to the Moondream Station backend, correcting the "Eye Hallucination" (Text-to-Image fallback) issue.

## The Problem
The current server instance is loading a cached or shadowed version of the SDXL backend that ignores the `image` parameter, causing it to generate new images (often generic eyes) instead of enhancing the input image.

## The Fix
You must overwrite the **active** backend file used by the server's model loader.

### Step 1: Locate the File
The active file is located at:
```bash
/home/bcoster/.moondream-station/models/backends/sdxl_backend/backend.py
```
*(Note: It is NOT in `moondream-station/backends`)*

### Step 2: Apply the Patch
Copy the fixed backend script (with Img2Img support) to this location.

```bash
cp /home/bcoster/Documents/Github_Projects/Gallery/Image-Gallery-2/scripts/backend_fixed_debug_V2.py /home/bcoster/.moondream-station/models/backends/sdxl_backend/backend.py
```

### Step 3: Clear Caches
Remove compiled python files to force a reload.

```bash
rm -rf /home/bcoster/.moondream-station/models/backends/sdxl_backend/__pycache__
rm -rf /home/bcoster/.moondream-station/moondream-station/backends/sdxl_backend/__pycache__
```

### Step 4: Hard Restart (Critical)
Ensure the old process is dead.

```bash
# Find the PID
fuser 2020/tcp

# Kill it (replace PID)
kill -9 <PID>
```

### Step 5: Start Server
```bash
cd /home/bcoster/.moondream-station
source venv/bin/activate
./moondream-station/start_server.sh
```

## Verification
When running a generation, the server should now create:
- `/home/bcoster/moondream_debug_init.png` (Copy of input image)
- `/home/bcoster/moondream_params.txt` (Parameters log)

If these files appear, the fix is Active.
