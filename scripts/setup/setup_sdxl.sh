#!/bin/bash
# Install dependencies for SDXL Turbo/Lightning with 4-bit quantization support

echo "Installing SDXL dependencies..."

# Use pip to install required packages
# bitsandbytes: Required for 4-bit/8-bit quantization
# accelerate: Required for device mapping and offloading
# diffusers: Core library
# transformers: Required pipeline components
# peft: Often needed for LoRA/adapters
pip install --break-system-packages \
    diffusers \
    transformers \
    accelerate \
    bitsandbytes \
    protobuf \
    sentencepiece \
    peft

echo "Dependencies installed."
