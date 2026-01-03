# Queue Processor Refactoring Progress

**Date**: 2026-01-03  
**Status**: IN PROGRESS (Phase 1-2 Complete)  
**Refactoring**: useQueueProcessor.ts (766 lines → target: ~150 lines)

---

## ✅ Completed Work

### Phase 1: Resilience Logging - COMPLETE
**File**: `hooks/queue/useQueueResilience.ts` (56 lines)  
**Extracted**:
- `logResilience()` - Basic logging function
- `logResilienceWithMetrics()` - Enhanced logging with metrics

**Status**: ✅ Created and ready to integrate

---

### Phase 2: VRAM Management - COMPLETE
**File**: `hooks/queue/useVRAMManagement.ts` (165 lines)  
**Extracted**:
- `triggerVramUnload()` - Force VRAM cleanup
- `calibrateBatchSize()` - VRAM-aware batch sizing
- `pollVRAM()` - Periodic VRAM monitoring (useEffect)
- State: `optimalBatchSize`, `batchSizeCalibrated`, `lastVramPctRef`

**Status**: ✅ Created and ready to integrate

---

## ⏳ Remaining Work

### Phase 3: Retry Logic (Next)
**File**: `hooks/queue/useQueueRetry.ts` (est. ~120 lines)  
**To Extract**:
- Lines 54-61: Retry configuration constants
- Lines 57-61: `retryQueueRef` state
- Lines 64-65: Resume backoff tracking refs
- Lines 164-182: `processRetryQueue()` function
- Lines 496-551: `attemptResume()` function (large, critical)
- Lines 609-649: Retry scheduling logic from error handler

**Dependencies**: Needs `logResilience` from Phase 1

---

### Phase 4: Calibration
**File**: `hooks/queue/useQueueCalibration.ts` (est. ~150 lines)  
**To Extract**:
- Lines 42-46: `calibrationRef` state
- Lines 48: `metricsHistoryRef` (partially - calibration metrics)
- Lines 190-203: `startCalibration()`
- Lines 205-215: `stopCalibration()`
- Lines 218-227: `getCalibrationStatus()`
- Lines 267-316: Calibration loop logic from `processQueue`

**Dependencies**: Needs logging hooks

---

### Phase 5: Adaptive Concurrency
**File**: `useAdaptiveConcurrency.ts` (est. ~100 lines)  
**To Extract**:
- Lines 230-253: `getNextJob()` (smart batching)
- Lines 422-474: Adaptive concurrency adjustment logic
- Lines 48: `metricsHistoryRef` (TPS/VRAM history)

**Dependencies**: Needs resilience logging

---

### Phase 6: Main Hook Refactoring
**File**: `useQueueProcessor.ts` (target: ~150 lines)  
**Actions**:
1. Import all new hooks
2. Compose hooks together
3. Keep only core `processQueue` orchestration
4. Remove all extracted code
5. Update dependency arrays
6. Ensure all refs are passed correctly

---

## Integration Strategy

### Step 1: Import New Hooks in Main File
```typescript
import { useQueueResilience } from './useQueueResilience';
import { useVRAMManagement } from './useVRAMManagement';
// ... more as they're created
```

### Step 2: Use Hooks in useQueueProcessor
```typescript
export const useQueueProcessor = (props: UseQueueProcessorProps) => {
    // Phase 1: Resilience
    const { logResilience, logResilienceWithMetrics } = useQueueResilience({
        setResilienceLog: props.setResilienceLog
    });

    // Phase 2: VRAM
    const {
        optimalBatchSize, batchSizeCalibrated, calibrateBatchSize,
        batchCalibrationInProgress, triggerVramUnload
    } = useVRAMManagement({
        settings: props.settings,
        activeRequestsRef: props.activeRequestsRef,
        queueRef: props.queueRef,
        logResilience,
        logResilienceWithMetrics
    });

    // ... rest of code ...
}
```

### Step 3: Remove Extracted Code
- Delete lines 71-99 (resilience logging) ✅ Phase 1
- Delete lines 102-161 (VRAM management) ✅ Phase 2
- Delete lines 704-752 (VRAM polling effect) ✅ Phase 2

---

## Testing Required

After integration:
- [ ] Queue processes items
- [ ] Resilience log populates correctly
- [ ] VRAM monitoring shows in logs
- [ ] Batch size calibration works
- [ ] VRAM unload triggers correctly
- [ ] No console errors
- [ ] No regressions in queue behavior

---

## File Size Progress

| File | Before | After (est) | Target | Status |
|------|--------|-------------|--------|--------|
| useQueueProcessor.ts | 766 | ~450 | 150 | 🟡 In Progress |
| useQueueResilience.ts | 0 | 56 | <100 | ✅ Complete |
| useVRAMManagement.ts | 0 | 165 | <200 | ✅ Complete |
| useQueueRetry.ts | 0 | ~120 | <150 | ⏳ Next |
| useQueueCalibration.ts | 0 | ~150 | <200 | ⏳ Pending |
| useAdaptiveConcurrency.ts | 0 | ~100 | <150 | ⏳ Pending |

**Current Total Removed**: ~221 lines  
**Remaining to Extract**: ~545 lines  
**Progress**: 29%

---

## Next Actions

### Option A: Continue Refactoring (Recommended for AI maintenance)
1. Create `useQueueRetry.ts` (Phase 3)
2. Create `useQueueCalibration.ts` (Phase 4)
3. Create `useAdaptiveConcurrency.ts` (Phase 5)
4. Integrate all hooks into main file (Phase 6)
5. Test thoroughly

**Time Estimate**: 1.5 hours

### Option B: Integrate What We Have (Quick win)
1. Update `useQueueProcessor.ts` to use the 2 completed hooks
2. Test to ensure no regressions
3. Commit this progress
4. Continue with remaining phases later

**Time Estimate**: 30 minutes

### Option C: Pause and Document
1. Commit the 2 new hook files
2. Update audit document with progress
3. Continue refactoring in next session

**Time Estimate**: 10 minutes

---

## Recommendation

**Option B** (Integrate current work) provides immediate value:
- Reduces main file by ~221 lines already
- Demonstrates refactoring approach works
- Allows testing of extraction pattern
- Can continue phases 3-6 later

Then commit and document progress before continuing.

---

**Status**: Awaiting decision on next steps  
**Progress**: 2/6 phases complete  
**Files Created**: 2  
**Lines Extracted**: ~221
