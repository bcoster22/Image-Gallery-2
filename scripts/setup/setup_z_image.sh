#!/bin/bash
set -e

echo "Installing Z-Image 6b dependencies..."

# Install core libraries for diffusion and transformers
# Using --break-system-packages as requested for local environment override
pip install --upgrade diffusers transformers accelerate protobuf sentencepiece modelscope --break-system-packages

echo "Creating backend directory..."
mkdir -p /home/bcoster/.moondream-station/moondream-station/backends/z_image_backend

echo "Setup complete. Please restart Moondream Station."
