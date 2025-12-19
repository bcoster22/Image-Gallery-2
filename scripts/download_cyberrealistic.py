#!/usr/bin/env python3
"""
Focused download - Only missing high-priority models with verified repos
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from huggingface_hub import snapshot_download

# VERIFIED MODELS ONLY
MODELS_TO_DOWNLOAD = {
    "cyberrealistic-xl": {
        "repo": "cyberdelia/CyberRealisticXL",
        "name": "CyberRealistic XL",
        "tier": "🥇 Gold",
        "patterns": [
            "**/CyberRealisticXLPlay_V8.0_FP16.safetensors",  # Just the latest FP16 version
            "**/*.json",
            "**/*.txt",
            "**/README.md"
        ]
    }
}

def download_model(model_id, model_info):
    """Download a single model with specific file patterns"""
    repo_id = model_info["repo"]
    name = model_info["name"]
    tier = model_info["tier"]
    patterns = model_info.get("patterns", ["*.safetensors", "*.json", "*.txt"])
    
    print(f"\n{'='*60}")
    print(f"{tier} {name}")
    print(f"Repository: {repo_id}")
    print(f"Downloading: {patterns[0]}")
    print(f"{'='*60}")
    
    try:
        cache_dir = snapshot_download(
            repo_id=repo_id,
            allow_patterns=patterns,
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
    print("🎨 Focused Model Download - CyberRealistic XL Only")
    print("="*60)
    print("\nDownloading: CyberRealistic XL V8.0 FP16 (~7 GB)")
    print("This is the Gold Tier portrait specialist model")
    print("="*60)
    
    response = input("\nProceed with download? [y/N]: ").strip().lower()
    if response != 'y':
        print("Download cancelled.")
        return
    
    success_count = 0
    
    for model_id, model_info in MODELS_TO_DOWNLOAD.items():
        success = download_model(model_id, model_info)
        if success:
            success_count += 1
    
    print("\n" + "="*60)
    print("📊 DOWNLOAD SUMMARY")
    print("="*60)
    
    if success_count > 0:
        print(f"✅ Successfully downloaded: {success_count} model(s)")
        print(f"✅ Total models available: 5 (Juggernaut, RealVis, AlbedoBase, DreamShaper, CyberRealistic)")
        print("\n🎉 You now have all Gold Tier models!")
        print("\n🚀 Ready to use:")
        print("   • Juggernaut XL - Cinematic scenes")
        print("   • RealVisXL V5 - Raw photography")
        print("   • CyberRealistic XL - Portrait detail")
        print("   • AlbedoBase XL - General purpose")
        print("   • DreamShaper XL - Fantasy/creative")
    else:
        print("❌ Download failed. Check error messages above.")
    
    print("="*60)

if __name__ == "__main__":
    main()
