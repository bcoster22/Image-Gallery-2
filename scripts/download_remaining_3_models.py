#!/usr/bin/env python3
"""
Download the remaining 3 SDXL models that are missing from checkpoints directory.
Downloads single .safetensors files to ~/.moondream-station/models/checkpoints/
"""

import os
from huggingface_hub import hf_hub_download

# Target directory
CHECKPOINTS_DIR = os.path.expanduser("~/.moondream-station/models/checkpoints")
os.makedirs(CHECKPOINTS_DIR, exist_ok=True)

# Models to download with their CORRECTED HuggingFace repo IDs and filenames
MODELS = [
    {
        "repo_id": "JCTN/zavychromaxl",
        "filename": "zavychromaxl_v60.safetensors",
        "local_name": "zavychroma-xl.safetensors"
    },
    {
        "repo_id": "imagepipeline/LEOSAMs-HelloWorld-SDXL-Base-Model",
        "filename": "leosamsHelloworldXL_helloworldXL70.safetensors",
        "local_name": "helloworld-xl.safetensors"
    },
    {
        "repo_id": "imagepipeline/Copax-TimeLessXL-SDXL1.0",
        "filename": "copaxTimelessxlSDXL1_v9.safetensors",
        "local_name": "copax-timeless-xl.safetensors"
    }
]

def download_model(repo_id, filename, local_name):
    """Download a model from HuggingFace Hub"""
    target_path = os.path.join(CHECKPOINTS_DIR, local_name)
    
    if os.path.exists(target_path):
        size_gb = os.path.getsize(target_path) / 1e9
        print(f"✓ {local_name} already exists ({size_gb:.1f}GB)")
        return True
    
    print(f"📥 Downloading {local_name} from {repo_id}/{filename}...")
    print(f"   Target: {target_path}")
    try:
        downloaded_path = hf_hub_download(
            repo_id=repo_id,
            filename=filename,
            cache_dir=None,  # Use default cache
            local_dir=None,
            local_dir_use_symlinks=False
        )
        
        # Copy to checkpoints directory with standardized name
        import shutil
        shutil.copy2(downloaded_path, target_path)
        
        size_gb = os.path.getsize(target_path) / 1e9
        print(f"✅ Downloaded {local_name} ({size_gb:.1f}GB)")
        return True
        
    except Exception as e:
        print(f"❌ Failed to download {local_name}: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Downloading remaining SDXL models")
    print (" (ZavyChroma XL, HelloWorld XL, Copax Timeless XL)")
    print("=" * 60)
    print()
    
    success = 0
    failed = 0
    
    for model in MODELS:
        if download_model(model["repo_id"], model["filename"], model["local_name"]):
            success += 1
        else:
            failed += 1
        print()
    
    print("=" * 60)
    print(f"✅ Successfully downloaded: {success}")
    if failed > 0:
        print(f"❌ Failed: {failed}")
    print("=" * 60)
    print()
    print("Restart the backend to see updated model list.")
