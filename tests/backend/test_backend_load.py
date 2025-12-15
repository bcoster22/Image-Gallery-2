import sys
import os
from pathlib import Path

# Add venv site-packages to path just in case
sys.path.append("/home/bcoster/.moondream-station/venv/lib/python3.12/site-packages")

# Add backends dir to path
sys.path.append("/home/bcoster/.moondream-station/backends")

try:
    import nsfw_backend.backend as backend
    print("Imported backend module")
    
    backend.init_backend(model_id="Marqo/nsfw-image-detection-384")
    print("Initialized backend")
    
    model, processor = backend.get_model()
    print("Loaded model and processor")
    
    print("Backend load successful")
except Exception as e:
    print(f"Failed to load backend: {e}")
    import traceback
    traceback.print_exc()
