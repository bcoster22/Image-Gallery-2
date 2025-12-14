# Status Page Improvements - Complete Walkthrough

## Overview

Comprehensive improvements to the Status Page including real-time memory tracking, historical VRAM data, UI refinements, and testing tools.

## Features Implemented

### 1. Robust Model Switching & Testing

**Backend (`/v1/models/switch` & `auto-switch`):**
- **Unload Logic:** Deterministically unloads the previous model *before* loading the new one to ensure single-model isolation.
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

### 3. Last Known VRAM Persistence

**Enhancements:**
- `last_known_vram` persists after model unload.
- Updated via **Test Load** button.
- Updated via **Live Metrics** polling (captures auto-switch stats).

### 4. Dependencies Fixed

- **NSFW Detector:** Fixed crash by installing missing `timm` and `torchvision` libraries.

---

## Technical Implementation

### Backend Patches

**1. `patch_model_test_endpoint.py`**
- Fixes unload order in manual switch endpoint.
- Returns stats in API response.

**2. `patch_auto_switch_tracking.py`**
- Adds memory tracking hooks to the implicit auto-switch logic in `rest_server.py`.

**3. `patch_chat_endpoint_tracking.py`**
- Adds tracking to the `/v1/chat/completions` endpoint (used for captions).

**4. `patch_vram_measurement_fix.py`**
- Implements `pynvml` based measurement logic.

### Frontend Changes

**StatusPage.tsx:**
- Updated Test Load button to consume `res.vram_mb`.
- Added logic to persist VRAM history from live metrics stream.

---

## API Endpoints

### POST /v1/models/switch
**Request:**
```json
{ "model": "moondream-2" }
```

**Response:**
```json
{
  "status": "success",
  "model": "moondream-2",
  "vram_mb": 2450,
  "ram_mb": 1024
}
```

---

## Usage

**To measure real VRAM:**
1. Navigate to Status Page.
2. Click **⚡ Test Load** button.
3. Watch as each model loads, measures, and updates the table instantly.

**To verify Auto-Switch:**
1. Upload an image and request a caption.
2. Observe Status Page:
   - "NSFW Detector" turns 🟢 (if used).
   - Then switches to "Moondream 2" 🟢.
   - Previous models show their last known VRAM in gray.
