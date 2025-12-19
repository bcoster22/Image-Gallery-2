#!/usr/bin/env python3
"""
Final 2 Models - ZavyChroma XL & HelloWorld XL
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from huggingface_hub import snapshot_download

MODELS_TO_DOWNLOAD = {
    "zavychroma-xl": {
        "repo": "imagepipeline/Zavy-Chroma-XL-v3",
        "name": "ZavyChroma XL V3",
        "tier": "⭐ Specialized",
        "note": "Magic realism with vibrant colors"
    },
    "helloworld-xl": {
        "repo": "LEOSAM/HelloWorld-SDXL",
        "name": "HelloWorld XL",
        "tier": "⭐ Specialized",
        "note": "Hyper realistic, diverse subjects"
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
    print("🎨 Final 2 Original Models Download")
    print("="*60)
    print("\nDownloading:")
    print("  1. ZavyChroma XL V3 - Vibrant magic realism")
    print("  2. HelloWorld XL - Hyper realistic diversity")
    print("\nEstimated total size: ~10-12 GB")
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
    print("📊 FINAL COMPLETE SUMMARY")
    print("="*60)
    print(f"✅ Successfully downloaded: {success_count}/2 final models")
    print(f"✅ TOTAL SDXL MODELS: {9 + success_count} models!")
    
    if success_count == 2:
        print("\n🎉🎉🎉 ALL 11 MODELS DOWNLOADED! 🎉🎉🎉")
        print("\n🎨 Complete Professional SDXL Library:")
        print("   Gold Tier (3):")
        print("     • Juggernaut XL")
        print("     • RealVisXL V5")
        print("     • CyberRealistic XL")
        print("   Specialized (8):")
        print("     • AlbedoBase XL")
        print("     • DreamShaper XL")
        print("     • NightVision XL")
        print("     • ZavyChroma XL")
        print("     • HelloWorld XL")
        print("     • Proteus XL")
        print("     • Animagine XL")
        print("     • RealCartoon XL")
        print("\n✅ 13 Schedulers (built-in)")
        print("✅ 7 Samplers (built-in)")
        print("✅ 10 God Tier Presets")
        print("\n🚀 Ready for production!")
    elif failed_models:
        print(f"\n❌ Failed downloads:")
        for model in failed_models:
            print(f"   • {model}")
    
    print("="*60)

if __name__ == "__main__":
    main()
