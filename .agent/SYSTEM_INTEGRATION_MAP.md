# System Integration Map - Frontend ↔ Backend

## Overview

This document maps the complete integration between **Image Gallery Frontend** and **Moondream-Station Backend**, including all API endpoints, data flows, and the new Priority Queue system.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)                  │
│                      http://localhost:3000                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Multi-Tier Priority Queue (App.tsx)                       │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ Priority 3: IMMEDIATE (Regenerate Caption)           │  │  │
│  │  │ Priority 2: INTERACTIVE (Generation Studio)          │  │  │
│  │  │ Priority 1: PRELOAD (Slideshow, Smart Fit)           │  │  │
│  │  │ Priority 0: BACKGROUND (Bulk Upload)                 │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │  Adaptive Concurrency: 1-5 concurrent tasks                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             │                                     │
│                             │ HTTP/REST                           │
│                             ▼                                     │
└──────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────────┐
│               BACKEND API (FastAPI + Python)                      │
│                   http://localhost:2020                           │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  REST Server (rest_server_temp_5.py)                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │   Routes     │  │ VRAM Manager │  │ Model Tracker│     │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │ │
│  │         │                  │                  │             │ │
│  │         └──────────────────┼──────────────────┘             │ │
│  └────────────────────────────┼────────────────────────────────┘ │
│                               │                                  │
│  ┌────────────────────────────▼────────────────────────────────┐ │
│  │  InferenceService (moondream-station)                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │ Moondream    │  │ JoyCaption   │  │ NSFW Detector│     │ │
│  │  │ (Vision)     │  │ (Captioning) │  │ (Safety)     │     │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │ │
│  │         └──────────────────┼──────────────────┘             │ │
│  └────────────────────────────┼────────────────────────────────┘ │
│                               │                                  │
│  ┌────────────────────────────▼────────────────────────────────┐ │
│  │  SDXL Backend (backend_fixed.py)                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │ Juggernaut   │  │ Animagine    │  │ DreamShaper  │     │ │
│  │  │ (Realism)    │  │ (Anime)      │  │ (Artistic)   │     │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │ │
│  │         └──────────────────┼──────────────────┘             │ │
│  └────────────────────────────┼────────────────────────────────┘ │
│                               │                                  │
└───────────────────────────────┼───────────────────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │   GPU (CUDA)         │
                    │   VRAM: 12-16GB      │
                    └──────────────────────┘
```

---

## API Endpoints Reference

### 1. System Status
```http
GET /v1/metrics
```

**Frontend Call:** 
```typescript
// StatusPage.tsx (line 800-1465)
fetch('http://localhost:2020/v1/metrics')
```

**Response:**
```json
{
  "cpu": 45.2,
  "memory": 8192,
  "device": "NVIDIA RTX 3090",
  "gpus": [{
    "id": 0,
    "name": "NVIDIA RTX 3090",
    "memory": {"total": 24576, "used": 12288, "free": 12288},
    "temperature": 65,
    "utilization": {"gpu": 85, "memory": 50}
  }],
  "loaded_models": [{
    "id": "joycaption-alpha-2",
    "name": "JoyCaption Alpha 2",
    "vram_mb": 2500,
    "ram_mb": 1024,
    "loaded_at": 1734512345
  }]
}
```

---

### 2. Image Analysis (Vision)
```http
POST /v1/chat/completions
```

**Frontend Call:**
```typescript
// aiService.ts (line 137-240)
fetch('http://localhost:2020/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-VRAM-Mode': 'balanced' // low | balanced | high
  },
  body: JSON.stringify({
    model: 'joycaption-alpha-2',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this image in detail' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,...' }}
      ]
    }]
  })
})
```

**Backend Flow:**
```python
# rest_server_temp_5.py (line 672-897)
1. Check if InferenceService is running
2. Auto-start model if stopped (line 694-722)
3. Auto-switch model if different (line 727-762)
4. Smart VRAM management (line 811-822)
   - Unload SDXL if balanced/low mode
5. Execute inference (line 827-850)
6. OOM retry logic (line 830-850)
7. Return OpenAI-compatible response
```

**Response:**
```json
{
  "id": "chatcmpl-1734512345",
  "object": "chat.completion",
  "created": 1734512345,
  "model": "joycaption-alpha-2",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "A detailed description of the image..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 150,
    "total_tokens": 150
  }
}
```

---

### 3. Image Generation & Editing
```http
POST /v1/generate
```
*(Note: 'Editing' tasks fallback to this endpoint if no dedicated provider is found)*

**Frontend Call:**
```typescript
// App.tsx processQueue (line 450-475)
const result = await generateImageFromPrompt(
  data.prompt,
  data.aspectRatio,
  data.generationSettings,
  data.sourceImage
);

// Internally calls:
fetch('http://localhost:2020/v1/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-VRAM-Mode': 'balanced'
  },
  body: JSON.stringify({
    prompt: 'A majestic mountain landscape...',
    model: 'sdxl-realism',
    width: 1024,
    height: 1024,
    steps: 8,
    image: 'data:image/png;base64,...', // Optional (img2img)
    strength: 0.75 // Only for img2img
  })
})
```

**Backend Flow:**
```python
# rest_server_temp_5.py (line 493-575)
1. Parse request parameters
2. Smart VRAM switching (line 511-514)
   - Unload Moondream if balanced/low mode
3. Initialize SDXL backend (line 517-527)
4. Generate image with retry (line 536-563)
5. OOM recovery (line 546-561)
6. Low VRAM cleanup (line 566-568)
7. Return base64 image
```

**Response:**
```json
{
  "created": 1734512345,
  "data": [{"b64_json": "iVBORw0KGgoAAAANSUhEUgAA..."}],
  "images": ["iVBORw0KGgoAAAANSUhEUgAA..."],
  "image": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

---

### 4. Model Management
```http
POST /v1/models/switch
```

**Frontend Call:**
```typescript
// AdminSettingsPage.tsx
fetch('http://localhost:2020/v1/models/switch', {
  method: 'POST',
  body: JSON.stringify({ model: 'moondream-2' })
})
```

**Backend Flow:**
```python
# rest_server_temp_5.py (line 609-670)
1. Validate model exists in manifest
2. Unload SDXL if active (Zombie Prevention)
3. Start new model via InferenceService
4. Track model load in memory tracker
5. Update config with current_model
6. Return model stats (VRAM/RAM usage)
```

**Response:**
```json
{
  "status": "success",
  "model": "moondream-2",
  "vram_mb": 2500,
  "ram_mb": 1024
}
```

---

### 5. Model Unload
```http
POST /v1/system/unload
```

**Frontend Call:**
```typescript
// StatusPage.tsx
fetch('http://localhost:2020/v1/system/unload', { method: 'POST' })
```

**Backend Flow:**
```python
# rest_server_temp_5.py (line 417-433)
1. Unload Moondream via InferenceService
2. Unload SDXL backend
3. Clear VRAM
4. GPU cache cleanup
```

**Response:**
```json
{
  "status": "success",
  "message": "All models unloaded and VRAM cleared"
}
```

---

## Priority Queue Integration

### Frontend Queue System

**Location:** `App.tsx` (line 325-540)

```typescript
// State
const queueRef = useRef<QueueItem[]>([]);
const [concurrencyLimit, setConcurrencyLimit] = useState(1);
const activeRequestsRef = useRef(0);

// Queue Item Structure
interface QueueItem {
  id: string;
  taskType: 'analysis' | 'generate';
  priority: 0 | 1 | 2 | 3; // QueuePriority enum
  fileName: string;
  addedAt: number;
  data: {
    image?: ImageInfo;
    prompt?: string;
    aspectRatio?: AspectRatio;
    generationSettings?: GenerationSettings;
  };
}
```

### Priority Levels

| Priority | Name | Use Case | Example |
|----------|------|----------|---------|
| 3 | IMMEDIATE | User actively waiting | Regenerate caption button |
| 2 | INTERACTIVE | User watching results | Generation Studio open |
| 1 | PRELOAD | UX optimization | Slideshow preload, Smart fit |
| 0 | BACKGROUND | Batch processing | Bulk upload, closed modal |

### Queue Flow

```
User Action → Create QueueItem → Add to Queue (priority-sorted)
                                      ↓
                               processQueue() loop
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    │                                   │
              'analysis' task                 'generate' / 'enhance' task
                    │                                   │
                    ▼                                   ▼
         POST /v1/chat/completions            POST /v1/generate
                    │                                   │
                    ▼                                   ▼
              Update image                      Save generated image
                    │                                   │
                    └─────────────────┬─────────────────┘
                                      ▼
                              Remove from queue
                                      │
                                      ▼
                               processQueue() (next item)
```

---

## Data Structures

### ImageInfo (Frontend)
```typescript
// types.ts (line 99-160)
interface ImageInfo {
  id: string;
  fileName: string;
  url: string; // data:image/png;base64,...
  recreationPrompt: string; // AI-generated caption
  keywords: string[]; // AI-generated tags
  createdAt: number;
  modifiedAt: number;
  fileSize: number;
  width: number;
  height: number;
  gallery: 'my' | 'public' | 'creations';
  analysisStatus?: 'pending' | 'analyzing' | 'complete' | 'failed';
  analysisFailed?: boolean;
}
```

### GenerationSettings (Frontend)
```typescript
// types.ts (line 269-279)
interface GenerationSettings {
  provider: AiProvider;
  model: string;
  steps: number;
  denoise: number;
  cfg_scale: number;
  seed: number;
}
```

### Model Memory Info (Backend)
```python
# rest_server_temp_5.py (line 166-180)
{
  "id": "joycaption-alpha-2",
  "name": "JoyCaption Alpha 2",
  "vram_mb": 2500,
  "ram_mb": 1024,
  "loaded_at": 1734512345
}
```

---

## Backend Components

### 1. RestServer (rest_server_temp_5.py)
**Purpose:** Main FastAPI application, routes, VRAM management

**Key Features:**
- Route handling (`/v1/*`)
- Model memory tracking (`ModelMemoryTracker`)
- VRAM mode switching (low/balanced/high)
- OOM recovery and restart
- Monkey-patched InferenceService for tracking

### 2. InferenceService (moondream-station)
**Purpose:** Manages vision model loading and inference

**Key Features:**
- Model loading/unloading
- Backend worker management (JoyCaption, NSFW)
- Inference execution
- Function routing (caption, query, detect)

### 3. SDXL Backend (backend_fixed.py)
**Purpose:** Image generation with Stable Diffusion XL

**Key Features:**
- Model loading with 4-bit quantization
- Text-to-image generation
- Image-to-image enhancement
- Tiled processing for large images

### 4. Model Memory Tracker (rest_server_temp_5.py)
**Purpose:** Track VRAM usage per model

**Key Features:**
- Baseline VRAM measurement
- Per-model memory accounting
- Ghost memory detection (zombies)
- Last known VRAM storage

---

## Communication Patterns

### 1. Synchronous API Calls
**Used for:** Most operations (analysis, generation, model switching)

```typescript
const response = await fetch('/v1/generate', { ... });
const result = await response.json();
```

### 2. Polling for Status
**Used for:** GPU metrics, queue monitoring

```typescript
useEffect(() => {
  const interval = setInterval(fetchMetrics, 2000);
  return () => clearInterval(interval);
}, []);
```

### 3. Queue-Based Processing
**Used for:** Batch operations, priority task management

```typescript
// Add to queue
queueRef.current.push(item);

// Process with concurrency control
while (queue.length > 0 && active < limit) {
  processNext();
}
```

---

## Error Handling

### Frontend Error Catching
```typescript
// App.tsx processQueue (line 478-525)
try {
  const result = await apiCall();
} catch (error) {
  if (error.message.includes('Queue is full')) {
    // Backpressure: pause and retry
    isPaused.current = true;
    queueRef.current.unshift(task); // Re-queue
    setConcurrencyLimit(1); // Reset
  } else if (error.message.includes('out of memory')) {
    // OOM: backend handles restart
    addNotification({ status: 'error', message: 'GPU overloaded' });
  } else {
    // Generic error
    markTaskFailed(task);
  }
}
```

### Backend Error Recovery
```python
# rest_server_temp_5.py (line 830-850)
try:
    result = await inference_service.execute_function(...)
except Exception as e:
    if "out of memory" in str(e).lower():
        # 1. Unload all models
        self.unload_all_models()
        # 2. Restart service
        self.inference_service.start(model)
        # 3. Retry operation
        result = await inference_service.execute_function(...)
    else:
        raise e
```

---

## Performance Optimizations

### Frontend
1. **Priority Queue** - Important tasks jump queue
2. **Adaptive Concurrency** - Scales from 1 to 5 based on success
3. **Virtualized Rendering** - Only renders visible images
4. **IndexedDB** - Async storage for offline capability

### Backend
1. **4-bit Quantization** - Reduces VRAM by 75%
2. **Model Caching** - Keeps models loaded between requests
3. **Smart VRAM Switching** - Auto-unload models based on mode
4. **OOM Recovery** - Automatically restarts on memory errors

---

## Multi-GPU Scaling

### Current (Single GPU)
```
Frontend Queue → Backend API → Single GPU
Concurrency: 1-5
```

### Multi-GPU Ready
```
Frontend Queue → Backend Load Balancer → GPU 1
               → Backend Load Balancer → GPU 2  
               → Backend Load Balancer → GPU 3

Concurrency: 15 (5 × 3 GPUs)
```

**Implementation:**
- Frontend: Increase `MAX_CONCURRENCY` to 15
- Backend: Worker pool distributes tasks across GPUs
- Queue: No changes needed (already distributed)

---

## File Reference Map

| Component | Frontend File | Backend File | Line Range |
|-----------|---------------|--------------|------------|
| Queue System | `App.tsx` | N/A | 325-540 |
| Analysis API | `aiService.ts` | `rest_server_temp_5.py` | 137-240 / 672-897 |
| Generation API | `App.tsx` | `rest_server_temp_5.py` | 450-475 / 493-575 |
| Model Tracking | `StatusPage.tsx` | `rest_server_temp_5.py` | 800-1465 / 150-250 |
| Priority Types | `types.ts` | N/A | 459-475 |
| SDXL Backend | N/A | `backend_fixed.py` | Full file |

---

## Quick Reference

### Start Both Services
```bash
# Terminal 1: Backend
cd /path/to/Image-Gallery-2
source .venv/bin/activate
python3 dev_run_backend.py

# Terminal 2: Frontend
cd /path/to/Image-Gallery-2
npm run dev
```

### Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:2020
- API Docs: http://localhost:2020/docs (Swagger UI)

### Debug Endpoints
```bash
# Check backend health
curl http://localhost:2020/v1/metrics

# List available models
curl http://localhost:2020/v1/models

# Current model stats
curl http://localhost:2020/v1/stats
```

---

**Last Updated:** 2025-12-18
**System Version:** Phase 2 Complete with Multi-Tier Priority Queue
**Multi-GPU:** Ready for deployment
