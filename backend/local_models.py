"""
Configuration for local vision and analysis models.
Maps model IDs to local directory paths instead of HuggingFace repos.
"""
import os
from backend import paths

# Local model configurations
LOCAL_MODELS = {
    # Vision Models - stored in vision directory
    "moondream-2": {
        "path": os.path.join(paths.VISION_MODELS_DIR, "moondream2"),
        "hf_fallback": "vikhyatk/moondream2",
        "type": "vision"
    },
    "moondream2": {
        "path": os.path.join(paths.VISION_MODELS_DIR, "moondream2"),
        "hf_fallback": "vikhyatk/moondream2", 
        "type": "vision"
    },
    "vikhyatk/moondream2": {
        "path": os.path.join(paths.VISION_MODELS_DIR, "moondream2"),
        "hf_fallback": "vikhyatk/moondream2",
        "type": "vision"
    },
    "moondream-3": {
        "path": os.path.join(paths.VISION_MODELS_DIR, "moondream3-4bit"),
        "hf_fallback": "vikhyatk/moondream2-4bit",
        "type": "vision"
    },
    "florence-2-large-4bit": {
        "path": os.path.join(paths.VISION_MODELS_DIR, "florence-2-large"),
        "hf_fallback": "microsoft/Florence-2-large",
        "type": "vision"
    },
    "joycaption-alpha-2": {
        "path": os.path.join(paths.VISION_MODELS_DIR, "joy-caption-alpha-two"),
        "hf_fallback": "fancyfeast/llama-joycaption-alpha-two-hf-llava",
        "type": "vision"
    },
    
    # Analysis Models - stored in analysis directory
    "wd14-vit-v2": {
        "path": os.path.join(paths.ANALYSIS_MODELS_DIR, "wd-vit-tagger-v2"),
        "hf_fallback": "SmilingWolf/wd-v1-4-vit-tagger-v2",
        "type": "analysis"
    },
    "wd14-vit-v3": {
        "path": os.path.join(paths.ANALYSIS_MODELS_DIR, "wd-vit-tagger-v3"),
        "hf_fallback": "SmilingWolf/wd-vit-tagger-v3",
        "type": "analysis"
    },
    "wd-vit-tagger-v3": {
        "path": os.path.join(paths.ANALYSIS_MODELS_DIR, "wd-vit-tagger-v3"),
        "hf_fallback": "SmilingWolf/wd-vit-tagger-v3",
        "type": "analysis"
    }
}

def get_local_model_path(model_id: str) -> tuple[str, bool]:
    """
    Get local path for a model ID.
    Returns: (path, is_local)
        - path: Local directory path or HuggingFace repo ID
        - is_local: True if model exists locally, False if fallback to HF
    """
    if model_id not in LOCAL_MODELS:
        # Unknown model, return as-is (might be HF repo ID)
        return model_id, False
    
    config = LOCAL_MODELS[model_id]
    local_path = config["path"]
    
    # Check if model exists locally
    if os.path.exists(local_path) and os.path.isdir(local_path):
        # Verify it has required files
        has_config = os.path.exists(os.path.join(local_path, "config.json"))
        has_model = (
            os.path.exists(os.path.join(local_path, "model.safetensors")) or
            os.path.exists(os.path.join(local_path, "pytorch_model.bin")) or
            os.path.exists(os.path.join(local_path, "model.onnx"))
        )
        
        if has_config and has_model:
            return local_path, True
    
    # Fallback to HuggingFace repo
    return config["hf_fallback"], False

def get_model_type(model_id: str) -> str:
    """Get the type of model (vision/analysis/generation)"""
    if model_id in LOCAL_MODELS:
        return LOCAL_MODELS[model_id]["type"]
    return "unknown"
