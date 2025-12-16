# Image Regeneration Fix
**Fixed:** 2025-12-16T01:46:14+10:00

## Problem
The "Recreate from AI" action in the Actions menu was broken. It was using the wrong prompt source when generating images.

### Root Cause
The `ActionButtons` component was receiving `activePrompt` which could be either:
1. **AI Caption** (`image.recreationPrompt`) - when viewing "AI Context" tab
2. **Original Metadata** (`image.originalMetadataPrompt`) - when viewing "Metadata" tab

When a user switched to the "Metadata" tab and clicked "Recreate from AI", it would try to regenerate from the **original prompt metadata** instead of the **AI-generated caption**, causing failures.

## Solution

### Changes Made

#### 1. Fixed ActionButtons Component (lines 156-170)
**Before:**
```typescript
onClick={() => onRecreate(supportedAR, activePrompt)}
disabled={!canGenerate || isPreparingAnimation || !currentUser}
```

**After:**
```typescript
onClick={() => onRecreate(supportedAR, image.recreationPrompt)}
disabled={!canGenerate || isPreparingAnimation || !currentUser || !image.recreationPrompt}
```

**Why:** 
- Always uses `image.recreationPrompt` (the AI-generated caption) for recreation
- Adds `!image.recreationPrompt` to disabled condition to prevent clicking when no AI caption exists

#### 2. Cleaned Up Interface (lines 35-50)
- Removed unused `activePrompt?: string` parameter from `ActionButtonsProps`
- Removed `activePrompt` from component destructuring

#### 3. Updated Component Calls (lines 508-524, 535-551)
- Removed `activePrompt={activeText}` prop from both ActionButtons component instances
- Kept all other props intact

## Testing

To verify the fix works:

1. **Select an image** with both AI caption and original metadata
2. **Switch to "Metadata" tab** in the image viewer
3. **Click "Recreate from AI"** (sparkles icon)
4. **Verify** the prompt modal shows the AI-generated caption, NOT the metadata prompt

## Technical Details

### Flow:
```
User clicks "Recreate from AI" button
↓
ActionButtons.onClick triggers onRecreate(aspectRatio, image.recreationPrompt)
↓
handleRecreate receives the AI caption as promptOverride
↓
setPromptModalConfig is called with the correct AI-generated prompt
↓
Image generation proceeds with AI caption ✅
```

### Before (Broken):
```
activePrompt = metadata (if viewing Metadata tab)
↓
onRecreate called with metadata prompt
↓
Generation fails or produces wrong result ❌
```

### After (Fixed):
```
Always uses image.recreationPrompt (AI caption)
↓
onRecreate called with AI caption
↓
Generation succeeds ✅
```

## Additional Improvements

- Added explicit disabled state when `!image.recreationPrompt` exists
- This provides better UX by disabling the button when there's no AI caption
- Removed unnecessary prop passing (cleaner code, better performance)
