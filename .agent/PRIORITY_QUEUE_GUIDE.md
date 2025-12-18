# Priority Queue System - Usage Guide

## Overview

The application uses a **4-tier priority queue system** to ensure the best user experience. Tasks are executed based on urgency, with user-facing interactions getting highest priority.

## Priority Levels

```typescript
enum QueuePriority {
  BACKGROUND = 0,      // Background batch processing
  PRELOAD = 1,         // Slideshow preload, "Smart fit to screen"
  INTERACTIVE = 2,     // Generation Studio - user actively watching
  IMMEDIATE = 3        // User explicitly waiting (regenerate caption)
}
```

### Priority 3: IMMEDIATE (Highest)
**Use when:** User is actively waiting for a specific result

**Examples:**
- Regenerate caption (user viewing image, clicked "regenerate")
- View-specific analysis (user opened image, needs data NOW)
- Any action where user is staring at screen waiting

**Code:**
```typescript
const queueItem: QueueItem = {
  id: imageId,
  taskType: 'analysis',
  fileName: image.fileName,
  priority: 3, // QueuePriority.IMMEDIATE
  data: { image }
};
```

---

### Priority 2: INTERACTIVE
**Use when:** User is actively watching a process

**Examples:**
- Generation Studio open and generating images
- User watching slideshow of generations
- Real-time preview window

**Code:**
```typescript
const queueItem: QueueItem = {
  id: generationId,
  taskType: 'generate',
  fileName: promptPreview,
  priority: 2, // QueuePriority.INTERACTIVE
  data: { prompt, settings }
};
```

---

### Priority 1: PRELOAD
**Use when:** Optimizing UX with predictive loading

**Examples:**
- Slideshow preloading next 1-3 images
- "Smart fit to screen" preprocessing
- Thumbnail generation for visible items
- Cache warming

**Code:**
```typescript
const queueItem: QueueItem = {
  id: imageId,
  taskType: 'analysis',
  fileName: image.fileName,
  priority: 1, // QueuePriority.PRELOAD
  data: { image, preload: true }
};
```

---

### Priority 0: BACKGROUND (Lowest)
**Use when:** Batch processing, no immediate user need

**Examples:**
- Bulk upload analysis (100+ images)
- Background batch generation (modal closed)
- Maintenance tasks
- Optional re-analysis

**Code:**
```typescript
const queueItem: QueueItem = {
  id: imageId,
  taskType: 'analysis',
  fileName: image.fileName,
  priority: 0, // QueuePriority.BACKGROUND (or omit - defaults to 0)
  data: { image }
};
```

---

## Queue Behavior

### Insertion Logic
Items are inserted **before** the first item with **lower priority**:

```
Queue: [P3, P3, P2, P1, P0, P0]
Add P2 item → inserts at index 3
Result: [P3, P3, P2, P2, P1, P0, P0]
```

### Execution Order
Higher priority items **always** execute first, but:
- Items already processing continue (not pre-empted)
- Adaptive concurrency may process multiple priorities simultaneously
- Same-priority items execute FIFO (First In First Out)

---

## Implementation Examples

### Slideshow Preload (Future Feature)

```typescript
function preloadNextImages(currentIndex: number, images: ImageInfo[]) {
  const preloadCount = 3;
  const itemsToPreload = images.slice(currentIndex + 1, currentIndex + 1 + preloadCount);
  
  itemsToPreload.forEach(image => {
    if (!image.fitToScreenProcessed) {
      const queueItem: QueueItem = {
        id: `preload-${image.id}`,
        taskType: 'analysis',
        fileName: image.fileName,
        priority: 1, // QueuePriority.PRELOAD
        data: { 
          image,
          operation: 'smart-fit-to-screen'
        }
      };
      
      addToQueue(queueItem);
    }
  });
}
```

### Smart Fit to Screen (Future Feature)

```typescript
function requestSmartFitToScreen(image: ImageInfo, isVisibleNow: boolean) {
  const queueItem: QueueItem = {
    id: `fit-${image.id}`,
    taskType: 'process',
    fileName: image.fileName,
    priority: isVisibleNow ? 3 : 1, // IMMEDIATE if visible, PRELOAD if background
    data: {
      image,
      operation: 'smart-fit',
      targetResolution: window.innerWidth + 'x' + window.innerHeight
    }
  };
  
  addToQueue(queueItem);
}
```

---

## Decision Matrix

| Scenario | Priority | Rationale |
|----------|----------|-----------|
| User clicks "Regenerate Caption" | **3 (IMMEDIATE)** | User is actively waiting |
| Generation Studio open | **2 (INTERACTIVE)** | User watching slideshow |
| Slideshow preload next image | **1 (PRELOAD)** | UX optimization |
| Smart fit for visible image | **3 (IMMEDIATE)** | User can see it now |
| Smart fit for upcoming slide | **1 (PRELOAD)** | Will be needed soon |
| Bulk upload 50 images | **0 (BACKGROUND)** | No immediate need |
| Modal closed, 10 generations queued | **0 (BACKGROUND)** | User navigated away |

---

## Best Practices

1. **Default to BACKGROUND** - If unsure, use priority 0
2. **User intent matters** - Did user explicitly request this action?
3. **Visible = IMMEDIATE** - If user can see the result area, use priority 3
4. **Batch != High priority** - Large batches should be background
5. **Test edge cases** - What if 100 IMMEDIATE items are queued?

---

## Testing Priority Behavior

```typescript
// Add items in mixed order
addToQueue({ priority: 0, fileName: 'bg-1' });
addToQueue({ priority: 2, fileName: 'interactive-1' });
addToQueue({ priority: 1, fileName: 'preload-1' });
addToQueue({ priority: 3, fileName: 'immediate-1' });
addToQueue({ priority: 0, fileName: 'bg-2' });

// Expected execution order:
// 1. immediate-1 (P3)
// 2. interactive-1 (P2)
// 3. preload-1 (P1)
// 4. bg-1 (P0)
// 5. bg-2 (P0)
```

---

## Future Enhancements

- **Priority degradation**: Lower priority after X seconds in queue
- **User override**: Let user manually boost/lower priority
- **Auto-adjustment**: Detect user patterns and adjust priorities
- **Queue analytics**: Track which priorities are most effective

---

**Last Updated:** 2025-12-18
**Related Files:** `types.ts`, `App.tsx`, `PromptSubmissionModal.tsx`
