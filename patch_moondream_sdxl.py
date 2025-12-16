#!/usr/bin/env python3
"""
Patch for moondream-station rest_server.py
Fixes SDXL backend import to use local backends directory instead of Gallery project
"""

import os
import sys

REST_SERVER_PATH = os.path.expanduser("~/.moondream-station/moondream-station/moondream_station/core/rest_server.py")
BACKUP_PATH = REST_SERVER_PATH + ".backup"

# The old import code (to be replaced)
OLD_IMPORT_CODE = """# Add gallery project path to find SDXL backend
if "/home/bcoster/Documents/Github_Projects/Gallery/Image-Gallery-2" not in sys.path:
    sys.path.append("/home/bcoster/Documents/Github_Projects/Gallery/Image-Gallery-2")

try:
    import sdxl_backend_new
except ImportError:
    print("Warning: Could not import sdxl_backend_new. Gen AI will not work.")
    sdxl_backend_new = None"""

# The new import code (using local backends)
NEW_IMPORT_CODE = """# Import SDXL backend from local backends directory
try:
    # Add backends directory to path
    backends_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'backends')
    if backends_dir not in sys.path:
        sys.path.insert(0, backends_dir)
    
    # Import the SDXL backend
    from sdxl_backend.backend import SDXLBackend
    
    # Create a wrapper class that matches the expected interface
    class SDXLBackendWrapper:
        def __init__(self):
            self._instance = None
            self._current_model = None
        
        def init_backend(self, model_id="sdxl-realism", use_4bit=True):
            \"\"\"Initialize SDXL backend with specified model\"\"\"
            try:
                # Map model IDs to HuggingFace paths
                model_mapping = {
                    "sdxl-realism": "RunDiffusion/Juggernaut-XL-Lightning",
                    "sdxl-anime": "cagliostrolab/animagine-xl-3.1",
                    "sdxl-surreal": "Lykon/dreamshaper-xl-lightning"
                }
                hf_model = model_mapping.get(model_id, model_id)
                
                # Create or reinitialize if model changed
                if self._instance is None or self._current_model != hf_model:
                    config = {
                        "model_id": hf_model,
                        "use_4bit": use_4bit,
                        "compile": False
                    }
                    self._instance = SDXLBackend(config)
                    self._current_model = hf_model
                
                # Initialize if not already loaded
                if self._instance.pipeline is None:
                    print(f"[SDXL] Initializing backend with model: {hf_model}")
                    self._instance.initialize()
                
                return True
            except Exception as e:
                print(f"[SDXL] Error initializing backend: {e}")
                import traceback
                traceback.print_exc()
                return False
        
        def generate(self, prompt, width=1024, height=1024, steps=8, image=None, strength=0.75):
            \"\"\"Generate image using SDXL backend\"\"\"
            if self._instance is None or self._instance.pipeline is None:
                raise RuntimeError("SDXL backend not initialized")
            
            try:
                # Call the backend's generate method
                if hasattr(self._instance, 'generate'):
                    return self._instance.generate(
                        prompt=prompt,
                        width=width,
                        height=height,
                        num_inference_steps=steps,
                        init_image_b64=image,
                        strength=strength
                    )
                else:
                    # Fallback to direct pipeline call
                    import base64
                    import io
                    from PIL import Image as PILImage
                    
                    result = self._instance.pipeline(
                        prompt=prompt,
                        width=width,
                        height=height,
                        num_inference_steps=steps
                    ).images
                    
                    # Convert to base64
                    output_images = []
                    for img in result:
                        buffer = io.BytesIO()
                        img.save(buffer, format="PNG")
                        img_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                        output_images.append(img_b64)
                    
                    return output_images
            except Exception as e:
                print(f"[SDXL] Error generating image: {e}")
                import traceback
                traceback.print_exc()
                raise
        
        def unload_backend(self):
            \"\"\"Unload SDXL backend to free VRAM\"\"\"
            if self._instance is not None:
                self._instance.pipeline = None
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                print("[SDXL] Backend unloaded and VRAM freed")
    
    # Create global instance
    sdxl_backend_new = SDXLBackendWrapper()
    print("[SDXL] Backend loaded successfully from local backends directory")
    
except ImportError as e:
    print(f"Warning: Could not import SDXL backend: {e}")
    print("SDXL generation will not be available.")
    sdxl_backend_new = None"""


def main():
    print("Moondream Station REST Server SDXL Backend Patch")
    print("=" * 60)
    
    # Check if rest_server.py exists
    if not os.path.exists(REST_SERVER_PATH):
        print(f"❌ Error: rest_server.py not found at {REST_SERVER_PATH}")
        return 1
    
    # Read the current file
    print(f"📖 Reading {REST_SERVER_PATH}...")
    with open(REST_SERVER_PATH, 'r') as f:
        content = f.read()
    
    # Check if old import code exists
    if OLD_IMPORT_CODE not in content:
        print("ℹ️  Old import code not found. File may already be patched or have different structure.")
        print("\n🔍 Current import section:")
        lines = content.split('\n')
        for i, line in enumerate(lines[:30]):
            if 'import' in line.lower():
                print(f"  Line {i+1}: {line}")
        return 1
    
    # Create backup
    print(f"💾 Creating backup at {BACKUP_PATH}...")
    with open(BACKUP_PATH, 'w') as f:
        f.write(content)
    
    # Apply patch
    print("🔧 Applying patch...")
    patched_content = content.replace(OLD_IMPORT_CODE, NEW_IMPORT_CODE)
    
    # Write patched file
    print(f"✍️  Writing patched file...")
    with open(REST_SERVER_PATH, 'w') as f:
        f.write(patched_content)
    
    print("\n✅ Patch applied successfully!")
    print("\n⚠️  IMPORTANT: Restart moondream-station server for changes to take effect:")
    print("   1. Find process: ps aux | grep start_server")
    print("   2. Kill process: kill <PID>")
    print("   3. Restart: cd ~/.moondream-station/moondream-station && python3 start_server.py")
    print(f"\n💡 Backup saved at: {BACKUP_PATH}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
