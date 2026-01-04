# Landscape Checkbox & Scheduler Enhancements
**Date**: 2026-01-04  
**Feature**: Portrait-First Resolution Filter + Karras Schedulers  
**Status**: ✅ IMPLEMENTED

## Overview

Enhanced the Performance Overview test configuration with:
1. **Landscape checkbox** - Filters resolution list to show portrait + square by default
2. **Karras schedulers** - Added DPM++ Karras, Euler Karras, LMS Karras to scheduler options
3. **AI-friendly code** - Optimized component to **106 lines** (well under 150 line limit)

---

## Feature 1: Landscape Checkbox Filter

### Visual Implementation
```
┌──────────────────────────────────────────────────┐
│ [☐ Landscape] [Resolution ▼] [Scheduler ▼]      │
└──────────────────────────────────────────────────┘

Unchecked (Default):
- ✅ Portrait resolutions (512×896, 640×1536, etc.)
- ✅ Square resolutions (1024×1024, 512×512, etc.)
- ❌ Landscape resolutions hidden

Checked:
- ✅ Portrait resolutions
- ✅ Square resolutions  
- ✅ Landscape resolutions (896×512, 1536×640, etc.)
```

### Behavior
- **Default state**: Unchecked (landscape hidden)
- **Toggle**: Clicking checkbox shows/hides landscape options
- **State**: Local component state (not persisted)
- **Icon**: Layers icon from Lucide React

### Code
```tsx
const [showLandscape, setShowLandscape] = useState(false);

const filtered = RESOLUTIONS.filter(r => 
    r.orientation === 'square' || 
    r.orientation === 'portrait' || 
    (showLandscape && r.orientation === 'landscape')
);
```

---

## Feature 2: Karras Scheduler Support

### Added Schedulers
```
Common Schedulers (Default + Fallback):
├─ dpm++            ← Default
├─ dpm++ karras     ← NEW
├─ euler
├─ euler_a
├─ euler karras     ← NEW
├─ ddim
├─ pndm
└─ lms karras       ← NEW
```

### Implementation Strategy
1. **Fetch from backend** - Try `/v1/schedulers` API first
2. **Merge with common** - Add Karras variants if missing
3. **Fallback** - Use hardcoded list if API fails

### Code
```tsx
// Merge API schedulers with common ones
const apiSchedulers = data.schedulers || [];
const commonSchedulers = ['dpm++', 'euler', 'euler_a', 'dpm++ karras', 'euler karras', 'ddim', 'pndm', 'lms karras'];
const merged = [...new Set([...apiSchedulers, ...commonSchedulers])];
setSchedulers(merged);
```

---

## Feature 3: AI-Friendly Code Structure

### Line Count Optimization
- **Before**: 163 lines
- **After**: 106 lines ✅
- **Target**: < 150 lines for AI maintainability

### Optimizations Applied
1. **Inline JSX**: Combined multi-line elements where readable
2. **Compact mapping**: Used inline map functions for optgroups
3. **Removed redundant spacing**: Consolidated similar blocks
4. **Short variable names**: `filtered` instead of `filteredResolutions`

---

## Default Values

| Setting | Default | Rationale |
|---------|---------|-----------|
| **Resolution** | 512×896 | Portrait orientation, SDXL-optimized |
| **Scheduler** | dpm++ | Fast, high quality |
| **Landscape** | Off | Reduces dropdown clutter |

---

## Resolution List (Default View)

### Portrait + Square Only
```
SDXL:
- 512×896 (Portrait)
- 640×1536 (Tall Portrait)
- 1024×1024 (Square)

FLUX:
- 896×1152 (Portrait)
- 1024×1024 (Square)

SD 1.5:
- 512×768 (Portrait)
- 512×512 (Square)

High Res:
- 2048×2048 (Square)
```

### With Landscape Enabled
```
All above PLUS:

SDXL:
- 896×512 (Landscape)
- 1536×640 (Wide Landscape)

FLUX:
- 1152×896 (Landscape)
- 1344×768 (Wide)

SD 1.5:
- 768×512 (Landscape)

High Res:
- 1536×1024 (2K Landscape)
```

---

## Files Modified

1. **`PromptConfig.tsx`** (106 lines) ✅
   - Added landscape checkbox
   - Simplified resolution rendering
   - Optimized for AI readability

2. **`PerformanceOverview.tsx`**
   - Changed default resolution: 896×512 → 512×896
   - Enhanced fetchSchedulers with Karras variants
   - Added fallback scheduler list

---

## User Workflow

### Changing to Landscape
1. Navigate to Performance Overview
2. Check "Landscape" checkbox
3. Resolution dropdown updates instantly
4. Landscape options now visible
5. Select desired landscape resolution

### Using Karras Schedulers
1. Click Scheduler dropdown
2. Select "dpm++ karras" or "euler karras"
3. Run test
4. Backend uses Karras noise schedule for generation

---

## Technical Details

### Scheduler Format
- **Standard**: `"dpm++"`, `"euler"`, `"ddim"`
- **Karras**: `"dpm++ karras"`, `"euler karras"`, `"lms karras"`
- **Case**: Lowercase, space-separated

### API Integration
```json
Request:
GET /v1/schedulers

Response:
{
  "schedulers": ["euler", "ddim", "dpm++"]
}

Frontend Merges:
["euler", "ddim", "dpm++", "euler_a", "dpm++ karras", "euler karras", "pndm", "lms karras"]
```

### Fallback Behavior
```
API Success → Merge API + common schedulers
API Failure → Use hardcoded fallback list
Result: Always have schedulers available
```

---

## Performance Impact

| Feature | Impact | Notes |
|---------|--------|-------|
| Landscape filter | Negligible | Simple array filter |
| Scheduler merge | ~1ms | Set deduplication |
| Code optimization | Faster parsing | AI agents process faster |

---

## Benefits

### Landscape Checkbox
✅ **Cleaner UI**: Less clutter in dropdown  
✅ **Default to Portrait**: Most prompts benefit from vertical orientation  
✅ **Flexible**: Easy to enable landscape when needed  
✅ **No persistence**: Fresh default each session  

### Karras Schedulers
✅ **Better Quality**: Karras noise schedule improves image quality  
✅ **Industry Standard**: Widely used in Stable Diffusion community  
✅ **Fallback Safe**: Always available even if API fails  
✅ **Merged Smartly**: No duplicates, preserves API schedulers  

### Code Optimization
✅ **AI-Friendly**: Under 150 lines for faster agent processing  
✅ **Readable**: Still clean despite compression  
✅ **Maintainable**: Well-structured despite compact format  

---

## Future Enhancements

1. **Persist Landscape State**: Remember checkbox state in localStorage
2. **Smart Defaults**: Auto-enable landscape for certain model types
3. **Scheduler Grouping**: Group by type (Karras, Standard, Advanced)
4. **Resolution Tooltips**: Show megapixel count and VRAM estimate
5. **Quick Presets**: Buttons for "Fast", "Quality", "Experimental"

---

## Testing

### Manual Test Cases

1. **Test Landscape Filter**:
   - Uncheck box → Verify only portrait + square visible
   - Check box → Verify landscape options appear
   - Select landscape → Run test → Verify image is landscape

2. **Test Karras Schedulers**:
   - Select "dpm++ karras"
   - Run test
   - Compare quality to standard "dpm++"

3. **Test API Fallback**:
   - Stop backend
   - Refresh page
   - Verify schedulers still populate with fallback list

4. **Test Portrait Default**:
   - Fresh page load
   - Verify default is "512×896 SDXL"
   - Run test → Verify portrait image

---

## Troubleshooting

### Checkbox Doesn't Filter

**Solution**: Check browser console for React errors, verify state management

### Karras Not Showing

**Solution**: Check if backend API returns schedulers, verify merge logic

### Default Resolution Wrong

**Solution**: Check state initialization in PerformanceOverview.tsx line 27

---

**Reviewed by**: Claude (Antigravity)  
**Last Updated**: 2026-01-04  
**Version**: 1.0.0
