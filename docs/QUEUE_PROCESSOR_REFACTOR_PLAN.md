# useQueueProcessor Refactoring Plan

**File**: `hooks/queue/useQueueProcessor.ts` (766 lines)  
**Priority**: CRITICAL  
**Target**: Split into 5 focused hooks  
**Goal**: Reduce to ~150 lines main file

---

## Current Issues

1. **Mixed Concerns**: Contains queue management, error handling, calibration, VRAM monitoring, and logging
2. **Size**: 766 lines - far exceeds 200-line guideline
3. **Testability**: Difficult to test individual concerns in isolation
4. **Maintainability**: Changes to one concern can break others

---

## Proposed Architecture

### Main Hook: `useQueueProcessor.ts` (~150 lines)
**Responsibility**: Orchestrate queue processing
- Imports and composes other hooks
- Exports unified interface
- Contains only core processQueue orchestration

### New Hook 1: `useQueueRetry.ts` (~120 lines)
**Responsibility**: Retry logic and error recovery
- Retry queue management
- attemptResume logic
- Consecutive error tracking
- Auto-pause on max errors

**Exports**:
```typescript
{
  retryQueueRef,
  scheduleRetry,
  processRetryQueue,
  consecutiveErrorsRef,
  attemptResume
}
```

### New Hook 2: `useQueueCalibration.ts` (~150 lines)
**Responsibility**: Concurrency calibration
- Calibration state management
- startCalibration, stopCalibration
- Calibration metrics collection
- Optimal concurrency calculation

**Exports**:
```typescript
{
  calibrationRef,
  startCalibration,
  stopCalibration,
  getCalibrationStatus,
  recordCalibrationMetrics
}
```

### New Hook 3: `useVRAMManagement.ts` (~100 lines)
**Responsibility**: VRAM monitoring and management
- VRAM polling
- triggerVramUnload
- Batch size calibration
- VRAM-based adaptive scaling

**Exports**:
```typescript
{
  pollVRAM,
  triggerVramUnload,
  optimalBatchSize,
  calibrateBatchSize,
  batchSizeCalibrated
}
```

### New Hook 4: `useQueueResilience.ts` (~80 lines)
**Responsibility**: Logging and resilience tracking
- logResilience
- logResilienceWithMetrics
- Metrics history management

**Exports**:
```typescript
{
  logResilience,
  logResilienceWithMetrics,
  metricsHistoryRef
}
```

### New Hook 5: `useAdaptiveConcurrency.ts` (~100 lines)
**Responsibility**: Dynamic concurrency adjustment
- Adaptive scaling logic
- VRAM pressure detection
- TPS-based scaling
- Smart batching getNextJob

**Exports**:
```typescript
{
  adjustConcurrency,
  getNextJob,
  metricsHistoryRef
}
```

---

## File Structure

```
hooks/queue/
├── useQueueProcessor.ts          (150 lines - Main orchestrator)
├── useQueueRetry.ts              (120 lines - Retry & recovery)
├── useQueueCalibration.ts        (150 lines - Calibration)
├── useVRAMManagement.ts          (100 lines - VRAM)
├── useQueueResilience.ts         (80 lines - Logging)
└── useAdaptiveConcurrency.ts     (100 lines - Adaptive scaling)
```

**Total**: ~700 lines (distributed)  
**Max file**: 150 lines ✅

---

## Migration Strategy

### Phase 1: Extract Resilience Logging (Safest)
1. Create `useQueueResilience.ts`
2. Move logResilience and logResilienceWithMetrics
3. Update imports in main file
4. Test: Verify logs still appear correctly

### Phase 2: Extract VRAM Management
1. Create `useVRAMManagement.ts`
2. Move pollVRAM, triggerVramUnload, calibrateBatchSize
3. Move batch size state
4. Test: Verify VRAM polling and unload work

### Phase 3: Extract Retry Logic
1. Create `useQueueRetry.ts`
2. Move retry queue management
3. Move attemptResume function
4. Test: Verify retry functionality

### Phase 4: Extract Calibration
1. Create `useQueueCalibration.ts`
2. Move calibration state and functions
3. Move calibration metrics
4. Test: Verify calibration mode

### Phase 5: Extract Adaptive Concurrency
1. Create `useAdaptiveConcurrency.ts`
2. Move concurrency adjustment logic
3. Move getNextJob (smart batching)
4. Test: Verify adaptive scaling

### Phase 6: Refine Main Hook
1. Clean up `useQueueProcessor.ts`
2. Keep only orchestration logic
3. Compose all extracted hooks
4. Final integration testing

---

## Testing Checklist

After each phase:
- [ ] Queue processes items correctly
- [ ] Errors trigger retry mechanism
- [ ] VRAM monitoring active
- [ ] Calibration mode functional
- [ ] Adaptive concurrency adjusts properly
- [ ] Batch mode works
- [ ] Resilience logs appear
- [ ] No regressions in frontend

---

## Benefits

1. **Maintainability**: Each concern in its own file
2. **Testability**: Can test each hook independently
3. **Reusability**: Hooks can be used in other contexts
4. **AI-Friendly**: Files under 200 lines each
5. **Clear Separation**: Single responsibility per file

---

## Risks & Mitigations

**Risk**: Breaking existing queue functionality  
**Mitigation**: Incremental extraction with testing after each phase

**Risk**: Increased import complexity  
**Mitigation**: Main hook provides single unified interface

**Risk**: State synchronization issues  
**Mitigation**: Use refs and callbacks to share state between hooks

---

## Timeline

- Phase 1-2: 30 minutes
- Phase 3-4: 30 minutes  
- Phase 5-6: 30 minutes
- Testing: 30 minutes

**Total**: ~2 hours

---

**Status**: Ready to begin  
**Next Action**: Create useQueueResilience.ts (Phase 1)
