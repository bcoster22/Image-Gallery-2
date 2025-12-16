#!/bin/bash
# Commit all fixes from this session

echo "========================================="
echo "Committing SDXL Remix Fixes"
echo "========================================="
cd ~/Documents/Github_Projects/Gallery/Image-Gallery-2
./commit_sdxl_fixes.sh

echo ""
echo "========================================="
echo "Committing Moondream Station Fixes"
echo "========================================="
./commit_moondream_station.sh

echo ""
echo "========================================="
echo "All commits completed!"
echo "========================================="
echo ""
echo "Summary of changes:"
echo "  1. Image-Gallery-2:"
echo "     - sdxl_backend_new.py (SDXL backend fixes)"
echo "     - App.tsx (GenerationResult extraction)"
echo ""
echo "  2. moondream-station:"
echo "     - inference_service.py (post-load cleanup)"
echo ""
echo "To push both repositories:"
echo "  cd ~/Documents/Github_Projects/Gallery/Image-Gallery-2 && git push"
echo "  cd ~/.moondream-station/moondream-station && git push"
