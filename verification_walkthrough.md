# Memory Leak Fix Walkthrough

## Changes Implemented
I have applied fixes to `scripts/backend_fixed.py` and `rest_server_temp_5.py` to address both System RAM and VRAM leaks.

### 1. Robust Unload in `scripts/backend_fixed.py`
- Added explicit garbage collection (`gc.collect()` called twice for circular references).
- Added `torch.cuda.ipc_collect()` in addition to `empty_cache()` for thorough GPU cleaning.
- Added `try/except` blocks around pipeline deletion to prevent partial failures.
- Added explicit console logging for unload events.

### 2. Tracker Integration in `rest_server_temp_5.py`
- Updated `AdvancedModelService.start` to notify `model_memory_tracker` when a model is unloaded.
- Added consistent Double-GC and CUDA clearing to `AdvancedModelService`.

## Verification Steps
To verify the fix, perform the following stress test:

1.  **Open Status Page**: Navigate to the System Status page in the app.
2.  **Load SDXL**: Go to Generation Studio and generate an image (loads SDXL ~6GB VRAM).
3.  **Switch to Vision**: Go to "Tags" and run a tagger (loads WD14 ~1GB).
    - **Observe Console/Status**: You should see "[SDXL-Backend] Unloading backend..." followed by "Backend unloaded and memory cleared."
    - **Observe RAM**: System RAM usage should drop significantly.
    - **Observe VRAM**: VRAM usage on the Status Page should reflect only WD14.
4.  **Repeat**: Switch back and forth 3-4 times.
    - **Success Criteria**: RAM usage should stabilize and not grow indefinitely (no "staircase" pattern). VRAM should return to near-baseline levels when models are unloaded.
