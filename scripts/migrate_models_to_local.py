#!/usr/bin/env python3
"""
Script to move models from HuggingFace cache to local model directories.
This makes models completely local and offline-capable.
"""
import os
import shutil
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import paths
from backend.local_models import LOCAL_MODELS

def find_hf_cache_path(repo_id: str) -> Path:
    """Find the HuggingFace cache path for a given repo"""
    # HF cache uses format: models--username--model-name
    cache_name = repo_id.replace("/", "--")
    hf_cache = Path.home() / ".cache" / "huggingface" / "hub" / f"models--{cache_name}"
    
    if hf_cache.exists():
        # Find the snapshots directory
        snapshots = hf_cache / "snapshots"
        if snapshots.exists():
            # Get the latest snapshot
            snapshots_list = list(snapshots.iterdir())
            if snapshots_list:
                return snapshots_list[0]  # Use first (latest) snapshot
    
    return None

def copy_model_to_local(model_id: str, config: dict, dry_run: bool = False):
    """Copy a model from HF cache to local directory"""
    hf_repo = config["hf_fallback"]
    local_path = Path(config["path"])
    
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Processing: {model_id}")
    print(f"  HF Repo: {hf_repo}")
    print(f"  Local Path: {local_path}")
    
    # Check if already local
    if local_path.exists() and list(local_path.glob("*.json")):
        print(f"  ✓ Already exists locally")
        return True
    
    # Find in HF cache
    cache_path = find_hf_cache_path(hf_repo)
    if not cache_path:
        print(f"  ✗ Not found in HF cache: {hf_repo}")
        return False
    
    print(f"  Found in cache: {cache_path}")
    
    if dry_run:
        # Show what would be copied
        files = list(cache_path.glob("*"))
        print(f"  Would copy {len(files)} files:")
        for f in files[:5]:
            print(f"    - {f.name}")
        if len(files) > 5:
            print(f"    ... and {len(files) - 5} more")
        return True
    
    # Create local directory
    local_path.mkdir(parents=True, exist_ok=True)
    
    # Copy all files
    files_copied = 0
    for src_file in cache_path.iterdir():
        if src_file.is_file():
            dest_file = local_path / src_file.name
            print(f"    Copying: {src_file.name}")
            shutil.copy2(src_file, dest_file)
            files_copied += 1
    
    print(f"  ✓ Copied {files_copied} files to {local_path}")
    return True

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Migrate models from HF cache to local directories")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without doing it")
    parser.add_argument("--model", type=str, help="Migrate specific model ID only")
    args = parser.parse_args()
    
    print("=" * 60)
    print("Model Migration Tool: HuggingFace Cache → Local")
    print("=" * 60)
    
    if args.dry_run:
        print("\n⚠️  DRY RUN MODE - No files will be copied\n")
    
    # Get models to migrate
    models_to_migrate = {}
    if args.model:
        if args.model in LOCAL_MODELS:
            models_to_migrate[args.model] = LOCAL_MODELS[args.model]
        else:
            print(f"Error: Model '{args.model}' not found in LOCAL_MODELS config")
            return 1
    else:
        models_to_migrate = LOCAL_MODELS
    
    # Migrate each model
    success_count = 0
    skip_count = 0
    fail_count = 0
    
    for model_id, config in models_to_migrate.items():
        result = copy_model_to_local(model_id, config, dry_run=args.dry_run)
        if result is True:
            success_count += 1
        elif result is None:
            skip_count += 1
        else:
            fail_count += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("Summary:")
    print(f"  ✓ Success: {success_count}")
    print(f"  ⊘ Skipped (already local): {skip_count}")
    print(f"  ✗ Failed: {fail_count}")
    print("=" * 60)
    
    if args.dry_run:
        print("\nℹ️  This was a dry run. Run without --dry-run to actually copy files.")
    elif success_count > 0:
        print(f"\n✓ Models are now local in: {paths.MODELS_ROOT}")
        print("  You can now run the server completely offline!")
    
    return 0 if fail_count == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
