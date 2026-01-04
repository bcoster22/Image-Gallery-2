# Auto Test All - Issue Analysis
**Date**: 2026-01-05  
**Status**: 🔍 INVESTIGATING CRASH

## Issue Report

**Symptom**: App crashed during "Auto Test All" in Performance Overview

## System Health Check

### ✅ Git Commits - HEALTHY
**Frontend** (`Image-Gallery-2`):
```
6c3210c (HEAD -> main) feat: Enhanced Performance Overview with UX improvements
c62a669 (origin/main) Cleanup: Removed legacy backend...
```

**Backend** (`moondream-station`):
```
2fb7ffd (HEAD -> main) fix: Convert deque to list for JSON serialization
e8367e5 feat: Enhanced Station Manager with SSE logging
```

### ✅ App Status - RUNNING
- Frontend: http://localhost:3000/ ✅
- Backend: http://localhost:2020/ ✅  
- Station Manager: http://localhost:3001/ ✅

---

## Root Cause Analysis

### Problem 1: Missing Parameters in Auto Test

**File**: `hooks/useAutoTestRunner.ts`  
**Issue**: `startAutoTest()` only accepts `models` and `prompt`, missing:
- ❌ `scheduler` parameter
- ❌ `resolution` parameter

**Current Signature**:
```typescript
const startAutoTest = useCallback((models: ModelInfo[], prompt: string) => {
    // ...
}, [addToQueue]);
```

**Called From** `PerformanceOverview.tsx` line 115:
```typescript
startAutoTest(models, testPrompt);
// Missing: selectedScheduler, selectedResolution
```

**Impact**: Auto Test All uses hardcoded settings instead of user selections:
- Hardcoded: `aspectRatio: "16:9"` (line 68)
- Hardcoded: `steps: 20` (line 71)
- Missing: User's selected scheduler (euler, dpm++, karras, etc.)
- Missing: User's selected resolution (512x896, 1024x1024, etc.)

---

### Problem 2: Scheduler Not Passed to Queue

**File**: `hooks/useAutoTestRunner.ts` line 66-77  
**Current**:
```typescript
data: {
    prompt: prompt,
    aspectRatio: "16:9",  // ← Hardcoded
    generationSettings: {
        model: model.id,
        steps: 20,  // ← Hardcoded
        // Missing scheduler!
        // Missing resolution!
    },
}
```

**Should Be**:
```typescript
data: {
    prompt: prompt,
    generationSettings: {
        model: model.id,
        steps: 20,
        scheduler: scheduler,  // ← Add this
        width: width,          // ← Add this
        height: height,        // ← Add this
    },
}
```

---

## Potential Crash Causes

### 1. **Scheduler Format Issue**
**Hypothesis**: New scheduler format `"euler karras"` (two words) may not be handled correctly by backend

**Evidence**:
- Frontend now sends: `"euler karras"` or `"dpm++ exponential"`
- Backend may expect: `"euler"` or `"dpm++"`

**Test**: Check if backend API accepts variant format

### 2. **Resolution Format Issue**
**Hypothesis**: Resolution string `"512x896"` needs to be parsed to width/height

**Evidence**:
- Frontend sends: `"512x896"` (string)
- Backend expects: `{ width: 512, height: 896 }` or `size: "512x896"`

**Test**: Verify backend API expects size format

### 3. **Missing Error Handling**
**Hypothesis**: Auto Test All may not handle backend errors gracefully

**Evidence**:
- No try/catch visible in `queueTestForModel`
- No error status update in `useEffect` monitoring

**Impact**: One failed test could crash the entire batch

---

## Fix Strategy

### Step 1: Update `startAutoTest` Signature
```typescript
const startAutoTest = useCallback((
    models: ModelInfo[], 
    prompt: string,
    scheduler: string,      // ← ADD
    resolution: string      // ← ADD
) => {
    // ...
    models.forEach(model => {
        queueTestForModel(model, prompt, scheduler, resolution);
    });
}, [addToQueue]);
```

### Step 2: Update `queueTestForModel`
```typescript
const queueTestForModel = (
    model: ModelInfo, 
    prompt: string,
    scheduler: string,      // ← ADD
    resolution: string      // ← ADD
) => {
    // Parse resolution
    const [width, height] = resolution.split('x').map(Number);
    
    const task: any = {
        // ...
        data: {
            prompt: prompt,
            generationSettings: {
                model: model.id,
                steps: 20,
                scheduler: scheduler,  // ← ADD
                width: width,          // ← ADD
                height: height,        // ← ADD
            },
        }
    };
};
```

### Step 3: Update Call in `PerformanceOverview.tsx`
```typescript
startAutoTest(models, testPrompt, selectedScheduler, selectedResolution);
// ← Add scheduler and resolution
```

### Step 4: Add Error Handling
```typescript
try {
    addToQueue([task]);
    pendingVerificationRef.current[jobId] = Date.now();
} catch (error) {
    console.error(`Failed to queue test for ${model.id}:`, error);
    setTestStatuses(prev => ({
        ...prev,
        [model.id]: {
            modelId: model.id,
            status: 'failure',
            error: String(error)
        }
    }));
}
```

---

## Testing Plan

1. **Single Test** (verify scheduler/resolution work):
   - Select "euler + karras"
   - Select "512x896"
   - Click "Test Load" on one model
   - ✅ Verify image generates with correct resolution
   - ✅ Check backend logs for scheduler used

2. **Auto Test All**:
   - Select "dpm++ + karras"
   - Select "1024x1024"
   - Click "Auto Test All"
   - ✅ Verify all tests use selected settings
   - ✅ Monitor for crashes
   - ✅ Check error handling

3. **Backend Validation**:
   - Check `/v1/images/generations` API
   - Verify it accepts `scheduler: "euler karras"`
   - Verify it accepts `size: "512x896"` or separate width/height

---

## Monitoring Checklist

- [x] Git commits healthy
- [x] App running without initial errors
- [ ] Single test with new scheduler works
- [ ] Auto Test All with scheduler/resolution works
- [ ] Error handling prevents crashes
- [ ] Backend logs show correct parameters

---

## Next Actions

1. ✅ App is running - ready for testing
2. 🔧 Fix `useAutoTestRunner.ts` to accept scheduler/resolution
3. 🔧 Update `PerformanceOverview.tsx` to pass parameters
4. 🧪 Test single model with new settings
5. 🧪 Test Auto Test All
6. 📝 Document results

---

**Status**: Investigation complete. Fix required in `useAutoTestRunner.ts`.  
**Priority**: HIGH - Blocks Auto Test All feature  
**Estimated Fix Time**: 5 minutes
