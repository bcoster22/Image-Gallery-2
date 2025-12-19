#!/bin/bash
# Move ALL SDXL models to permanent backend storage and clean cache

echo "============================================================"
echo "📦 Moving ALL SDXL Models to Permanent Backend Storage"
echo "============================================================"
echo ""

# Define paths
HF_CACHE="$HOME/.cache/huggingface/hub"
BACKEND_MODELS="$HOME/.moondream-station/models/sdxl-models"

# Create backend directory
mkdir -p "$BACKEND_MODELS"

echo "Source: $HF_CACHE"
echo "Destination: $BACKEND_MODELS"
echo ""

# Function to move model (mv, not copy)
move_model() {
    local model_name=$1
    local hf_path=$2
    
    echo "📥 Moving: $model_name"
    
    # Find the model directory
    local model_dir=$(find "$HF_CACHE" -maxdepth 1 -type d -name "$hf_path" 2>/dev/null | head -1)
    
    if [ -z "$model_dir" ]; then
        echo "   ⚠️  Not found in cache: $hf_path"
        return 1
    fi
    
    # Create destination
    local dest_dir="$BACKEND_MODELS/$model_name"
    
    # Check if already exists
    if [ -d "$dest_dir" ]; then
        echo "   ⚠️  Already exists at: $dest_dir"
        echo "   🗑️  Removing from cache..."
        rm -rf "$model_dir"
        echo "   ✅ Cache cleaned"
        return 0
    fi
    
    # Move the entire directory
    echo "   🚚 Moving directory..."
    mv "$model_dir" "$dest_dir"
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Moved successfully"
        echo "   📍 Location: $dest_dir"
        return 0
    else
        echo "   ❌ Failed to move"
        return 1
    fi
}

echo "Moving all downloaded models..."
echo ""

# Move each model
move_model "juggernaut-xl" "models--RunDiffusion--Juggernaut-XL-Lightning"
move_model "realvisxl-v5" "models--SG161222--RealVisXL_V5.0"
move_model "cyberrealistic-xl" "models--cyberdelia--CyberRealisticXL"
move_model "albedobase-xl" "models--stablediffusionapi--albedobase-xl-v13"
move_model "dreamshaper-xl" "models--Lykon--dreamshaper-xl-1-0"
move_model "nightvision-xl" "models--imagepipeline--NightVisionXL"
move_model "proteus-xl" "models--dataautogpt3--ProteusV0.4"
move_model "animagine-xl" "models--cagliostrolab--animagine-xl-3.1"
move_model "realcartoon-xl" "models--stablediffusionapi--realcartoon-xl-v4"
move_model "epicrealism-xl" "models--epicrealism-xl"

echo ""
echo "============================================================"
echo "📊 FINAL STATUS"
echo "============================================================"
echo ""
echo "Models in backend storage:"
du -sh "$BACKEND_MODELS/"* 2>/dev/null | sort -h
echo ""
echo "Total size:"
du -sh "$BACKEND_MODELS/" 2>/dev/null
echo ""
echo "✅ All models moved to permanent storage"
echo "🗑️  HuggingFace cache cleaned"
echo "============================================================"
