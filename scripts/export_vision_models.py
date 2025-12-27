import os
from huggingface_hub import snapshot_download

# Define models and their target destinations
# Base directory for backends
BASE_DIR = os.path.expanduser("~/.moondream-station/models/backends")

MODELS = [
    {
        "repo_id": "vikhyatk/moondream2",
        "revision": "2024-08-26",
        "local_dir": os.path.join(BASE_DIR, "moondream_backend", "weights"),
        "ignore_patterns": ["*.md", "*.txt", ".gitattributes"]
    },
    {
        "repo_id": "Marqo/nsfw-image-detection-384",
        "revision": None,
        "local_dir": os.path.join(BASE_DIR, "nsfw_backend", "weights"),
        "ignore_patterns": ["*.md", "*.txt", ".gitattributes"]
    },
    {
        "repo_id": "SmilingWolf/wd-v1-4-vit-tagger-v2",
        "revision": None,
        "local_dir": os.path.join(BASE_DIR, "wd14_backend", "weights"),
        "ignore_patterns": ["*.md", "*.txt", ".gitattributes"]
    },
    {
        "repo_id": "microsoft/Florence-2-large",
        "revision": None,
        "local_dir": os.path.join(BASE_DIR, "florence2_backend", "weights"),
        "ignore_patterns": ["*.md", "*.txt", ".gitattributes"]
    }
]

def export_models():
    print("Starting proper HuggingFace model export...")
    
    for model in MODELS:
        print(f"\n--- Processing {model['repo_id']} ---")
        target_dir = model['local_dir']
        
        # Ensure directory exists
        os.makedirs(target_dir, exist_ok=True)
        
        try:
            print(f"Exporting to: {target_dir}")
            # snapshot_download handles the "correct" logic:
            # 1. Checks cache first (no re-download if cached)
            # 2. Hardlinks or copies files to local_dir
            # 3. Ensures integrity
            path = snapshot_download(
                repo_id=model['repo_id'],
                revision=model['revision'],
                local_dir=target_dir,
                local_dir_use_symlinks=False, # We want actual files
                ignore_patterns=model['ignore_patterns']
            )
            print(f"✅ Successfully exported {model['repo_id']}")
        except Exception as e:
            print(f"❌ Failed to export {model['repo_id']}: {e}")

if __name__ == "__main__":
    export_models()
