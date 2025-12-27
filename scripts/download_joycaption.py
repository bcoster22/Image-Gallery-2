#!/usr/bin/env python3
"""
Download JoyCaption Alpha 2 model to HuggingFace cache.
After running this, use migrate_models_to_local.py to move it to local storage.

NOTE: The model will be quantized to 4-bit at runtime for 8GB VRAM compatibility.
"""
from transformers import LlavaForConditionalGeneration, AutoProcessor, BitsAndBytesConfig
import torch

print("Downloading JoyCaption Alpha 2...")
print("Model: fancyfeast/llama-joycaption-alpha-two-hf-llava")
print("NOTE: Model will use 4-bit quantization at runtime for 8GB VRAM")
print()

try:
    print("Downloading model (LLaVA architecture)...")
    print("This will download the full model (~8GB), but it will be quantized to 4-bit at runtime")
    
    # Download without loading to save memory during download
    model = LlavaForConditionalGeneration.from_pretrained(
        "fancyfeast/llama-joycaption-alpha-two-hf-llava",
        trust_remote_code=True,
        torch_dtype=torch.float16,  # Download in fp16
        device_map="cpu"  # Keep on CPU during download
    )
    print("✓ Model downloaded")
    
    print("Downloading processor...")
    processor = AutoProcessor.from_pretrained(
        "fancyfeast/llama-joycaption-alpha-two-hf-llava",
        trust_remote_code=True
    )
    print("✓ Processor downloaded")
    
    print()
    print("=" * 60)
    print("✅ JoyCaption Alpha 2 downloaded successfully!")
    print()
    print("Next steps:")
    print("1. Run: python3 scripts/migrate_models_to_local.py --model joycaption-alpha-2")
    print("2. Restart backend: python3 backend/main.py --port 2020")
    print("=" * 60)
    
except Exception as e:
    print(f"✗ Error: {e}")
    print()
    print("Make sure you have internet connection and sufficient disk space.")
