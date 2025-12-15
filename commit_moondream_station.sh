#!/bin/bash
# Commit moondream-station post-load memory cleanup fix

cd ~/.moondream-station/moondream-station

echo "Checking git status..."
git status

echo ""
echo "Staging modified files..."
git add moondream_station/core/inference_service.py

echo ""
echo "Creating commit..."
git commit -m "feat: Add post-load memory cleanup to free VRAM initialization artifacts

- Added cleanup_memory() method to InferenceService
- Calls gc.collect() and torch.cuda.empty_cache() after model loading
- Frees temporary memory from initialization process
- Logs active VRAM after cleanup for monitoring

This ensures only the actual model weights remain in VRAM after loading,
preventing memory fragmentation and improving VRAM availability."

echo ""
echo "Commit created successfully!"
echo ""
echo "To push to remote, run:"
echo "  cd ~/.moondream-station/moondream-station"
echo "  git push origin main"
