# Status Page Improvements - Complete Walkthrough

## Overview

Comprehensive improvements to the Status Page including real-time memory tracking, historical VRAM data, UI refinements, and **Ghost/Zombie Model Detection**.

## Features Implemented

### 1. Robust Model Switching & Testing

**Backend (`/v1/models/switch` & `auto-switch`):**
- **Unload Logic:** Deterministically unloads the previous model *before* loading the new one to ensure single-model isolation.
- **Zombie Prevention (FIXED):** Now explicitly unloads SDXL (`sdxl_backend_new.unload_backend()`) whenever switching to a Moondream/Core model. This prevents SDXL from staying in VRAM ("Zombie Mode").
- **VRAM Measurement:** Measures VRAM delta: `(Current Used - System Baseline)`. Uses `nvidia-smi` (pynvml) for accuracy.
- **Immediate Feedback:** Returns `vram_mb` and `ram_mb` directly in the API response.
- **Auto-Switch Tracking:** Captures implicit model switches (e.g. captioning) triggered by API calls, ensuring the tracker stays in sync.

**Frontend (Test Button):**
- Cycles through all models sequentially.
- Updates local state *immediately* with the VRAM data from the API response (no polling delay).
- Visual feedback with spinners and checkmarks.

### 2. Per-Model Memory Tracking

**Backend (`ModelMemoryTracker`):**
- Tracks real VRAM using `pynvml` (nvidia-smi) for system-aware measurement.
- Tracks system RAM using `psutil`.
- Exposes `loaded_models` array via `/metrics`.

**Frontend Display:**
- 🟢 **Yellow** - Currently loaded (real-time VRAM/RAM)
- ⚪ **Gray italic** - Unloaded (last known VRAM)
- ⚪ **Dark gray "—"** - Never loaded

### 3. Ghost / Zombie Model Detection 🆕

**Problem:** Sometimes PyTorch fails to release GPU memory when unloading large models (like SDXL), leaving ~5GB of "Zombie" memory that the tracker doesn't account for.

**Solution:**
- **Heuristic Detection:** Backend calculates `Ghost VRAM = Actual VRAM - Sum(Expected Model Usage)`.
- **Threshold:** If Ghost VRAM > 1.5 GB, it flags a "Zombie Model".
- **Visual Alert:** Status Page displays a yellow **"Zombie Memory Detected"** warning banner.
- **Auto-Fix:** The system now **automatically triggers "Free VRAM"** when a Zombie is detected (with a safety cooldown), so you don't even need to click the button yourself!
- **Manual Fallback:** "Free VRAM" and "Reset GPU" buttons are still available if needed.

### 4. Dependencies Fixed

- **NSFW Detector:** Fixed crash by installing missing `timm` and `torchvision` libraries.

### 5. Best-Practice Memory Management

**Problem:** Core service unloading was "lazy", relying on Python GC which led to VRAM fragmentation.
**Solution:**
- Adopted "Nuclear Unload" pattern from SDXL plugin.
- Patched `inference_service.py` to Force Python GC (`gc.collect()`).
- Force CUDA Clean (`torch.cuda.empty_cache()`) on every unload.
- This standardizes behavior across the entire application.

---

## Technical Implementation

### Backend Patches

**1. `patch_model_test_endpoint.py`**
- Fixes unload order in manual switch endpoint.

**2. `patch_ghost_detection.py`**
- Adds `ghost_memory` logic to `ModelMemoryTracker` and `/metrics`.

**3. `patch_zombie_fix.py` / `repair_indent_v3.py`** (Critical Fix)
- Injects explicit SDXL unload calls into `switch_model` and `chat_completions` endpoints.

**4. `inference_service.py` (Direct Patch)**
- Added explicit `gc.collect()` and `cuda.empty_cache()` to `unload_model()`.

**5. `patch_nsfw_backend.py` (New)**
- Fixed `nsfw_backend` loading crash (meta tensor error).
- Added MISSING `unload()` function to NSFW backend (was creating permanent leaks).

### 6. Process Cleanup
- Identified and killed "zombie" `start_server.py` processes that were holding VRAM (4.8GB) even after the main server was restarted. This was the source of the "Still memory leak" report.

**7. Post-Load Memory Cleanup (New Feature)**
- **User Request:** "Free VRAM after each model onload".
- **Implementation:** Modified `inference_service.py` (`start()` method) to automatically trigger `gc.collect()` and `cuda.empty_cache()` *immediately* after a model finishes loading.
**8. SDXL Backend Fix (Remix Repair)**
- **Issue:** Users reported "Remix is failing". Logs showed `NotImplementedError: Cannot copy out of meta tensor`.
- **Root Cause:** `accelerate` optimized loading (meta device) failed during `diffusers` initialization on this specific hardware config.
- **Fix:** Patched `sdxl_backend_new.py`:
  1. Set `device_map="cuda"` for both Pipeline and VAE (fixes meta tensor crash & OOM).
  2. Removed conflicting `enable_model_cpu_offload()` calls.
  3. Ensured VAE is loaded directly to GPU to prevent runtime device mismatches.

### Frontend Changes

**StatusPage.tsx:**
- Added "Zombie Memory Detected" alert component.
- Consumes `ghost_memory` from metrics API.

---

## Usage

**To measure real VRAM:**
1. Navigate to Status Page.
2. Click **⚡ Test Load** button.

**To handle Zombie Memory:**
1. If you see VRAM usage staying high (e.g. 7GB) but only Moondream is loaded (Green), wait for the Yellow Alert.
2. Click **"Reset GPU to Fix"** in the alert box.
