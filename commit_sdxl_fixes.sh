#!/bin/bash
# Commit SDXL Remix fixes

cd /home/bcoster/Documents/Github_Projects/Gallery/Image-Gallery-2

echo "Staging modified files..."
git add sdxl_backend_new.py App.tsx SDXL_REMIX_FIXES.md

echo "Creating commit..."
git commit -m "fix: Resolve SDXL Remix failures (meta tensor, OOM, save errors)

- Disable 4-bit quantization to avoid accelerate hook conflicts
- Use fp16 + sequential CPU offload for VRAM management  
- Fix frontend to extract .image from GenerationResult object
- Add detailed error messages for save failures

Fixes persistent Remix crashes and 'Failed to fetch' save errors.
Model now loads reliably at ~386MB VRAM and generates successfully."

echo "Commit created successfully!"
echo ""
echo "To push to remote, run:"
echo "  git push origin main"
