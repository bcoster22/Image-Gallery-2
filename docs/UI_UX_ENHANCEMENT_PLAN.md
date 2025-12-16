# UI/UX Enhancement Plan - 2025 Best Practices
**Created:** 2025-12-16T22:36:32+10:00

## Overview
Major UI/UX overhaul to modernize the image gallery with 2025 best practices for AI image generation, upscaling, and quality assessment.

## Phase 1: UI Label & Icon Updates ✅ (Quick Wins)

### 1.1 Action Button Changes
- [x] "Enhance and Upscale" → "Upscale"
  - Location: `components/ImageViewer.tsx`
  - Icon: Keep sparkles or change to dedicated upscale icon
  
- [x] "Recreate with AI [aspect ratio]" → "Image to Image"
  - Location: `components/ImageViewer.tsx` 
  - New Icon: ArrowLeftRight or ImagePlus (lucide-react)
  - Remove aspect ratio from button label (show in modal instead)

### 1.2 Modal Updates
- Update `PromptSubmissionModal.tsx` to show aspect ratio selector
- Add clear "Img2Img" vs "Text2Img" mode indicator

## Phase 2: Advanced Settings UI 🎯 (Priority)

### 2.1 Provider & Model Selection
**Current:** Provider dropdown only
**New:** Two-level selection
```
Provider: [Moondream SDXL ▼]
Model: [sdxl-realism ▼] [sdxl-anime] [sdxl-surreal]
```

**Implementation:**
- Add model dropdown that updates based on provider
- Query `/v1/models` endpoint to get available models
- Store in settings per task type (upscale, img2img, txt2img)

### 2.2 Generation Parameters
Add advanced sliders in settings/modal:

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| Steps | 1-250 | 8 | Inference steps (quality vs speed) |
| Denoise Strength | 0-100% | 75% | How much to change source image |
| CFG Scale | 1-20 | 7 | Prompt adherence strength |
| Seed | -1 to 2^32 | -1 | Random seed (-1 = random) |

**Best Practices 2025:**
- Steps: 4-8 for Lightning models, 20-50 for standard SDXL
- Denoise: 30-50% for subtle changes, 70-90% for major changes
- CFG: 3-5 for artistic, 7-9 for photorealistic, 10+ for exact prompts

### 2.3 Upscaling Options

**Tiled Upscaling (Low VRAM):**
```typescript
interface UpscaleSettings {
  method: 'esrgan' | 'real-esrgan' | 'latent' | 'sd-upscale';
  scale: 2 | 4;
  tiled: boolean;
  tile_size: 512 | 1024;
  tile_overlap: 8 | 16 | 32;
  denoise: number; // 0-1
}
```

**Best Methods 2025:**
1. **Real-ESRGAN** - Fast, good for photos (no AI needed)
2. **SD Upscale** - Best quality, uses SDXL (high VRAM)
3. **Latent Upscale** - Balanced (medium VRAM)

**Tiling Strategy:**
- Auto-enable for images > 2048px or VRAM < 6GB
- Tile size: 512px for 4GB, 1024px for 8GB+
- Overlap: 32px to avoid seams

## Phase 3: Settings Management 💾

### 3.1 Preset System
```typescript
interface GenerationPreset {
  id: string;
  name: string;
  provider: string;
  model: string;
  steps: number;
  denoise: number;
  cfg_scale: number;
  seed: number;
  is_default: boolean;
}
```

**UI:**
- Preset dropdown: [Custom ▼] [Quick] [Quality] [4K Upscale]
- Save button → "Save as preset"
- Star icon → "Set as default"

**Storage:**
- LocalStorage key: `generation_presets`
- Per-task-type defaults: `default_preset_img2img`, etc.

### 3.2 Batch Job Settings
- "Apply to all selected" checkbox
- Batch preset selector
- Progress tracking with quality scores

## Phase 4: Quality Assessment AI 🎯

### 4.1 Integration Options

**Best Models 2025:**

1. **LAION Aesthetics Predictor** (Recommended)
   - Model: `laion/aesthetics-predictor-v2`
   - Fast, accurate aesthetic scoring
   - Range: 0-10 (higher = better)

2. **CLIP-IQA** 
   - Image quality assessment via CLIP
   - Detects artifacts, blur, noise

3. **NIMA (Neural Image Assessment)**
   - Technical + Aesthetic scores
   - Used by Google Photos

**Implementation:**
```typescript
interface QualityAssessment {
  aesthetic_score: number; // 0-10
  technical_score: number; // 0-10  
  issues: string[]; // ['blur', 'noise', 'artifacts']
  recommendation: 'accept' | 'regenerate' | 'upscale';
}
```

### 4.2 UI Integration
- Quality badge on thumbnails: ⭐ 8.5/10
- Auto-sort by quality
- Filter: "Show only high quality (>7)"
- Batch regenerate low-quality images

## Phase 5: Modern UX Patterns 🎨

### 5.1 Best Practices from Leading Apps

**Midjourney-style:**
- Variation buttons (V1-V4) for iterations
- Upscale buttons (U1-U4) for specific variants
- Parameter display in footer

**Stable Diffusion WebUI:**
- Collapsible advanced settings
- Generation queue with preview
- Batch processing grid

**Photoshop Generative Fill:**
- In-canvas brush selection for img2img
- Real-time parameter preview
- Non-destructive layers

### 5.2 Suggested Improvements

**Modal Design:**
```
┌─────────────────────────────────────┐
│ □ Image to Image                ✕ │
├─────────────────────────────────────┤
│                                     │
│  [Source Image Preview]             │
│                                     │
│  Prompt: ___________________        │
│                                     │
│  Provider: [Moondream SDXL ▼]       │
│  Model:    [sdxl-realism   ▼]       │
│                                     │
│  ▼ Advanced Settings                │
│  Steps:   [━━━━○━━━] 20              │
│  Denoise: [━━━━━○━] 75%              │
│  CFG:     [━━○━━━━━] 7                │
│                                     │
│  Preset: [Custom ▼] [💾] [⭐]        │
│                                     │
│  [Cancel]        [🎨 Generate (2s)] │
└─────────────────────────────────────┘
```

**Progress Indicator:**
- Step counter: "8/20 steps"
- Live preview (if supported)
- Quality prediction before completion

## Implementation Order

### Week 1: Foundation
1. ✅ Update button labels and icons
2. ✅ Add model selection to settings
3. ✅ Create GenerationPreset interface
4. ✅ Add parameter sliders to modal

### Week 2: Features
5. ⬜ Implement tiled upscaling
6. ⬜ Add preset save/load system
7. ⬜ Integrate quality assessment
8. ⬜ Update batch processing

### Week 3: Polish
9. ⬜ Refine UI/UX based on testing
10. ⬜ Add keyboard shortcuts
11. ⬜ Performance optimization
12. ⬜ Documentation

## Technical Requirements

### Backend API Additions
```python
# Upscaling endpoint
POST /v1/upscale
{
  "image": "base64...",
  "method": "real-esrgan",
  "scale": 4,
  "tiled": true,
  "tile_size": 512
}

# Quality assessment
POST /v1/assess-quality
{
  "image": "base64..."
}
Response: {
  "aesthetic": 8.5,
  "technical": 9.1,
  "issues": []
}
```

### Frontend State Management
- Add `GenerationSettings` context
- Persist presets to localStorage
- Sync with backend capabilities

## Success Metrics

- ✅ All buttons have clear, modern labels
- ✅ Settings are persistent and reusable
- ✅ Quality scores visible on all images
- ✅ Upscaling works on 4GB+ GPUs
- ✅ Generation time < 10s for Lightning models
- ✅ User can batch process with saved presets

## Resources

**Icon Libraries:**
- lucide-react (current)
- heroicons
- phosphor-icons

**UI Components:**
- shadcn/ui (recommended)
- Radix UI primitives
- Framer Motion (animations)

**AI Models:**
- SDXL Lightning (4-step generation)
- Real-ESRGAN x4plus
- LAION Aesthetics Predictor

## Next Steps

Starting with Phase 1 (UI Labels) now...
