#!/bin/bash
# Download AlbedoBase XL v1.3 from HuggingFace
# Model: stablediffusionapi/albedobase-xl-v13

set -e

MODEL_DIR="$HOME/.moondream-station/models/checkpoints"
MODEL_FILE="albedobase-xl.safetensors"
HF_REPO="stablediffusionapi/albedobase-xl-v13"

echo "Downloading AlbedoBase XL to $MODEL_DIR/$MODEL_FILE..."

# Create directory if it doesn't exist
mkdir -p "$MODEL_DIR"

# Download using huggingface-cli
huggingface-cli download "$HF_REPO" \
    --local-dir "$MODEL_DIR/temp_albedobase" \
    --local-dir-use-symlinks False

# Find and move the .safetensors file
SAFETENSORS_FILE=$(find "$MODEL_DIR/temp_albedobase" -name "*.safetensors" -type f | head -1)

if [ -n "$SAFETENSORS_FILE" ]; then
    mv "$SAFETENSORS_FILE" "$MODEL_DIR/$MODEL_FILE"
    rm -rf "$MODEL_DIR/temp_albedobase"
    echo "✅ Downloaded successfully: $MODEL_DIR/$MODEL_FILE"
    ls -lh "$MODEL_DIR/$MODEL_FILE"
else
    echo "❌ Error: No .safetensors file found in download"
    exit 1
fi
