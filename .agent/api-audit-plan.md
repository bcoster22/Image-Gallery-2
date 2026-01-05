# Frontend-Backend API Audit Plan
**Date:** 2026-01-05  
**Purpose:** Comprehensive verification of all API endpoints between Frontend (Image-Gallery-2) and Backend (moondream-station)

---

## Overview
This document maps all API calls from the frontend to backend endpoints, verifying implementation status and identifying any issues.

---

## API Endpoint Categories

### 1. Generation Endpoints (`/v1/images/` & `/v1/generate`)

#### 1.1 `/v1/images/generations` (POST)
**Purpose:** Generate images using SDXL models  
**Frontend Callers:**
- `hooks/usePerformanceTest.ts` (line 29) - Performance testing
- `hooks/useModelTest.ts` (line 49) - Model verification (generate)
- `hooks/useModelTest.ts` (line 71) - Model verification (verify)

**Backend:** `routers/generation.py`  
**Status:** ✅ Implemented  
**Request Format:**
```typescript
{
  model: string,
  prompt: string,
  n: number,
  size: string,  // "WIDTHxHEIGHT"
  response_format: "b64_json" | "url"
}
```

**Action Items:**
- [ ] Verify all frontend calls include required parameters
- [ ] Test error handling for missing parameters
- [ ] Validate response format handling in frontend

---

#### 1.2 `/v1/generate` (POST)
**Purpose:** Legacy generation endpoint  
**Frontend Callers:**
- `hooks/usePerformanceTest.ts` (line 62) - Fallback generation for vision models

**Backend:** `rest_server.py` (dynamic routing)  
**Status:** ⚠️ Legacy - May need deprecation  
**Request Format:**
```typescript
{
  model: string,
  prompt: string,
  width: number,
  height: number,
  steps: number,
  scheduler: string
}
```

**Action Items:**
- [ ] Check if this can be replaced with `/v1/images/generations`
- [ ] Document differences from standard endpoint
- [ ] Consider deprecation path

---

### 2. Vision/Analysis Endpoints (`/v1/chat/completions`)

#### 2.1 `/v1/chat/completions` (POST)
**Purpose:** Vision model analysis (Moondream, JoyCaption, etc.)  
**Frontend Callers:**
- `hooks/usePerformanceTest.ts` (line 101) - Image verification
- `hooks/useAutoTestRunner.ts` (line 125) - Auto-test verification

**Backend:** `routers/vision.py`  
**Status:** ✅ Implemented  
**Request Format:**
```typescript
{
  model: string,
  messages: [{
    role: "user",
    content: [
      { type: "text", text: string },
      { type: "image_url", image_url: { url: string } }
    ]
  }],
  max_tokens: number
}
```

**Known Issues:**
- ✅ FIXED: Was using invalid model IDs (e.g., "vision/moondream2")
- Now always uses "moondream-2"

**Action Items:**
- [ ] Verify image URL format handling (data URLs vs blob URLs)
- [ ] Test max_tokens limits
- [ ] Validate multi-turn conversation support

---

### 3. Model Management (`/v1/models`)

#### 3.1 `/v1/models` (GET)
**Purpose:** List available models  
**Frontend Callers:**
- `services/aiService.ts` (line 224) - Model discovery
- `services/providers/moondream/MoondreamLocalProvider.ts` (line 32) - Provider setup
- `components/PerformanceOverview.tsx` (line 86) - Test model listing
- `components/settings/ToolsTab.tsx` (line 33) - Tools configuration
- `components/status/ModelLoadTestPanel.tsx` (line 53) - Load testing

**Backend:** `routers/models.py`  
**Status:** ✅ Implemented  
**Response Format:**
```typescript
{
  models: [{
    id: string,
    name: string,
    type: string,
    is_downloaded: boolean,
    last_known_vram_mb: number
  }]
}
```

**Action Items:**
- [ ] Verify model types are consistent across all callers
- [ ] Test VRAM reporting accuracy
- [ ] Check download status detection

---

#### 3.2 `/v1/models/refresh` (POST)
**Purpose:** Refresh model list from disk  
**Frontend Callers:**
- `components/settings/ProvidersTab.tsx` (line 78) - Manual refresh

**Backend:** `routers/models.py`  
**Status:** ✅ Implemented  

**Action Items:**
- [ ] Test refresh performance with many models
- [ ] Verify new models are detected
- [ ] Check UI feedback during refresh

---

### 4. System Management (`/v1/system`)

#### 4.1 `/v1/system/unload` (POST)
**Purpose:** Free VRAM by unloading models  
**Frontend Callers:**
- `hooks/useModelTest.ts` (line 39) - Pre-test cleanup
- `components/StatusPage/GPUMetrics/GPUControlCard.tsx` (line 140) - Manual VRAM free

**Backend:** `rest_server.py` (line 178)  
**Status:** ✅ FIXED - Now properly clears CUDA cache  
**Previous Issue:** Wasn't calling `torch.cuda.empty_cache()`  

**Action Items:**
- [x] Add CUDA cache clearing (COMPLETED)
- [ ] Test VRAM reduction effectiveness
- [ ] Add metrics reporting after unload

---

#### 4.2 `/v1/system/dev-mode` (GET/POST)
**Purpose:** Toggle development mode  
**Frontend Callers:**
- `components/StatusPage/SystemControls.tsx` (line 19) - Get status
- `components/StatusPage/SystemControls.tsx` (line 36) - Toggle mode

**Backend:** `routers/system.py`  
**Status:** ✅ Implemented  

**Action Items:**
- [ ] Verify mode persists across restarts
- [ ] Test impact on model loading
- [ ] Document dev mode differences

---

#### 4.3 `/v1/system/prime-profile` (GET/POST)
**Purpose:** Switch NVIDIA Prime profile  
**Frontend Callers:**
- `components/StatusPage/GPUMetrics/GPUControlCard.tsx` (line 40) - Get current profile
- `components/StatusPage/GPUMetrics/GPUControlCard.tsx` (line 160) - Switch profile

**Backend:** `routers/system.py`  
**Status:** ✅ Implemented  
**Requires:** Passwordless sudo  

**Action Items:**
- [ ] Test sudo permission detection
- [ ] Verify profile switch success
- [ ] Add restart reminder in UI

---

#### 4.4 `/v1/system/zombie-killer` (GET/POST)
**Purpose:** Auto-cleanup of zombie VRAM  
**Frontend Callers:**
- `components/StatusPage/GPUMetrics/GPUControlCard.tsx` (line 77) - Get status
- `components/StatusPage/GPUMetrics/GPUControlCard.tsx` (line 93) - Toggle enabled
- `components/StatusPage/GPUMetrics/GPUControlCard.tsx` (line 110) - Update interval

**Backend:** `routers/system.py`  
**Status:** ✅ Implemented  

**Action Items:**
- [ ] Test auto-detection threshold
- [ ] Verify cooldown interval works
- [ ] Add zombie detection logs

---

#### 4.5 `/v1/system/gpu-boost` (POST)
**Purpose:** Toggle GPU boost mode (max fans, persistence)  
**Frontend Callers:**
- `components/StatusPage/GPUMetrics/GPUControlCard.tsx` (line 124) - Enable/disable boost

**Backend:** `routers/system.py`  
**Status:** ✅ Implemented  
**Query Params:** `gpu_id`, `enable`  

**Action Items:**
- [ ] Test fan control availability detection
- [ ] Verify boost mode effects
- [ ] Add temperature monitoring during boost

---

#### 4.6 `/v1/system/gpu-reset` (POST)
**Purpose:** Nuclear GPU reset  
**Frontend Callers:**
- `GPUControlCard.tsx` (via modal, not direct fetch)

**Backend:** `rest_server.py` (line 128)  
**Status:** ✅ Implemented  
**Requires:** Passwordless sudo, custom script  

**Action Items:**
- [ ] Test reset script availability
- [ ] Verify process kill effectiveness
- [ ] Add safety confirmation in UI

---

### 5. Diagnostics (`/diagnostics`)

#### 5.1 `/diagnostics/vram-test` (POST)
**Purpose:** Test VRAM availability  
**Frontend Callers:**
- `hooks/queue/useVRAMManagement.ts` (line 64) - Pre-generation check
- `hooks/queue/useQueueProcessor.original.ts` (line 130) - Queue management

**Backend:** `routers/diagnostics.py`  
**Status:** ✅ Implemented  

**Action Items:**
- [ ] Verify VRAM calculation accuracy
- [ ] Test with different task sizes
- [ ] Add result caching for performance

---

### 6. Tools (`/v1/tools`)

#### 6.1 `/v1/tools/convert` (POST)
**Purpose:** Convert model formats  
**Frontend Callers:**
- `components/settings/ToolsTab.tsx` (line 67) - Model conversion

**Backend:** `routers/tools.py`  
**Status:** ✅ Implemented  

**Action Items:**
- [ ] Test conversion for all supported formats
- [ ] Verify progress reporting
- [ ] Add error handling for corrupted models

---

## 🔴 **NON-FASTAPI BACKEND: Station Manager (Flask, Port 3001)**

**Important:** The following endpoints are **NOT** part of the main FastAPI backend (port 2020). They run on a separate Flask service called "Station Manager" on port 3001.

### Purpose:
- Backend process lifecycle management (start/stop/restart)
- Real-time log streaming via Server-Sent Events (SSE)
- Memory monitoring and alerts
- Cross-process log aggregation

### 7.1 `/events/logs` (SSE - Server-Sent Events)
**Purpose:** Real-time log streaming from backend  
**Protocol:** Server-Sent Events (EventSource)  
**Frontend Callers:**
- `services/stationService.ts` (line 50) - SSE connection

**Backend:** `station_manager.py` (Flask)  
**Status:** ✅ Implemented  
**Connection Type:** Long-lived HTTP/SSE  

**Response Format:**
```typescript
{
  timestamp: string,
  level: "INFO" | "WARNING" | "ERROR" | "CRITICAL",
  message: string,
  source: string,
  type?: "progress" | "system" | "clear",
  // Progress-specific fields:
  percent?: number,
  current?: number,
  total?: number,
  raw?: string
}
```

**Features:**
- Auto-reconnect on disconnect (max 5 attempts)
- TQDM progress parsing
- Multi-client broadcasting

**Action Items:**
- [ ] Test reconnection logic
- [ ] Verify memory usage with many clients
- [ ] Add connection timeout handling in UI

---

### 7.2 `/log` (GET)
**Purpose:** Fetch recent log entries  
**Frontend Callers:**
- `hooks/useLogWatcher.ts` (line 20) - Initial log fetch
- `components/LogViewer.tsx` (line 27) - Log viewer

**Backend:** `station_manager.py`  
**Status:** ✅ Implemented  
**Query Params:** `limit` (optional)  

**Action Items:**
- [ ] Add pagination support
- [ ] Implement log filtering by level
- [ ] Add timestamp-based queries

---

### 7.3 `/log` (POST)
**Purpose:** Add log entry from frontend or backend  
**Frontend Callers:**
- `services/loggingService.ts` (line 2) - Frontend logging

**Backend:** `station_manager.py`  
**Status:** ✅ Implemented  

**Request Format:**
```typescript
{
  level: string,
  context: string,
  message: string,
  stack?: string
}
```

**Action Items:**
- [ ] Add rate limiting to prevent spam
- [ ] Implement log level filtering
- [ ] Add source tracking (frontend vs backend)

---

### 7.4 `/logs` (DELETE) or `/log/clear` (POST)
**Purpose:** Clear all logs  
**Frontend Callers:**
- `components/LogViewer.tsx` (line 46) - Clear logs button
- `services/stationService.ts` (line 111) - Service method

**Backend:** `station_manager.py`  
**Status:** ✅ Implemented (two endpoints for same function)  

**Action Items:**
- [ ] Standardize on single endpoint
- [ ] Add confirmation in UI
- [ ] Consider adding archive before clear

---

### 7.5 `/health` (GET)
**Purpose:** Check Station Manager health  
**Frontend Callers:**
- `services/stationService.ts` (line 102) - Status check

**Backend:** `station_manager.py`  
**Status:** ✅ Implemented  

**Response:**
```typescript
{
  status: "online" | "offline",
  manager: "running",
  backend_status?: {
    running: boolean,
    port: number,
    pid?: number
  }
}
```

**Action Items:**
- [ ] Add uptime tracking
- [ ] Include memory usage stats
- [ ] Add backend health forwarding

---

### 7.6 `/control/status` (GET)
**Purpose:** Get backend process status  
**Frontend:** Not directly called (internal)  

**Backend:** `station_manager.py`  
**Status:** ✅ Implemented  

**Response:**
```typescript
{
  running: boolean,
  port: number,
  pid?: number,
  cpu?: number,
  memory_mb?: number
}
```

---

### 7.7 `/control/start` (POST)
**Purpose:** Start backend process  
**Frontend:** Not directly called (auto-start on manager launch)  

**Backend:** `station_manager.py`  
**Status:** ✅ Implemented  
**Creates:** Python subprocess for `start_server.py`  

**Action Items:**
- [ ] Add startup timeout detection
- [ ] Implement startup health checks
- [ ] Add retry logic for failed starts

---

### 7.8 `/control/stop` (POST)
**Purpose:** Stop backend process  
**Frontend:** Not directly called  

**Backend:** `station_manager.py`  
**Status:** ✅ Implemented  
**Method:** SIGTERM then SIGKILL after timeout  

**Action Items:**
- [ ] Add graceful shutdown timeout config
- [ ] Verify cleanup of child processes
- [ ] Add force-kill option in UI

---

### 7.9 `/control/restart` (POST)
**Purpose:** Restart backend process  
**Frontend Callers:**
- `components/StatusPage/SystemControls.tsx` (line 67) - Restart button
- `services/stationService.ts` (line 121) - Service method

**Backend:** `station_manager.py`  
**Status:** ✅ Implemented  
**Method:** stop() then start()  

**Action Items:**
- [ ] Add restart progress tracking
- [ ] Implement restart timeout
- [ ] Add UI feedback during restart

---

### Station Manager Architecture Notes:

**Process Tree:**
```
Station Manager (Flask, PID X, Port 3001)
  └─> Moondream Backend (FastAPI, PID Y, Port 2020)
       └─> Workers (SDXL, Vision models, etc.)
```

**Communication Flow:**
```
Frontend (React)
  ├─> Port 2020 (FastAPI) - AI Operations
  └─> Port 3001 (Flask)   - Lifecycle & Logs
```

**Key Differences from FastAPI Backend:**
| Feature | FastAPI (2020) | Station Manager (3001) |
|---------|----------------|------------------------|
| Framework | FastAPI | Flask |
| Purpose | AI Operations | Process Control |
| Protocol | HTTP/REST | HTTP + SSE |
| Log Capture | Through manager | Direct stdout/stderr |
| Lifecycle | Managed by 3001 | Manages itself |

**Advantages of Separate Manager:**
- Backend crashes don't kill log viewer
- Can restart backend without losing logs
- Memory monitoring survives backend restart
- SSE connections stay alive during backend reload

**Action Items:**
- [ ] Document dual-port architecture
- [ ] Add port conflict detection
- [ ] Implement health checks between services
- [ ] Add automatic restart on backend crash

---

## Missing/Undocumented Endpoints

### Frontend References Not Found in Backend Search:
None identified - all frontend calls map to backend endpoints

### Backend Endpoints Not Called by Frontend:
*To be determined after backend router audit*

---

## Testing Checklist

### Critical Path Tests (P0)
- [ ] Image Generation (`/v1/images/generations`)
- [ ] Vision Analysis (`/v1/chat/completions`)
- [ ] Model Listing (`/v1/models`)
- [ ] VRAM Free (`/v1/system/unload`)

### Important Tests (P1)
- [ ] Model Refresh (`/v1/models/refresh`)
- [ ] Zombie Killer toggle
- [ ] VRAM Test
- [ ] GPU Boost

### Nice-to-Have Tests (P2)
- [ ] Prime Profile switching
- [ ] GPU Reset
- [ ] Model Conversion
- [ ] Dev Mode toggle

---

## Error Handling Audit

### Requirements for Each Endpoint:
1. **Frontend:**
   - [ ] Timeout handling (10-30s recommended)
   - [ ] Network error catching
   - [ ] User-friendly error messages
   - [ ] Retry logic where appropriate

2. **Backend:**
   - [ ] Input validation
   - [ ] Proper HTTP status codes
   - [ ] Structured error responses
   - [ ] Logging for debugging

---

## Performance Optimization Opportunities

1. **Caching:**
   - [ ] Model list caching (60s TTL)
   - [ ] VRAM status caching (5s TTL)
   - [ ] Prime profile caching (startup only)

2. **Batching:**
   - [ ] Combine multiple model queries
   - [ ] Batch VRAM checks

3. **Async Improvements:**
   - [ ] Add progress callbacks for long operations
   - [ ] Implement request cancellation
   - [ ] Add request queuing for rate limiting

---

## Security Considerations

### Endpoints Requiring Sudo:
- `/v1/system/gpu-reset`
- `/v1/system/prime-profile`

**Actions:**
- [ ] Verify passwordless sudo is properly configured
- [ ] Add permission checks before attempting
- [ ] Provide setup instructions in UI

### Rate Limiting:
- [ ] Implement rate limiting for expensive operations
- [ ] Add cooldown periods for GPU reset
- [ ] Throttle model refresh requests

---

## Documentation Improvements

**Needed:**
- [ ] OpenAPI/Swagger spec for all endpoints
- [ ] Request/response examples
- [ ] Error code documentation
- [ ] Authentication requirements (if any)

---

## Implementation Priority

### Phase 1 (Immediate):
1. Test critical path endpoints
2. Fix any broken error handling
3. Add missing CUDA cache clearing ✅ DONE

### Phase 2 (This Week):
1. Implement caching for expensive calls
2. Add request timeout handling
3. Improve error messages

### Phase 3 (Next Sprint):
1. Add OpenAPI documentation
2. Implement rate limiting
3. Add performance monitoring

---

## Notes

### Recent Fixes:
- ✅ Fixed `/v1/system/unload` to actually clear CUDA cache (2026-01-05)
- ✅ Fixed verification to use "moondream-2" instead of invalid model IDs
- ✅ Added VAE fallback for models with missing VAE files

### Known Issues:
- ⚠️ `/v1/generate` endpoint is legacy, consider deprecation
- ⚠️ Some error messages not user-friendly
- ⚠️ No request timeout on some frontend calls

---

**Next Steps:**
1. Review this plan with team
2. Prioritize action items
3. Create tickets for each phase
4. Begin systematic testing of each endpoint
