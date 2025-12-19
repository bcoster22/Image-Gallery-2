#!/bin/bash
# Download additional CyberRealistic XL models from Civitai

echo "============================================================"
echo "🎨 Downloading CyberRealistic XL V8.0 from Civitai"
echo "============================================================"
echo ""
echo "Downloading:"
echo "  1. CyberRealistic XL V8.0 (Latest full version)"
echo "  2. CyberRealistic Pony V1.5 (Pony Diffusion based)"
echo ""
echo "Destination: ~/.cache/huggingface/hub/models--cyberdelia--CyberRealisticXL/"
echo "============================================================"
echo ""

# Use the existing CyberRealistic directory
MODELS_DIR="$HOME/.cache/huggingface/hub/models--cyberdelia--CyberRealisticXL/snapshots/civitai-models"
mkdir -p "$MODELS_DIR"

echo "📥 Downloading CyberRealistic XL V8.0..."
wget -O "$MODELS_DIR/cyberrealisticXL_v80.safetensors" \
  "https://civitai-delivery-worker-prod.5ac0637cfd0766c97916cefa3764fbdf.r2.cloudflarestorage.com/model/6357/cyberrealisticxlplayV8.nta3.safetensors?X-Amz-Expires=86400&response-content-disposition=attachment%3B%20filename%3D%22cyberrealisticXL_v80.safetensors%22&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=e01358d793ad6966166af8b3064953ad/20251219/us-east-1/s3/aws4_request&X-Amz-Date=20251219T150912Z&X-Amz-SignedHeaders=host&X-Amz-Signature=ba4d3f0a513275ab443612ea6a0d53cf4afb698999441e31d59b68af14f2b119"

if [ $? -eq 0 ]; then
    echo "✅ CyberRealistic XL V8.0 downloaded successfully!"
else
    echo "❌ V8.0 download failed"
fi

echo ""
echo "📥 Downloading CyberRealistic Pony V1.5..."
wget -O "$MODELS_DIR/cyberrealisticPony_v150.safetensors" \
  "https://civitai-delivery-worker-prod.5ac0637cfd0766c97916cefa3764fbdf.r2.cloudflarestorage.com/model/6357/cyberrealisticponyV15.SXvL.safetensors?X-Amz-Expires=86400&response-content-disposition=attachment%3B%20filename%3D%22cyberrealisticPony_v150.safetensors%22&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=e01358d793ad6966166af8b3064953ad/20251219/us-east-1/s3/aws4_request&X-Amz-Date=20251219T151028Z&X-Amz-SignedHeaders=host&X-Amz-Signature=92cd10075c03d245cd65901c27992b2a33f5f2a0add452ffcc359a1027ea4ff2"

if [ $? -eq 0 ]; then
    echo "✅ CyberRealistic Pony V1.5 downloaded successfully!"
else
    echo "❌ Pony V1.5 download failed"
fi

echo ""
echo "============================================================"
echo "📊 DOWNLOAD SUMMARY"
echo "============================================================"
echo "Downloaded to: $MODELS_DIR"
echo ""
ls -lh "$MODELS_DIR"/*.safetensors 2>/dev/null && echo "" && echo "✅ CyberRealistic models ready!" || echo "❌ No models downloaded"
echo "============================================================"
