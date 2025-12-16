# 2025 Best Practices - Image Restoration with AI
**Updated:** 2025-12-16T23:38:07+10:00

## 🎯 Image-to-Image Restoration Best Practices

### Modern Approach (2025):
**Use AI models (SDXL/Flux) for intelligent enhancement, not just upscaling!**

---

## 🤖 Model Selection

### **SDXL (Stability Diffusion XL)**
Best for: **Photographic restoration**
- Real photos
- Portraits
- Landscapes
- Product photography
- Documentary images

**Characteristics:**
- Excellent detail preservation
- Natural photo enhancement
- Good at faces and textures
- Fast inference

### **Flux**
Best for: **Artistic & Creative restoration**
- Artwork
- Illustrations
- Creative photos
- Stylized content
- Mixed media

**Characteristics:**
- Superior prompt understanding
- Creative enhancements
- Artistic quality
- Flexible styles

---

## ⚙️ Parameter Settings

### **Steps** (Inference Iterations)

**2025 Recommendations:**

**Quick Restoration (Fast):**
- Steps: **20-25**
- Time: ~10-15s
- Quality: Good
- Use: Batch processing, quick fixes

**Standard Restoration (Balanced):**
- Steps: **28-35**
- Time: ~20-30s
- Quality: Excellent
- Use: Most photos (recommended)

**Premium Restoration (Best):**
- Steps: **40-50**
- Time: ~40-60s
- Quality: Maximum
- Use: Final deliverables, prints

**Important:** More steps ≠ always better!
- 28-35 is sweet spot for most cases
- Beyond 50 adds minimal improvement
- Lightning models: 8-12 steps

---

### **CFG Scale** (Classifier-Free Guidance)

**Range: 0.0 - 16.0**

**2025 Recommendations for img2img:**

**Low CFG (3.0-5.0):**
- Subtle enhancements
- Preserves original heavily
- Natural look
- Faster inference
- **Best for:** Minor touchups

**Medium CFG (5.0-8.0):** ⭐ **RECOMMENDED**
- Balanced enhancement
- Respects original + improvements
- Professional quality
- **Best for:** Most restorations

**High CFG (8.0-12.0):**
- Strong enhancements
- More creative interpretation
- Risk of over-processing
- **Best for:** Heavy damage repair

**Very High CFG (12.0-16.0):**
- Maximum guidance
- Can distort original
- Use with caution
- **Best for:** Artistic reinterpretation

**Important:** For img2img restoration, stay **5.0-8.0!**

---

### **Denoise Strength** (How much to change)

**Range: 0-100% (0.0-1.0)**

**2025 Recommendations:**

**Minimal Denoise (10-20%):**
- Very subtle changes
- Almost identical to original
- Fix minor artifacts only
- **Use:** Already good images

**Light Restoration (20-40%):** ⭐ **RECOMMENDED**
- Gentle enhancement
- Preserves character
- Fixes common issues
- **Use:** Standard restoration

**Medium Restoration (40-60%):**
- Noticeable improvements
- Balances old/new
- Good for aged photos
- **Use:** Moderate damage

**Heavy Restoration (60-80%):**
- Significant changes
- New details added
- May alter original intent
- **Use:** Severely degraded images

**Complete Remaster (80-100%):**
- Almost new image
- Uses original as reference
- Creative reinterpretation
- **Use:** Extreme cases only

**Best Practice:** Start low (25-35%) and increase if needed!

---

## 📝 Prompt Strategy for Restoration

### **2025 Best Practice:**

**The prompt should COMPLEMENT, not replace!**

**Good Prompts for Restoration:**

**For Photos:**
```
enhance details, professional quality, sharp focus, 
natural lighting, photorealistic, restored
```

**For Portraits:**
```
professional portrait, sharp details, natural skin tones, 
enhanced clarity, high quality
```

**For Landscapes:**
```
vivid colors, sharp details, professional photography, 
enhanced depth, crisp focus
```

**For Old/Damaged Photos:**
```
restored vintage photo, enhanced details, remove scratches, 
professional restoration, clear and sharp
```

**For Low-Light:**
```
enhanced brightness, clear details, reduced noise, 
professional quality, improved exposure
```

### **What NOT to do:**

❌ **Too specific:** "a person wearing a red hat standing in front of a house"
- Tries to change content, not enhance

❌ **Too vague:** "better"
- Doesn't guide the model

❌ **Contradictory:** "black and white colorized photo"
- Confusing instructions

✅ **Just right:** "enhanced clarity, professional quality, sharp details"
- Guides improvements without changing content

---

## 🎯 Recommended Settings by Use Case

### **Photo Restoration (Standard):**
```
Model: SDXL
Steps: 30
CFG Scale: 6.5
Denoise: 30%
Prompt: "professional photo restoration, enhanced details, natural colors"
```

### **Portrait Enhancement:**
```
Model: SDXL
Steps: 32
CFG Scale: 7.0
Denoise: 25%
Prompt: "professional portrait, sharp details, natural skin tones"
```

### **Landscape Improvement:**
```
Model: SDXL
Steps: 35
CFG Scale: 7.5
Denoise: 35%
Prompt: "vivid landscape, professional photography, enhanced depth"
```

### **Old Photo Restoration:**
```
Model: SDXL
Steps: 40
CFG Scale: 8.0
Denoise: 50%
Prompt: "restored vintage photo, remove damage, enhance clarity"
```

### **Artistic Remaster:**
```
Model: Flux
Steps: 35
CFG Scale: 8.5
Denoise: 60%
Prompt: "artistic enhancement, professional quality, vivid details"
```

### **Quick Batch Processing:**
```
Model: SDXL (Lightning)
Steps: 12
CFG Scale: 5.5
Denoise: 25%
Prompt: "enhanced quality, professional restoration"
```

---

## 💡 2025 Workflow Best Practices

### **Step-by-Step Restoration:**

1. **Analyze Original:**
   - What needs fixing? (blur, noise, damage)
   - What should be preserved? (character, style)
   - What's the use case? (web, print, archive)

2. **Choose Model:**
   - Photo → SDXL
   - Art → Flux
   - Speed → Lightning variant

3. **Set Conservative Denoise:**
   - Start: 25-30%
   - Adjust based on preview

4. **Pick CFG Scale:**
   - Start: 6.5-7.0
   - Lower if over-processed
   - Higher if under-enhanced

5. **Write Complementary Prompt:**
   - Describe desired improvements
   - Don't describe content
   - Focus on quality aspects

6. **Generate Preview:**
   - Use quick preview (1/3 area)
   - Check results
   - Compare with original

7. **Adjust if Needed:**
   - Too subtle? Increase denoise/CFG
   - Too different? Decrease denoise/CFG
   - Wrong style? Adjust prompt

8. **Process Full Image:**
   - Run final generation
   - Compare carefully
   - Save settings as preset

---

## 🎨 Advanced Techniques

### **Multi-Pass Enhancement:**
```
Pass 1: Denoise 25%, CFG 6.5 - Fix major issues
Pass 2: Denoise 15%, CFG 6.0 - Fine-tune details
Pass 3: Upscale only - Increase resolution
```

### **Selective Enhancement:**
```
Face: Denoise 20%, CFG 7.0
Background: Denoise 35%, CFG 6.0
```

### **Style Transfer:**
```
Original Style: Denoise 25%, CFG 6.5
New Style: Denoise 70%, CFG 10.0
```

---

## ⚠️ Common Mistakes

### **1. Too High Denoise**
```
❌ Denoise: 80%
Result: Looks AI-generated, loses character
✅ Denoise: 30%
Result: Enhanced but recognizable
```

### **2. Too High CFG**
```
❌ CFG: 14.0
Result: Over-saturated, unnatural
✅ CFG: 7.0
Result: Natural enhancement
```

### **3. Too Many Steps**
```
❌ Steps: 100
Result: Wasted time, no improvement over 40
✅ Steps: 32
Result: Optimal quality/speed balance
```

### **4. Wrong Prompt**
```
❌ "a beautiful sunset over mountains"
Result: Changes scene content
✅ "enhanced landscape, vivid colors, professional quality"
Result: Improves existing scene
```

---

## 📊 Quick Reference Table

| Use Case | Model | Steps | CFG | Denoise | Time |
|----------|-------|-------|-----|---------|------|
| **Quick Fix** | SDXL-Lightning | 12 | 5.5 | 25% | ~5s |
| **Standard Photo** | SDXL | 30 | 6.5 | 30% | ~20s |
| **Portrait** | SDXL | 32 | 7.0 | 25% | ~25s |
| **Landscape** | SDXL | 35 | 7.5 | 35% | ~30s |
| **Old Photo** | SDXL | 40 | 8.0 | 50% | ~40s |
| **Artistic** | Flux | 35 | 8.5 | 60% | ~35s |
| **Premium** | SDXL | 45 | 7.0 | 35% | ~50s |

---

## 🎯 Golden Rules for 2025

1. **Start Conservative** - It's easier to add than remove
2. **Preview First** - Always test before full generation
3. **Denoise <40%** - For most photo restorations
4. **CFG 6-8** - Sweet spot for img2img
5. **Steps 28-35** - Optimal quality/speed
6. **Complement, Don't Replace** - Prompt guides, not dictates
7. **Compare Always** - Use side-by-side or split view
8. **Save Presets** - Reuse successful settings

---

## 🚀 Future-Proof Approach

### **Model Evolution:**
- **2024:** Separate upscale + enhance
- **2025:** Integrated AI restoration ⭐
- **2026+:** One-click intelligent restoration

### **Current Best Practice:**
```
1. Use AI model (SDXL/Flux) for enhancement
2. Let model handle upscaling
3. Use conservative settings
4. Guide with complementary prompts
5. Always compare results
```

---

## ✨ Summary

**2025 Image Restoration Formula:**

```
Quality = Model(SDXL/Flux) 
        + Steps(28-35) 
        + CFG(6-8) 
        + Denoise(25-35%) 
        + Prompt(complementary)
        + Preview(before commit)
```

**Remember:**
- 🎯 Preserve original character
- ⚡ Quality over quantity (steps)
- 🎨 Guide, don't dictate (prompts)
- 👁️ Always preview and compare
- 💾 Save successful presets

**This is professional image restoration in 2025!** 🏆
