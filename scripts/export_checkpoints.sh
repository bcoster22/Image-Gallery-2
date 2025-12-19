#!/bin/bash
# Export SDXL checkpoint files from cache blobs to clean models folder

MODELS_DIR="$HOME/.moondream-station/models/sdxl-checkpoints"
mkdir -p "$MODELS_DIR"

echo "============================================================"
echo "📦 Exporting SDXL Checkpoint Files"
echo "============================================================"
echo "Target: $MODELS_DIR"
echo ""

# Function to find and copy largest checkpoint from model directory
export_checkpoint() {
    local model_dir=$1
    local output_name=$2
    
    echo "📥 Processing: $output_name"
    
    # Find the largest safetensors file (main checkpoint, not VAE or other components)
    local largest_file=$(find "$model_dir/blobs/" -type f -size +5G 2>/dev/null | head -1)
    
    if [ -z "$largest_file" ]; then
        echo "   ⚠️  No checkpoint found (looking for files >5GB)"
        return 1
    fi
    
    local size=$(du -h "$largest_file" | cut -f1)
    echo "   Found: $size checkpoint"
    
    # Copy to models directory with proper name
    cp "$largest_file" "$MODELS_DIR/$output_name.safetensors"
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Exported: $output_name.safetensors"
        return 0
    else
        echo "   ❌ Failed to export"
        return 1
    fi
}

# Export each model (taking the largest checkpoint from each)
export_checkpoint "$HOME/.moondream-station/models/sdxl-models/juggernaut-xl" "juggernaut-xl-lightning"
export_checkpoint "$HOME/.moondream-station/models/sdxl-models/realvisxl-v5" "realvisxl-v5"
export_checkpoint "$HOME/.moondream-station/models/sdxl-models/cyberrealistic-xl" "cyberrealistic-xl"
export_checkpoint "$HOME/.moondream-station/models/sdxl-models/dreamshaper-xl" "dreamshaper-xl"
export_checkpoint "$HOME/.moondream-station/models/sdxl-models/nightvision-xl" "nightvision-xl"
export_checkpoint "$HOME/.moondream-station/models/sdxl-models/proteus-xl" "proteus-xl"
export_checkpoint "$HOME/.moondream-station/models/sdxl-models/animagine-xl" "animagine-xl"

echo ""
echo "============================================================"
echo "📊 EXPORT SUMMARY"
echo "============================================================"
echo ""
echo "Exported checkpoints:"
ls -lh "$MODELS_DIR"/*.safetensors 2>/dev/null | awk '{print "  " $9 " - " $5}'
echo ""
echo "Total size:"
du -sh "$MODELS_DIR"
echo ""
echo "✅ Checkpoints ready for single-file loading!"
echo "============================================================"
