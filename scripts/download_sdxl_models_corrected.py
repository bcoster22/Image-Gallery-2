#!/usr/bin/env python3
"""
Updated SDXL Model Downloader with Corrected Repository Names
Based on search results from Civitai and HuggingFace
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from huggingface_hub import snapshot_download
from tqdm import tqdm

# CORRECTED Model List with verified HuggingFace repos
MODELS_TO_DOWNLOAD = {
    # === GOLD TIER (Already Downloaded) ===
    "juggernaut-xl": {
        "repo": "RunDiffusion/Juggernaut-XL-Lightning",
        "name": "Juggernaut XL",
        "tier": "🥇 Gold",
        "status": "✅ Already Downloaded"
    },
    "realvisxl-v5": {
        "repo": "SG161222/RealVisXL_V5.0",
        "name": "RealVisXL V5",
        "tier": "🥇 Gold",
        "status": "✅ Already Downloaded"
    },
    
    # === CORRECTED REPOSITORIES ===
    "cyberrealistic-xl": {
        "repo": "cyberdelia/CyberRealisticXL",  # CORRECTED: lowercase
        "name": "CyberRealistic XL",
        "tier": "🥇 Gold"
    },
    "nightvisionxl": {
        "repo": "Disra/NightVisionXLPhotorealisticPortrait",  # VERIFIED from Civitai
        "name": "NightVision XL",
        "tier": "⭐ Specialized"
    },
    
    # === ALTERNATIVE MODELS (Since originals don't exist) ===
    "proteus-xl": {
        "repo": "dataautogpt3/ProteusV0.4",  # Alternative realistic model
        "name": "Proteus XL v0.4",
        "tier": "⭐ Specialized",
        "note": "Alternative to epiCRealism - Photorealistic"
    },
    "zavychroma-xl": {
        "repo": "stablediffusionapi/zavychroma-xl-v50",  # Try v50 instead of v80
        "name": "ZavyChroma XL V5",
        "tier": "⭐ Specialized"
    },
    
    # === ALREADY DOWNLOADED ===
    "albedobase-xl": {
        "repo": "stablediffusionapi/albedobase-xl-v13",
        "name": "AlbedoBase XL",
        "tier": "⭐ Specialized",
        "status": "✅ Already Downloaded"
    },
    "dreamshaper-xl": {
        "repo": "Lykon/dreamshaper-xl-1-0",
        "name": "DreamShaper XL",
        "tier": "⭐ Specialized",
        "status": "✅ Already Downloaded"
    },
    
    # === ADDITIONAL MODELS ===
    "architecturexl": {
        "repo": "Shakker-Labs/AWPortrait-XL",  # Architecture/Portrait specialist
        "name": "AWPortrait XL",
        "tier": "⭐ Specialized",
        "note": "Great for architecture and portraits"
    },
    "copax-timeless": {
        "repo": "Copax/Timeless_V1_Xl",  # CORRECTED path
        "name": "Copax Timeless XL",
        "tier": "⭐ Specialized"
    }
}

def download_model(model_id, model_info):
    """Download a single model from HuggingFace"""
    if model_info.get("status"):
        print(f"\n{model_info['status']}: {model_info['name']}")
        return True
        
    repo_id = model_info["repo"]
    name = model_info["name"]
    tier = model_info["tier"]
    
    print(f"\n{'='*60}")
    print(f"{tier} {name}")
    print(f"Repository: {repo_id}")
    if "note" in model_info:
        print(f"Note: {model_info['note']}")
    print(f"{'='*60}")
    
    try:
        cache_dir = snapshot_download(
            repo_id=repo_id,
            allow_patterns=["*.safetensors", "*.json", "*.txt", "*README.md"],
            ignore_patterns=["*.ckpt", "*.bin", "*.pth"],
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
    print("🎨 UPDATED SDXL Model Downloader")
    print("="*60)
    print("\nDownloading missing models with corrected repository names")
    print("Total: 6 new models to download")
    print("="*60)
    
    response = input("\nProceed with download? [y/N]: ").strip().lower()
    if response != 'y':
        print("Download cancelled.")
        return
    
    success_count = 0
    failed_models = []
    
    for model_id, model_info in MODELS_TO_DOWNLOAD.items():
        success = download_model(model_id, model_info)
        if success and not model_info.get("status"):
            success_count += 1
        elif not success:
            failed_models.append(model_info["name"])
    
    print("\n" + "="*60)
    print("📊 DOWNLOAD SUMMARY")
    print("="*60)
    print(f"✅ Successfully downloaded: {success_count} new models")
    print(f"✅ Previously downloaded: 4 models")
    print(f"✅ Total available: {success_count + 4} models")
    
    if failed_models:
        print(f"\n❌ Failed downloads:")
        for model in failed_models:
            print(f"   • {model}")
    else:
        print("\n🎉 All new models downloaded successfully!")
    
    print("="*60)

if __name__ == "__main__":
    main()
