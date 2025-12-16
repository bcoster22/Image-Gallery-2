# Image Comparison & Magnifier Feature
**Added:** 2025-12-16T22:56:50+10:00

## ✨ New Features

### 1. **Interactive Magnifier**
- **Hover over the source image** to enable magnifier mode
- Click the **🔍 ON/OFF** button to toggle
- **2x zoom** in a circular lens that follows your mouse
- Perfect for inspecting details before generation

### 2. **Settings Preview Panel**
Real-time display of all current parameters:

**For Generation (img2img/txt2img):**
- Model name
- Steps count
- Denoise percentage (img2img only)
- CFG Scale
- Seed value

**For Upscaling:**
- Upscale method
- Scale factor (2x or 4x)
- Tiling status
- Tile size & overlap (if tiled)
- Denoise (for SD upscale)

### 3. **Smart Estimates**
- **Source size** - Original dimensions
- **Output size** - Calculated output dimensions (upscale)
- **Est. Time** - Approximate generation time
- **Quality/VRAM** - Performance indicators
- **Contextual tips** - Suggestions based on current settings

---

## 🎨 UI Layout

```
┌─────────────────────────────────────────┐
│  Source Image                   🔍 OFF  │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │     [Image with magnifier]        │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Current Settings                       │
│  ┌───────────────────────────────────┐  │
│  │ Model: sdxl-realism              │  │
│  │ Steps: 20                         │  │
│  │ Denoise: 75%                      │  │
│  │ CFG Scale: 7                      │  │
│  │ Seed: Random                      │  │
│  ├───────────────────────────────────┤  │
│  │ Source: 1024×768                  │  │
│  │ Output: 4096×3072 (4x upscale)   │  │
│  ├───────────────────────────────────┤  │
│  │ Est. Time: ~30-60s                │  │
│  │ VRAM: Low (Tiled)                 │  │
│  ├───────────────────────────────────┤  │
│  │ 💡 Tip: Enable tiling for...     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🚀 How to Use

### Basic Usage:
1. **Open any image** in the gallery
2. **Click "Upscale" or "Image to Image"**
3. **Look at the right panel** - you'll see:
   - Source image with magnifier button
   - All current settings
   - Estimated output info

### Using the Magnifier:
1. **Click 🔍 OFF button** to enable (turns blue)
2. **Hover your mouse** over the image
3. **Circular magnifier** appears showing 2x zoom
4. **Move around** to inspect details
5. **Move mouse away** or click button to disable

### Reading the Settings:
- **Color-coded values:**
  - Indigo = Steps
  - Purple = Denoise/Upscale
  - Green = CFG/Success indicators
  - Yellow = Time estimates
- **Real-time updates** as you adjust sliders
- **Smart tips** based on your current config

---

## 💡 Smart Features

### Context-Aware Tips:
The panel shows different tips based on settings:

- **Low denoise detected** → "Lower denoise keeps more of the original"
- **No tiling on large image** → "Enable tiling for better performance!"
- **Lightning mode** → "Great for quick previews!"

### Estimate Calculations:

**Time Estimates:**
- 1-8 steps → ~5-10s (Lightning)
- 9-30 steps → ~15-30s (Balanced)
- 31+ steps → ~45-60s (Quality)
- 2x upscale → ~10-20s
- 4x upscale → ~30-60s

**Quality Indicators:**
- Fast: 1-8 steps
- Balanced: 9-30 steps
- High: 31+ steps

**VRAM Usage:**
- Low: Tiling enabled
- High: No tiling

---

## 🎯 Benefits

### For Users:
✅ **Preview settings** before generation  
✅ **Inspect details** with magnifier  
✅ **Understand trade-offs** (speed vs quality)  
✅ **Avoid mistakes** (check settings first)  
✅ **Learn optimal values** from tips  

### For Workflow:
✅ **Faster iteration** - see settings at a glance  
✅ **Better decisions** - estimates help planning  
✅ **Less errors** - catch issues before generating  
✅ **Educational** - tips teach best practices  

---

## 🔧 Technical Details

### Magnifier Implementation:
```typescript
- Size: 150px diameter
- Zoom: 2x magnification
- Follow: Mouse position
- Performance: CSS background transform
- Border: 3px white with shadow
```

### Settings Display:
- **Live updates** from advancedSettings state
- **Type-safe** with TypeScript guards
- **Conditional** rendering based on task type
- **Color-coded** for quick scanning

### Calculations:
- **Output size** = source × scale factor
- **Time estimates** based on step ranges
- **VRAM usage** based on tiling + scale

---

## 📊 Comparison with Before

### Before:
```
[Simple image preview]
- Just shows the source image
- No settings visibility
- No detail inspection
- Static display
```

### After:
```
[Interactive comparison view]
✓ Magnifier for detail inspection
✓ All settings visible
✓ Output size calculation
✓ Time & quality estimates
✓ Contextual tips
✓ Real-time updates
```

---

## 🎨 Color Scheme

```css
Magnifier Border: #ffffff (white)
Settings BG: rgba(17, 24, 39, 0.5) /* gray-900/50 */
Borders: rgba(55, 65, 81, 0.5) /* gray-700/50 */

Value Colors:
- Indigo: #818cf8 (steps)
- Purple: #c084fc (denoise, upscale)
- Green: #4ade80 (CFG, success)
- Yellow: #facc15 (estimates)
- Blue: #93c5fd (tips)
```

---

## 🚀 Future Enhancements (Ideas)

### Phase 1 (Current): ✅
- Interactive magnifier
- Settings preview
- Estimates & tips

### Phase 2 (Potential):
- [ ] Before/After slider comparison
- [ ] Multiple zoom levels (2x, 4x, 8x)
- [ ] Grid overlay option
- [ ] Color picker integration
- [ ] Histogram display

### Phase 3 (Advanced):
- [ ] AI-powered crop suggestions
- [ ] Quality prediction
- [ ] Side-by-side comparison with previous result
- [ ] Export settings as preset from preview

---

## ✨ Summary

The new **Image Comparison** component provides:

1. **🔍 2x Magnifier** - Inspect details before generation
2. **📊 Settings Summary** - See all parameters at once
3. **📐 Output Calculator** - Know the result size
4. **⏱️ Time Estimates** - Plan your workflow
5. **💡 Smart Tips** - Learn best practices

**Everything updates in real-time** as you adjust sliders!

**Refresh the browser and try it now!** 🎉
