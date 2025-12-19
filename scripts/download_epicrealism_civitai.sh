#!/bin/bash
# Download epiCRealism XL models from Civitai

echo "============================================================"
echo "🎨 Downloading epiCRealism XL Models from Civitai"
echo "============================================================"
echo ""
echo "Downloading 2 models:"
echo "  1. epicrealism XL PureFix"
echo "  2. epicella XL Photo V1"
echo ""
echo "Destination: ~/.cache/huggingface/hub/models--epicrealism-xl/"
echo "============================================================"
echo ""

# Create directory for the models
MODELS_DIR="$HOME/.cache/huggingface/hub/models--epicrealism-xl/snapshots/manual-download"
mkdir -p "$MODELS_DIR"

echo "📥 Downloading epicrealismXL PureFix..."
wget -O "$MODELS_DIR/epicrealismXL_pureFix.safetensors" \
  "https://civitai-delivery-worker-prod.5ac0637cfd0766c97916cefa3764fbdf.r2.cloudflarestorage.com/model/81744/epicrealismxlPureFix.Dm66.safetensors?X-Amz-Expires=86400&response-content-disposition=attachment%3B%20filename%3D%22epicrealismXL_pureFix.safetensors%22&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=e01358d793ad6966166af8b3064953ad/20251219/us-east-1/s3/aws4_request&X-Amz-Date=20251219T145950Z&X-Amz-SignedHeaders=host&X-Amz-Signature=734d8115f2b8c5cb07ec3e3479fb6021d395ee2fe61b3b4f45e5c104f6c10bf4"

if [ $? -eq 0 ]; then
    echo "✅ PureFix downloaded successfully!"
else
    echo "❌ PureFix download failed"
fi

echo ""
echo "📥 Downloading epicellaXL Photo V1..."
wget -O "$MODELS_DIR/epicellaXL_photoV1.safetensors" \
  "https://civitai-delivery-worker-prod.5ac0637cfd0766c97916cefa3764fbdf.r2.cloudflarestorage.com/model/81744/epicellaxlPhoto.eo24.safetensors?X-Amz-Expires=86400&response-content-disposition=attachment%3B%20filename%3D%22epicellaXL_photoV1.safetensors%22&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=e01358d793ad6966166af8b3064953ad/20251219/us-east-1/s3/aws4_request&X-Amz-Date=20251219T150107Z&X-Amz-SignedHeaders=host&X-Amz-Signature=d5f12feaa68f5e5a241bf9dcf02a1ed2ff0a204ecc8b1532673c157a1282fcb9"

if [ $? -eq 0 ]; then
    echo "✅ Photo V1 downloaded successfully!"
else
    echo "❌ Photo V1 download failed"
fi

echo ""
echo "============================================================"
echo "📊 DOWNLOAD SUMMARY"
echo "============================================================"
echo "Downloaded to: $MODELS_DIR"
echo ""
ls -lh "$MODELS_DIR"/*.safetensors 2>/dev/null && echo "" && echo "✅ epiCRealism XL models ready!" || echo "❌ No models downloaded"
echo "============================================================"
