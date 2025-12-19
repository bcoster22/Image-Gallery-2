# Generation Studio & Moondream Station Status (Dec 2025)

## Overview
This document outlines the recent fixes and current operational status of the Generation Studio (Frontend) and Moondream Station (Backend).

## Generation Studio (Frontend) Fixes
The "Play" button in the Generation Studio (PromptSubmissionModal) was previously failing to apply user settings or handle errors correctly. The following fixes have been applied:
1.  **Queue Processing**: `App.tsx` was modified to correctly pass `generationSettings` (Model, Steps, CFG Scale, etc.) from the queue task to the `aiService`. Previously, these settings were dropped, causing the backend to use defaults.
2.  **Settings Propagation**: The `PromptSubmissionModal` now correctly packages `advancedSettings` into the `QueueItem` data.
3.  **Visual Feedback**: The Generation Player correctly queues "Processing" notifications.

## Moondream Station (Backend) Architecture
The backend is currently running a customized server script: `rest_server_temp_5.py`. This script unifies the original Moondream Vision capabilities with a robust SDXL generation backend.

### Key Features
-   **SDXL Integration**: Uses `scripts/backend_fixed.py` to handle `/v1/generate` requests. Supports multiple SDXL models (Juggernaut, RealVis, CyberRealistic, etc.) via local checkpoint loading.
-   **Resilient Startup**: The server startup logic has been patched to be **resilient to Vision Model failures**. If the `InferenceService` (Moondream-2) fails to load (missing files or configuration errors), the server **logs a warning instead of crashing**. This ensures that Image Generation capabilities (SDXL) remain available even if Vision features are degraded.
-   **Main Block Restoration**: The `rest_server_temp_5.py` script was updated to validly import `ConfigManager` and `ManifestManager` to ensure standalone execution.

### How to Run
#### 1. Backend
Execute the custom server script (Port 2020):
```bash
# From project root
python3 rest_server_temp_5.py
```
*Note: This script handles OOM prevention and smart model loading.*

#### 2. Frontend
Standard Vite development server:
```bash
npm run dev
```

## Known Issues
-   **Moondream Vision**: The local Moondream-2 vision model may fail to start if model files are missing from `~/.moondream-station`. The server logs this as a warning.
-   **Model Downloads**: Users must ensure SDXL checkpoints are present in `~/.moondream-station/models/sdxl-checkpoints` (or mapped equivalent) for them to be selectable in the UI.

## Recent Changes
-   Fixed `App.tsx`: Added `overrides` argument to `generateImageFromPrompt` call.
-   Updated `rest_server_temp_5.py`: Added main execution block, fixed imports (`moondream_station.core.config.ConfigManager`), and added fail-safe logic for `InferenceService.start()`.
