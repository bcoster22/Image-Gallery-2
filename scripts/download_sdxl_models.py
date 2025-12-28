#!/usr/bin/env python3
"""
Download all premium SDXL models for the Image Gallery Generation Studio
"""

import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from huggingface_hub import snapshot_download
from tqdm import tqdm

from backend_server.config import SDXL_MODELS

# Map from separate config to local format
MODELS_TO_DOWNLOAD = {}
for mid, info in SDXL_MODELS.items():
    tier_display = "🥇 Gold" if info.get('tier') == 'gold' else "⭐ Specialized"
    MODELS_TO_DOWNLOAD[mid] = {
        "repo": info['hf_id'],
        "name": info['name'],
        "tier": tier_display
    }

def download_model(model_id, model_info):
    """Download a single model from HuggingFace"""
    repo_id = model_info["repo"]
    name = model_info["name"]
    tier = model_info["tier"]
    
    print(f"\n{'='*60}")
    print(f"{tier} {name}")
    print(f"Repository: {repo_id}")
    print(f"{'='*60}")
    
    try:
        # Download to HuggingFace cache (automatically managed)
        cache_dir = snapshot_download(
            repo_id=repo_id,
            allow_patterns=["*.safetensors", "*.json", "*.txt", "*.md"],  # Only essential files
            ignore_patterns=["*.ckpt", "*.bin"],  # Skip old formats
            resume_download=True,
            local_files_only=False
        )
        
        print(f"✅ Downloaded successfully to: {cache_dir}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to download: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("🎨 SDXL Model Downloader - Premium Realistic Models")
    print("="*60)
    print("\nThis will download 10 state-of-the-art SDXL models:")
    print("• 3 Gold Standard models (The Big Three)")
    print("• 7 Specialized models for specific use cases")
    print("\nTotal size: ~30-50 GB")
    print("="*60)
    
    # Ask for confirmation
    response = input("\nProceed with download? [y/N]: ").strip().lower()
    if response != 'y':
        print("Download cancelled.")
        return
    
    # Download all models
    success_count = 0
    failed_models = []
    
    for model_id, model_info in MODELS_TO_DOWNLOAD.items():
        success = download_model(model_id, model_info)
        if success:
            success_count += 1
        else:
            failed_models.append(model_info["name"])
    
    # Summary
    print("\n" + "="*60)
    print("📊 DOWNLOAD SUMMARY")
    print("="*60)
    print(f"✅ Successfully downloaded: {success_count}/{len(MODELS_TO_DOWNLOAD)} models")
    
    if failed_models:
        print(f"\n❌ Failed downloads:")
        for model in failed_models:
            print(f"   • {model}")
        print("\nNote: You can re-run this script to retry failed downloads.")
    else:
        print("\n🎉 All models downloaded successfully!")
        print("\nYou can now use all 10 models in the Generation Studio!")
    
    print("="*60)

if __name__ == "__main__":
    main()
