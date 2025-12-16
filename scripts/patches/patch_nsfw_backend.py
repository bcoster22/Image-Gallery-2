import os

def patch_nsfw():
    path = os.path.expanduser("~/.moondream-station/models/backends/nsfw_backend/backend.py")
    
    with open(path, 'r') as f:
        content = f.read()
        
    # 1. Fix get_model to avoid meta tensor error
    # We will pass low_cpu_mem_usage=False to prevent accelerate from using meta device
    
    old_load = '_model = AutoModelForImageClassification.from_pretrained(model_id, trust_remote_code=True)'
    new_load = '_model = AutoModelForImageClassification.from_pretrained(model_id, trust_remote_code=True, low_cpu_mem_usage=False)'
    
    if old_load in content:
        content = content.replace(old_load, new_load)
        print("Fixed model loading to avoid meta tensor error.")
    elif "low_cpu_mem_usage=False" in content:
        print("Model loading already fixed.")
    else:
        print("Could not find exact loading line to patch.")
        
    # 2. Add unload function
    unload_func = """
def unload():
    global _model, _processor
    import gc
    import torch
    
    logger.info("Unloading NSFW Backend...")
    _model = None
    _processor = None
    
    gc.collect()
    try:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except:
        pass
    logger.info("NSFW Backend unloaded.")
"""

    if "def unload():" not in content:
        content += unload_func
        print("Added unload function.")
    else:
        print("Unload function already exists.")

    with open(path, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_nsfw()
