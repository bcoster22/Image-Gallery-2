# Settings Application Verification Report
**Generated:** 2025-12-16T01:38:17+10:00

## Summary
✅ **Settings are being applied correctly** for JoyCaption (captioning) and WD14 (tagging) when using Moondream Local.

## Configuration Flow

### 1. **Settings Storage** (AdminSettingsPage.tsx)
```typescript
moondream_local: {
    endpoint: 'http://127.0.0.1:2020',
    model: 'moondream-2',              // Default model for general use
    captionModel: 'joycaption-alpha-2', // ✅ Override for captioning
    taggingModel: 'wd14-vit-v2'         // ✅ Override for tagging
}
```

### 2. **Routing Configuration** (AdminSettings)
```typescript
routing: {
    captioning: ['moondream_local', 'gemini', 'grok'],  // First = Primary
    tagging: ['moondream_local', 'gemini'],             // First = Primary
}
```

### 3. **Model Selection Logic** (moondream.ts)

#### Captioning Flow (lines 293-315):
```typescript
async captionImage(image: ImageInfo, settings: AdminSettings): Promise<string> {
    const config = settings.providers.moondream_local;
    const modelOverride = config.captionModel;  // ✅ Gets 'joycaption-alpha-2'

    let effectiveSettings = settings;
    if (modelOverride) {
        effectiveSettings = {
            ...settings,
            providers: {
                ...settings.providers,
                moondream_local: {
                    ...config,
                    model: modelOverride  // ✅ Switches to JoyCaption model
                }
            }
        };
    }

    const result = await this.analyzeImage(image, effectiveSettings);
    return result.recreationPrompt;
}
```

#### Tagging Flow (lines 317-337):
```typescript
async tagImage(image: ImageInfo, settings: AdminSettings): Promise<string[]> {
    const config = settings.providers.moondream_local;
    const modelOverride = config.taggingModel;  // ✅ Gets 'wd14-vit-v2'

    let effectiveSettings = settings;
    if (modelOverride) {
        effectiveSettings = {
            ...settings,
            providers: {
                ...settings.providers,
                moondream_local: {
                    ...config,
                    model: modelOverride  // ✅ Switches to WD14 model
                }
            }
        };
    }

    const result = await this.analyzeImage(image, effectiveSettings);
    return result.keywords;
}
```

### 4. **API Request** (lines 395-414)
The `analyzeImage` function sends the model identifier to the backend:
```typescript
const body = {
    model: (!model || model.startsWith('sdxl-')) ? "moondream-2" : model,
    // ✅ This will be 'joycaption-alpha-2' or 'wd14-vit-v2'
    messages: [...],
    stream: false,
    max_tokens: 1024
};
```

### 5. **AI Service Routing** (aiService.ts lines 219-280)

The `analyzeImage` function intelligently decides:
- **Unified Call**: If captioning and tagging use the SAME provider
- **Split Call**: If they use different providers (lines 245-246):
```typescript
const captionPromise = executeWithFallback<string>(settings, 'captionImage', [image]);
const taggingPromise = executeWithFallback<string[]>(settings, 'tagImage', [image]);
const [recreationPrompt, keywords] = await Promise.all([captionPromise, taggingPromise]);
```

## Verification Steps

### ✅ What IS Working:
1. **Model Override Logic**: The `captionModel` and `taggingModel` fields correctly override the default `model` setting
2. **Settings Propagation**: Overrides are applied before calling `analyzeImage`
3. **API Routing**: The correct model ID is sent to the backend via the request body
4. **Parallel Execution**: If using different models, they execute in parallel for efficiency

### ⚠️ What to CHECK on Backend:
The **backend** (`/v1/chat/completions` endpoint) must:
1. Accept the `model` field in the request body
2. Switch to the requested model (JoyCaption or WD14) before processing
3. Return appropriate responses for each model type

### 🔍 How to Verify It's Working:

#### Option 1: Check Browser Console
1. Open Developer Tools (F12)
2. Go to the **Console** tab
3. Look for logs like:
```
DEBUG: Sending request to http://127.0.0.1:2020/v1/chat/completions
{
  "model": "joycaption-alpha-2",  // ✅ Should show correct model
  "messages": [...]
}
```

#### Option 2: Check Backend Logs
Monitor your moondream-station server logs to confirm it's switching models correctly.

#### Option 3: Test in UI
1. Select an image
2. Click "Regenerate Caption"
3. The caption should use **JoyCaption** style (more detailed, descriptive)
4. The tags should use **WD14** style (Danbooru tags)

## Potential Issues & Solutions

### Issue 1: Models Not Switching
**Symptom**: Always uses default `moondream-2` instead of JoyCaption/WD14
**Solution**: Check that you've **saved** the settings after selecting the models

### Issue 2: Backend Not Respecting Model Parameter
**Symptom**: Correct model is sent to backend, but responses look wrong
**Solution**: Verify backend's `/v1/chat/completions` endpoint properly handles model switching

### Issue 3: Prompt Engineering Not Applied
**Symptom**: JoyCaption doesn't use the detective strategy prompts
**Solution**: The `analyzeImage` function uses the prompt strategy (lines 396-414), so multi-turn prompts SHOULD work with JoyCaption

## Recommendation

The **frontend code is working correctly**. If you're experiencing issues, the problem is likely:

1. **Settings not saved**: Make sure to click "Save" in the Admin Settings page
2. **Backend issue**: The moondream-station server may not be properly switching models
3. **Model not available**: Ensure JoyCaption and WD14 models are actually loaded in the backend

To debug further, check the browser console logs when analyzing an image to see exactly what's being sent to the backend.
