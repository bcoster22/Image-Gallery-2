# SDXL Backend Fix - Missing Import Module
**Fixed:** 2025-12-16T02:04:10+10:00

## Problem Identified
The moondream-station rest_server was returning error:
```
{"error":"SDXL Backend not available"}
POST http://127.0.0.1:2020/v1/generate 500 (Internal Server Error)
```

### Root Cause
The `/home/bcoster/.moondream-station/moondream-station/moondream_station/core/rest_server.py` file contains:

```python
# Add gallery project path to find SDXL backend
if "/home/bcoster/Documents/Github_Projects/Gallery/Image-Gallery-2" not in sys.path:
    sys.path.append("/home/bcoster/Documents/Github_Projects/Gallery/Image-Gallery-2")

try:
    import sdxl_backend_new
except ImportError:
    print("Warning: Could not import sdxl_backend_new. Gen AI will not work.")
    sdxl_backend_new = None
```

**BUT** the file `sdxl_backend_new.py` did NOT exist in the Gallery project directory!

This caused `sdxl_backend_new = None`, which triggered the error on line 476:
```python
if not sdxl_backend_new:
     return JSONResponse(content={"error": "SDXL Backend not available"}, status_code=500)
```

## Investigation Results

1. **SDXL Backend EXISTS** in moondream-station:
   - Location: `/home/bcoster/.moondream-station/moondream-station/backends/sdxl_backend/backend.py`
   - Contains: `SDXLBackend` class with proper implementation
   
2. **Import Path Mismatch**:
   - rest_server expects: `sdxl_backend_new` from Gallery project
   - Actual location: `backends.sdxl_backend.backend` in moondream-station

## Solution Implemented

Created `/home/bcoster/Documents/Github_Projects/Gallery/Image-Gallery-2/sdxl_backend_new.py` as a **wrapper module** that:

1. **Adds moondream-station to Python path**
2. **Imports the actual SDXL backend** from `backends.sdxl_backend.backend`
3. **Provides the expected interface**:
   - `init_backend(model_id, use_4bit)`
   - `generate(prompt, width, height, steps, image, strength)`
   - `unload_backend()`
4. **Maps model IDs** to HuggingFace paths:
   - `sdxl-realism` → `RunDiffusion/Juggernaut-XL-Lightning`
   - `sdxl-anime` → `cagliostrolab/animagine-xl-3.1`
   - `sdxl-surreal` → `Lykon/dreamshaper-xl-lightning`

## Next Steps Required

**⚠️ IMPORTANT: You must restart the moondream-station server**

```bash
# Find the process ID
ps aux | grep start_server.py

# Kill it
kill [PID]

# Or use the stop script if available
cd /home/bcoster/.moondream-station/moondream-station
./stop_server.sh  # if exists

# Restart
./start_server.sh
# OR
python3 start_server.py
```

## How to Verify

After restarting:

1. **Test SDXL endpoint**:
```bash
curl -X POST http://127.0.0.1:2020/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a beautiful landscape",
    "model": "sdxl-realism",
    "width": 1024,
    "height": 1024,
    "steps": 4
  }'
```

2. **Check server logs** for:
```
[SDXL] Backend wrapper loaded successfully
```

3. **Try generating in the UI**:
   - Select an image
   - Click "Recreate from AI"
   - Select "Moondream SDXL"
   - Generate!

## Technical Details

### Wrapper Functions

```python
def init_backend(model_id="sdxl-realism", use_4bit=True):
    """Initializes SDXLBackend with proper config"""
    # Creates backend instance
    # Loads model with 4-bit quantization
    # Returns True on success

def generate(prompt, width, height, steps, image, strength):
    """Generates images using loaded SDXL model"""
    # Calls backend.generate()
    # Returns list of base64-encoded images

def unload_backend():
    """Frees VRAM by unloading the pipeline"""
    # Sets pipeline = None
    # Calls torch.cuda.empty_cache()
```

### Model Mapping

The wrapper translates friendly model IDs to actual HuggingFace model paths:

| Model ID | HuggingFace Path | Style |
|----------|-----------------|-------|  
| sdxl-realism | RunDiffusion/Juggernaut-XL-Lightning | Photorealistic |
| sdxl-anime | cagliostrolab/animagine-xl-3.1 | Anime/Manga |
| sdxl-surreal | Lykon/dreamshaper-xl-lightning | Artistic/Surreal |

## Files Modified

- ✅ Created: `/home/bcoster/Documents/Github_Projects/Gallery/Image-Gallery-2/sdxl_backend_new.py`

## Files That Need Restarting

- ⚠️ Restart Required: `moondream-station` server process (PID: 83632)

Once restarted, SDXL generation should work! 🎨
