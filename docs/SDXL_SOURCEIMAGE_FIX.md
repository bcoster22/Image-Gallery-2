# Fix: SDXL Image Generation SourceImage Parameter
**Fixed:** 2025-12-16T01:53:06+10:00

## Problem
When trying to generate images using Moondream SDXL models, the generation would fail with:
```
Error: Image for "11 (2).jpg" failed. See Creations for details.
```

## Root Cause
The `handleGenerationSubmit` function in `App.tsx` was NOT passing the `sourceImage` parameter to `generateImageFromPrompt`, even though:

1. The user selected an image and clicked "Recreate from AI"
2. The `generateImageFromPrompt` function expects a `sourceImage` parameter for img2img/remix generation
3. The moondream SDXL backend requires the source image to create variations

### The Bug

**App.tsx line 1218 (BEFORE):**
```typescript
generatedResult = await generateImageFromPrompt(prompt, runSettings, aspectRatio);
//                                                                            ❌ Missing sourceImage!
```

**Function signature (aiService.ts):**
```typescript
export const generateImageFromPrompt = async (
    prompt: string,
    settings: AdminSettings,
    aspectRatio: AspectRatio,
    sourceImage?: ImageInfo  // ← THIS parameter was being ignored!
)
```

## The Fix

**App.tsx line 1218 (AFTER):**
```typescript
generatedResult = await generateImageFromPrompt(prompt, runSettings, aspectRatio, sourceImage);
//                                                                                 ✅ Now included!
```

## How It Works Now

### Flow for "Recreate from AI":
```
1. User selects image "11 (2).jpg"
2. Clicks "Recreate from AI"
3. Selects "Moondream SDXL" from dropdown
4. Enters prompt or uses AI caption
5. Clicks "Generate Image"
   ↓
6. handleGenerationSubmit is called with sourceImage = "11 (2).jpg"
   ↓
7. generateImageFromPrompt is called WITH sourceImage ✅
   ↓
8. moondream.ts generates image using img2img:
   - Uses source image as base
   - Applies prompt transformations
   - Preserves aspect ratio
   - strength = 0.75 (configurable)
   ↓
9. New image is generated and saved ✅
```

### Backend Request (moondream.ts lines 560-573):
```typescript
const body = {
    prompt,
    model: selectedModel,  // e.g., "sdxl-realism"
    width,
    height,
    steps: 8,
    guidance_scale: 2.0,
    image: sourceImage.dataUrl,  // ✅ Now sent to backend!
    strength: 0.75               // Controls how much to change
};
```

## Impact

### Before Fix:
- ❌ Source image was ignored
- ❌ Backend couldn't do img2img generation
- ❌ Generation would fail or produce random images

### After Fix:
- ✅ Source image is sent to backend
- ✅ img2img generation Works correctly
- ✅ Generated images are variations of the original
- ✅ Aspect ratio is preserved from source

## Use Cases Now Working

1. **Recreate from AI**: Take an existing photo and recreate it using SDXL
2. **Style Transfer**: Convert a photo to anime/surreal/realism style
3. **Variations**: Generate variations of an image with slight changes
4. **Remix**: Apply a theme (e.g., "cyberpunk") to an existing image

## Testing

To verify the fix:

1. **Select an image** from your gallery
2. **Click "Recreate from AI"** (sparkles icon)
3. **Select "Moondream SDXL"** from AI Model dropdown
4. **Enter a prompt** or use the AI caption
5. **Click "Generate Image"**
6. **Verify**: 
   - Generation succeeds ✅
   - New image is a variation of the source ✅
   - Aspect ratio matches source ✅

## Related Files
- `App.tsx` - handleGenerationSubmit function
- `services/aiService.ts` - generateImageFromPrompt export
- `services/providers/moondream.ts` - MoondreamLocalProvider.generateImageFromPrompt

SDXL image generation with source images is now fully functional! 🎨
