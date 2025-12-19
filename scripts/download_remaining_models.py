#!/usr/bin/env python3
"""
Complete SDXL Model Collection - All Remaining Models
Verified HuggingFace repositories only
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from huggingface_hub import snapshot_download

# ALL REMAINING VERIFIED MODELS
MODELS_TO_DOWNLOAD = {
    "nightvision-xl": {
        "repo": "imagepipeline/NightVisionXL",
        "name": "NightVision XL",
        "tier": "⭐ Specialized",
        "note": "Dark/moody scenes, evening/night photography"
    },
    "copax-timeless-xl": {
        "repo": "John6666/copax-timeless-xl-sdxl",
        "name": "Copax Timeless XL",
        "tier": "⭐ Specialized",
        "note": "Vibrant colors, high contrast, artistic"
    },
    "proteus-xl": {
        "repo": "dataautogpt3/ProteusV0.4",
        "name": "Proteus XL v0.4",
        "tier": "⭐ Specialized",
        "note": "Alternative photorealistic model"
    },
    "animagine-xl": {
        "repo": "cagliostrolab/animagine-xl-3.1",
        "name": "Animagine XL 3.1",
        "tier": "⭐ Specialized",
        "note": "Anime/artistic style (alternative to ZavyChroma)"
    },
    "realcartoon-xl": {
        "repo": "stablediffusionapi/realcartoon-xl-v4",
        "name": "RealCartoon XL V4",
        "tier": "⭐ Specialized",
        "note": "Stylized realism (alternative to HelloWorld)"
    }
}

def download_model(model_id, model_info):
    """Download a single model from HuggingFace"""
    repo_id = model_info["repo"]
    name = model_info["name"]
    tier = model_info["tier"]
    
    print(f"\n{'='*60}")
    print(f"{tier} {name}")
    print(f"Repository: {repo_id}")
    print(f"Note: {model_info.get('note', 'N/A')}")
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
    print("🎨 Complete SDXL Model Collection Downloader")
    print("="*60)
    print("\nDownloading 5 additional specialized models:")
    print("  1. NightVision XL - Dark/moody scenes")
    print("  2. Copax Timeless XL - Vibrant artistic")
    print("  3. Proteus XL - Photorealistic")
    print("  4. Animagine XL - Anime/artistic")
    print("  5. RealCartoon XL - Stylized realism")
    print("\nEstimated total size: ~25-30 GB")
    print("="*60)
    
    response = input("\nProceed with download? [y/N]: ").strip().lower()
    if response != 'y':
        print("Download cancelled.")
        return
    
    success_count = 0
    failed_models = []
    
    for model_id, model_info in MODELS_TO_DOWNLOAD.items():
        success = download_model(model_id, model_info)
        if success:
            success_count += 1
        else:
            failed_models.append(model_info["name"])
    
    print("\n" + "="*60)
    print("📊 FINAL DOWNLOAD SUMMARY")
    print("="*60)
    print(f"✅ Successfully downloaded: {success_count}/5 new models")
    print(f"✅ Previously downloaded: 5 models")
    print(f"✅ TOTAL AVAILABLE: {success_count + 5} SDXL MODELS!")
    
    print("\n🎨 Complete Model Collection:")
    print("   Gold Tier:")
    print("     • Juggernaut XL - Cinematic")
    print("     • RealVisXL V5 - Photography")
    print("     • CyberRealistic XL - Portraits")
    print("   Specialized:")
    print("     • AlbedoBase XL - General purpose")
    print("     • DreamShaper XL - Fantasy")
    if success_count >= 1:
        print("     • NightVision XL - Dark/moody")
    if success_count >= 2:
        print("     • Copax Timeless XL - Vibrant")
    if success_count >= 3:
        print("     • Proteus XL - Photorealistic")
    if success_count >= 4:
        print("     • Animagine XL - Anime/artistic")
    if success_count >= 5:
        print("     • RealCartoon XL - Stylized")
    
    if failed_models:
        print(f"\n❌ Failed downloads:")
        for model in failed_models:
            print(f"   • {model}")
    else:
        print("\n🎉 ALL MODELS DOWNLOADED SUCCESSFULLY!")
        print("\n🚀 You now have a complete professional SDXL model library!")
    
    print("="*60)

if __name__ == "__main__":
    main()
