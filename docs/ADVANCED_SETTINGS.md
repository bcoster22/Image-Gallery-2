# Advanced Settings Implementation
**Created:** 2025-12-16T22:40:57+10:00

## ✅ Phase 2 Complete: Advanced Settings UI

### What Was Added

#### 1. **New Type Interfaces** (`types.ts`)

```typescript
// Advanced Generation Settings
interface GenerationSettings {
  provider: AiProvider;
  model: string;
  steps: number;        // 1-250
  denoise: number;      // 0-100%
  cfg_scale: number;    // 1-20
  seed: number;         // -1 for random
  width?: number;
  height?: number;
}

// Upscale Settings
interface UpscaleSettings {
  provider: AiProvider;
  model: string;
  method: 'esrgan' | 'real-esrgan' | 'latent' | 'sd-upscale';
  scale: 2 | 4;
  tiled: boolean;
  tile_size: 512 | 1024;
  tile_overlap: 8 | 16 | 32;
  denoise: number;
  steps?: number;
}

// Preset System
interface GenerationPreset {
  id: string;
  name: string;
  taskType: 'img2img' | 'txt2img' | 'upscale';
  generation?: GenerationSettings;
  upscale?: UpscaleSettings;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}
```

#### 2. **AdvancedSettingsPanel Component**

A collapsible panel with:

**For Generation (Text2Img, Img2Img):**
- ✅ Model selection dropdown
- ✅ Steps slider (1-250) with visual guides
- ✅ Denoise strength slider (0-100%, img2img only)
- ✅ CFG scale slider (1-20) with presets
- ✅ Seed input field

**For Upscaling:**
- ✅ Upscale method selector (Real-ESRGAN, SD Upscale, etc.)
- ✅ Scale factor buttons (2x / 4x)
- ✅ Tiled upscaling toggle
- ✅ Tile size selection (512px / 1024px)
- ✅ Tile overlap slider (8-32px)
- ✅ Denoise for SD upscale

**UI Features:**
- 🎨 Color-coded sliders (indigo, purple, green)
- 💡 Built-in tips and recommended settings
- 📱 Responsive design
- ⚡ Expandable/collapsible to save space

---

## How to Use

### In the Modal

The component can be integrated into `PromptSubmissionModal.tsx`:

```typescript
import AdvancedSettingsPanel from './AdvancedSettingsPanel';

// In the modal component:
const [advancedSettings, setAdvancedSettings] = useState<GenerationSettings>({
  provider: 'moondream_local',
  model: 'sdxl-realism',
  steps: 8,
  denoise: 75,
  cfg_scale: 7,
  seed: -1,
});

// In the JSX:
<AdvancedSettingsPanel
  taskType="img2img"
  provider={selectedProvider}
  settings={advancedSettings}
  onSettingsChange={setAdvancedSettings}
  availableModels={['sdxl-realism', 'sdxl-anime', 'sdxl-surreal']}
/>
```

### Default Settings (2025 Best Practices)

#### Text-to-Image:
```typescript
{
  steps: 8,           // Lightning models
  cfg_scale: 7,       // Balanced
  seed: -1,           // Random
}
```

#### Image-to-Image:
```typescript
{
  steps: 20,          // Standard SDXL
  denoise: 75,        // Significant change
  cfg_scale: 7,       // Balanced
  seed: -1,           // Random
}
```

#### Upscaling:
```typescript
{
  method: 'real-esrgan',  // Fast, good quality
  scale: 4,               // 4x enlargement
  tiled: true,            // Low VRAM friendly
  tile_size: 512,         // 4GB VRAM
  tile_overlap: 32,       // Seamless
  denoise: 20,            // Minimal for SD upscale
}
```

---

## Parameter Guide

### **Steps** (1-250)
- **1-8**: Lightning/Turbo models (SDXL Lightning, LCM)
- **20-30**: Standard SDXL, balanced speed/quality
- **40-50**: High quality, slower
- **100+**: Diminishing returns, very slow

**Best Practice 2025:** Use 4-8 steps with Lightning models for real-time generation.

### **Denoise Strength** (0-100%)
Only for img2img | upscale. How much to change the source
.
- **0-30%**: Subtle refinement, keep original
- **40-60%**: Noticeable changes, style transfer
- **70-90%**: Major transformation
- **95-100%**: Complete regeneration

**Best Practice:** 30-50% for edits, 70-85% for remixing.

### **CFG Scale** (1-20)
Classifier-Free Guidance - how closely to follow the prompt.
- **1-5**: Artistic freedom, creative variations
- **6-9**: Balanced, recommended range
- **10-15**: Strict prompt adherence
- **16-20**: Very literal, can look "over-cooked"

**Best Practice:** 7-9 for photorealistic, 3-5 for artistic styles.

### **Seed** (-1 to 4294967295)
- **-1**: Random seed (default)
- **Specific number**: Reproducible results

**Use Case:** Set a seed to generate variations of the same composition.

### **Tiling**
Splits large images into overlapping tiles to reduce VRAM usage.

- **Auto-enable** for images > 2048px OR VRAM < 6GB
- **Tile Size**: 512px for 4GB, 1024px for 8GB+
- **Overlap**: 32px prevents visible seams

**Best Practice:** Always use tiling for 4x upscales on consumer GPUs.

---

## Next Steps (Not Yet Implemented)

### Phase 3: Preset System
- [ ] Save/load presets to localStorage
- [ ] Preset dropdown selector
- [ ] "Set as default" star button
- [ ] Quick presets (Fast, Quality, 4K Upscale)

### Phase 4: Backend Integration
- [ ] Update moondream-station API to accept parameters
- [ ] Add `/v1/upscale` endpoint
- [ ] Pass settings to generation functions

### Phase 5: Quality Assessment
- [ ] Integrate LAION Aesthetics Predictor
- [ ] Display quality scores on thumbnails
- [ ] Auto-regenerate low-quality images

---

## Files Modified

1. ✅ `/types.ts` - Added 3 new interfaces
2. ✅ `/components/AdvancedSettingsPanel.tsx` - New component (330 lines)

## Files to Modify Next

1. `components/PromptSubmissionModal.tsx` - Integrate the panel
2. `App.tsx` - Pass settings to generation functions
3. `services/providers/moondream.ts` - Update API calls

---

## Testing Checklist

### UI Tests:
- [ ] Panel expands/collapses smoothly
- [ ] All sliders move and update values
- [ ] Model dropdown populates correctly
- [ ] Tiling options show/hide based on checkbox
- [ ] Hints display appropriate tips

### Settings Tests:
- [ ] Values stay in valid ranges
- [ ] Denoise only shows for img2img
- [ ] SD upscale options only show for that method
- [ ] Settings persist between modal opens

### Integration Tests:
- [ ] Settings passed to backend correctly
- [ ] Generation respects custom parameters
- [ ] Presets save/load (after Phase 3)

---

## Visual Preview

```
┌─────────────────────────────────────┐
│ ⚙️ Advanced Settings            ▼  │
├─────────────────────────────────────┤
│                                     │
│  Model: [sdxl-realism        ▼]    │
│                                     │
│  Steps: 20                          │
│  [━━━━━○━━━━━━━━━━━━━━━━━━]         │
│  1 (Fast)    125      250 (Quality) │
│                                     │
│  Denoise Strength: 75%              │
│  [━━━━━━━━━━━○━━━━━━━━━━━]          │
│  0% (Keep)   50%    100% (Change)   │
│                                     │
│  CFG Scale: 7                       │
│  [━━━━━━○━━━━━━━━━━━━━━━━━]         │
│  1 (Artistic) 7 (Balanced) 20       │
│                                     │
│  Seed: [-1__________] (random)      │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 💡 Tips:                      │  │
│  │ • Steps 4-8 for Lightning     │  │
│  │ • Lower denoise preserves     │  │
│  │ • CFG 7-9 for balanced        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

Excellent foundation for modern AI generation control! 🚀
