# Queue System Architecture - AI Assistant Reference

## System Name
**Multi-Tier Priority Queue with Adaptive Concurrency**

Also known as:
- Hierarchical Priority Work Queue
- Smart Task Scheduler
- Priority-aware Job Queue

---

## Pattern Family
- **Base Pattern**: Priority Queue (Computer Science fundamental)
- **Concurrency Model**: Adaptive Concurrency Control
- **Architecture**: Producer-Consumer
- **Paradigm**: Work Stealing / Task Pool

---

## Similar Systems in Industry

1. **Linux CFS (Completely Fair Scheduler)**
   - Multi-level priority scheduling
   - Our system: Simpler, 4 tiers instead of 140

2. **Kubernetes Pod Priority**
   - High/Medium/Low priority classes
   - Our system: More granular (4 levels)

3. **Database Query Queues**
   - Transaction priority levels
   - Our system: Similar concept, different domain

4. **Game Engine Render Queues**
   - Immediate/High/Low render priorities
   - Our system: Nearly identical structure

---

## Core Components

### 1. QueueItem Interface
```typescript
interface QueueItem {
  id: string;
  taskType: 'analysis' | 'generate';
  priority: 0 | 1 | 2 | 3; // QueuePriority enum
  addedAt: number;
  data: { /* task-specific */ };
}
```

### 2. Priority Levels (from types.ts)
```typescript
enum QueuePriority {
  BACKGROUND = 0,    // Batch processing, low urgency
  PRELOAD = 1,       // Predictive loading, UX optimization  
  INTERACTIVE = 2,   // User actively watching results
  IMMEDIATE = 3      // User explicitly waiting, highest urgency
}
```

### 3. Queue Processing (from App.tsx)
```typescript
const queueRef = useRef<QueueItem[]>([]);
const activeRequestsRef = useRef(0);
const concurrencyLimit = useState(1); // Adaptive: 1-5

// Insertion: Priority-based
queueItems.splice(insertIndex, 0, item); // Not push!

// Processing: FIFO within priority
while (queueRef.current.length > 0 && activeRequestsRef.current < concurrencyLimit) {
  const task = queueRef.current.shift(); // First item (highest priority)
  processTask(task);
}
```

---

## Key Algorithms

### Priority Insertion (O(n) worst case)
```typescript
function insertByPriority(item: QueueItem) {
  const itemPriority = item.priority || 0;
  let insertIndex = queue.length; // Default: end
  
  for (let i = 0; i < queue.length; i++) {
    if (itemPriority > queue[i].priority) {
      insertIndex = i;
      break;
    }
  }
  
  queue.splice(insertIndex, 0, item);
}
```

### Adaptive Concurrency
```typescript
// Start conservative
concurrency = 1;

// On success: scale up (max 5)
if (success) {
  consecutiveSuccesses++;
  if (consecutiveSuccesses >= 3) {
    concurrency = Math.min(concurrency + 1, MAX_CONCURRENCY);
  }
}

// On "Queue full" error: scale down
if (error.includes("Queue is full")) {
  concurrency = 1;
  pause_and_retry();
}
```

---

## Multi-GPU Scalability

### Current Architecture
```
[Frontend Queue] → [processQueue()] → [Backend API] → [Single GPU]
                   Concurrency: 1-5
```

### Multi-GPU Ready Architecture
```
[Frontend Queue] → [processQueue()] → [Load Balancer] → [GPU Worker 1]
                   Concurrency: 1-15                  → [GPU Worker 2]
                                                      → [GPU Worker 3]
```

### How to Scale

**Method 1: Frontend Load Balancing**
```typescript
const GPU_ENDPOINTS = ['http://gpu1:2020', 'http://gpu2:2020', 'http://gpu3:2020'];
const MAX_CONCURRENCY = GPU_ENDPOINTS.length * 5; // 15 total

// Round-robin or least-busy selection
function selectGPU() {
  return GPU_ENDPOINTS[nextIndex++ % GPU_ENDPOINTS.length];
}
```

**Method 2: Backend Worker Pool** (Recommended)
- Frontend: Single endpoint `http://localhost:2020`
- Backend: Internal GPU worker pool
- Backend handles distribution logic
- Frontend just increases `MAX_CONCURRENCY`

### No Queue Changes Needed!
The existing queue structure supports unlimited parallelism:
- Each QueueItem is independent
- No shared state between tasks
- Priority ordering maintained regardless of worker count
- Adaptive concurrency scales automatically

---

## File Locations

| Component | Location | Purpose |
|-----------|----------|---------|
| QueueItem type | `types.ts` (line 459-475) | Interface definition |
| QueuePriority enum | `types.ts` (line 459-467) | Priority levels |
| Queue processing | `App.tsx` (line 350-550) | Main algorithm |
| Priority insertion | `App.tsx` (line 602-630) | Add to queue logic |
| Regenerate caption | `App.tsx` (line 1112-1160) | Priority 3 example |
| Generation Studio | `PromptSubmissionModal.tsx` (line 211-225) | Priority 2 example |
| Usage guide | `.agent/PRIORITY_QUEUE_GUIDE.md` | Full documentation |

---

## Performance Characteristics

| Operation | Time Complexity | Space Complexity |
|-----------|----------------|------------------|
| Insert item | O(n) | O(1) |
| Pop next item | O(1) | O(1) |
| Process queue | O(k) where k = concurrency | O(k) |
| Full queue scan | O(n) | O(1) |

**Optimization Opportunity:**
Could use a Heap (O(log n) insertion) if queue size exceeds ~100 items.

---

## Testing Queue Behavior

```typescript
// Test priority ordering
addToQueue({ priority: 0, name: 'bg-1' });
addToQueue({ priority: 3, name: 'immediate-1' });
addToQueue({ priority: 1, name: 'preload-1' });
addToQueue({ priority: 2, name: 'interactive-1' });

// Expected execution order:
// 1. immediate-1 (P3)
// 2. interactive-1 (P2)
// 3. preload-1 (P1)
// 4. bg-1 (P0)
```

---

## Common Patterns for AI Assistants

### Adding High Priority Task
```typescript
const item: QueueItem = {
  id: crypto.randomUUID(),
  taskType: 'analysis',
  priority: 3, // QueuePriority.IMMEDIATE
  fileName: 'urgent-task',
  addedAt: Date.now(),
  data: { /* task data */ }
};

handleAddToQueue([item]);
```

### Monitoring Queue State
```typescript
// From App.tsx queueStatus state
{
  activeCount: 2,      // Currently processing
  pendingCount: 15,    // Waiting in queue
  isPaused: false,     // Queue paused?
  activeJobs: [...],   // Details of active tasks
  queuedJobs: [...]    // Details of pending tasks
}
```

---

## Extensions to Consider

1. **Queue Persistence**
   - Save queue to localStorage on page close
   - Restore queue on page load
   - Already has `addedAt` timestamp for this

2. **Priority Degradation**
   - Lower priority after X time in queue
   - Prevents starvation of background tasks

3. **User Control**
   - Manual priority override
   - Pause/resume specific priority tiers
   - Cancel by priority level

4. **Analytics**
   - Track average wait time per priority
   - Measure queue efficiency
   - Optimize concurrency limits

---

**Last Updated:** 2025-12-18
**System Version:** Phase 2 Complete
**Multi-GPU Ready:** Yes
