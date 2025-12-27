import os

# Define the root models directory
# If MOONDREAM_MODELS_DIR env var is set, use it. Otherwise default to ~/.moondream-station/models
MODELS_ROOT = os.environ.get("MOONDREAM_MODELS_DIR", os.path.expanduser("~/.moondream-station/models"))

# --- 1. Must-Have Folders ---
CHECKPOINTS_DIR = os.path.join(MODELS_ROOT, "checkpoints")
LORAS_DIR = os.path.join(MODELS_ROOT, "loras")
VAE_DIR = os.path.join(MODELS_ROOT, "vae")
UPSCALE_MODELS_DIR = os.path.join(MODELS_ROOT, "upscale_models")
CONTROLNET_DIR = os.path.join(MODELS_ROOT, "controlnet")

# --- 2. Advanced / Split Model Folders ---
UNET_DIR = os.path.join(MODELS_ROOT, "unet")
CLIP_DIR = os.path.join(MODELS_ROOT, "clip")
CLIP_VISION_DIR = os.path.join(MODELS_ROOT, "clip_vision")
VAE_APPROX_DIR = os.path.join(MODELS_ROOT, "vae_approx")

# --- 3. Specialized / Niche Folders ---
EMBEDDINGS_DIR = os.path.join(MODELS_ROOT, "embeddings")
STYLE_MODELS_DIR = os.path.join(MODELS_ROOT, "style_models")
GLIGEN_DIR = os.path.join(MODELS_ROOT, "gligen")
PHOTOMAKER_DIR = os.path.join(MODELS_ROOT, "photomaker")
HYPERNETWORKS_DIR = os.path.join(MODELS_ROOT, "hypernetworks")
DIFFUSERS_DIR = os.path.join(MODELS_ROOT, "diffusers")

# --- 4. System / App ---
BACKENDS_DIR = os.path.join(MODELS_ROOT, "backends")

# --- 5. Vision & Analysis Models ---
VISION_MODELS_DIR = os.path.join(MODELS_ROOT, "vision")
ANALYSIS_MODELS_DIR = os.path.join(MODELS_ROOT, "analysis")

def ensure_directories():
    """Ensure all model directories exist"""
    dirs = [
        CHECKPOINTS_DIR, LORAS_DIR, VAE_DIR, UPSCALE_MODELS_DIR, CONTROLNET_DIR,
        UNET_DIR, CLIP_DIR, CLIP_VISION_DIR, VAE_APPROX_DIR,
        EMBEDDINGS_DIR, STYLE_MODELS_DIR, GLIGEN_DIR, PHOTOMAKER_DIR, HYPERNETWORKS_DIR, DIFFUSERS_DIR,
        BACKENDS_DIR, VISION_MODELS_DIR, ANALYSIS_MODELS_DIR
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

# Ensure directories on module import
ensure_directories()
