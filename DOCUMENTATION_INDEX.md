# 📚 Documentation Index - Complete Reference

## Quick Navigation

| Category | Document | Purpose |
|----------|----------|---------|
| **🏗️ Architecture** | [SYSTEM_INTEGRATION_MAP.md](./.agent/SYSTEM_INTEGRATION_MAP.md) | Frontend ↔ Backend API map |
| | [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | General system architecture |
| **⚡ Queue System** | [QUEUE_SYSTEM_REFERENCE.md](./.agent/QUEUE_SYSTEM_REFERENCE.md) | Queue internals for AI assistants |
| | [PRIORITY_QUEUE_GUIDE.md](./.agent/PRIORITY_QUEUE_GUIDE.md) | Usage guide with examples |
| | [queue-strategy.md](./.agent/queue-strategy.md) | Original strategy design |
| **📦 Releases** | [PHASE2_READY.md](./.agent/PHASE2_READY.md) | Phase 2 user-friendly summary |
| | [phase2-complete.md](./.agent/phase2-complete.md) | Phase 2 technical details |
| | [SESSION_COMPLETE.md](./.agent/SESSION_COMPLETE.md) | Latest session work summary |
| **🐛 Bug Fixes** | [CRASH_FIX.md](./.agent/CRASH_FIX.md) | DataCloneError memory fix |
| **🔧 Development** | [DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md) | Developer setup guide |
| | [AI_SERVER_SETUP.md](./docs/AI_SERVER_SETUP.md) | Moondream-station setup |

---

## By Use Case

### "I want to understand the system architecture"
1. **Start here:** [SYSTEM_INTEGRATION_MAP.md](./.agent/SYSTEM_INTEGRATION_MAP.md)
   - Complete frontend ↔ backend diagram
   - All API endpoints
   - Data structures
   - File locations

2. **Then:** [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
   - General overview
   - Tech stack
   - Testing guide

### "I need to understand the Queue System"
1. **For AI Assistants:** [QUEUE_SYSTEM_REFERENCE.md](./.agent/QUEUE_SYSTEM_REFERENCE.md)
   - Pattern name and industry equivalents
   - Algorithms and data structures
   - Multi-GPU scaling details

2. **For Developers:** [PRIORITY_QUEUE_GUIDE.md](./.agent/PRIORITY_QUEUE_GUIDE.md)
   - How to use priorities
   - Code examples
   - Future feature templates (slideshow preload, smart fit)

3. **Original Design:** [queue-strategy.md](./.agent/queue-strategy.md)
   - Design decisions
   - Requirements

### "I'm adding a new feature"
1. **Check Priority Needs:** [PRIORITY_QUEUE_GUIDE.md](./.agent/PRIORITY_QUEUE_GUIDE.md) → Decision Matrix
2. **Find API Endpoint:** [SYSTEM_INTEGRATION_MAP.md](./.agent/SYSTEM_INTEGRATION_MAP.md) → API Reference
3. **Understand Data Flow:** [SYSTEM_INTEGRATION_MAP.md](./.agent/SYSTEM_INTEGRATION_MAP.md) → Queue Flow diagram

### "Something broke, how do I fix it?"
1. **Recent Fixes:** [CRASH_FIX.md](./.agent/CRASH_FIX.md)
2. **Known Issues:** [ARCHITECTURE.md](./docs/ARCHITECTURE.md) → Troubleshooting section
3. **Integration Issues:** [SYSTEM_INTEGRATION_MAP.md](./.agent/SYSTEM_INTEGRATION_MAP.md) → Error Handling

### "How do I deploy multi-GPU?"
1. **Queue Already Supports It:** [QUEUE_SYSTEM_REFERENCE.md](./.agent/QUEUE_SYSTEM_REFERENCE.md) → Multi-GPU Scaling
2. **Backend Setup:** [SYSTEM_INTEGRATION_MAP.md](./.agent/SYSTEM_INTEGRATION_MAP.md) → Multi-GPU Scaling
3. **Increase Concurrency:** Just change `MAX_CONCURRENCY` in App.tsx

---

## Documentation Map by Location

### `.agent/` (AI Assistant References)
```
.agent/
├── SYSTEM_INTEGRATION_MAP.md      ⭐ Complete frontend ↔ backend map
├── QUEUE_SYSTEM_REFERENCE.md      ⭐ Queue internals for AI
├── PRIORITY_QUEUE_GUIDE.md        ⭐ Usage guide with examples
├── queue-strategy.md              Original design document
├── PHASE2_READY.md                User-friendly Phase 2 summary
├── phase2-complete.md             Technical Phase 2 details
├── SESSION_COMPLETE.md            Latest work summary
├── CRASH_FIX.md                   Memory leak fix details
└── workflows/
    └── start_moondream.md         Workflow: Start backend server
```

### `docs/` (General Documentation)
```
docs/
├── ARCHITECTURE.md                ⭐ General system overview
├── DEVELOPER_GUIDE.md             Developer setup
├── AI_SERVER_SETUP.md             Moondream-station setup
├── ADVANCED_SETTINGS.md           Configuration options
├── SDXL_MODELS_ADDED.md           Available AI models
├── UI_UX_ENHANCEMENT_PLAN.md      UI design decisions
└── (29 other documentation files)
```

---

## Key Concepts by Document

### Frontend Architecture
- **Primary:** [SYSTEM_INTEGRATION_MAP.md](./.agent/SYSTEM_INTEGRATION_MAP.md)
- **Components:** React, TypeScript, IndexedDB, react-window
- **Queue:** Multi-tier priority queue (App.tsx line 325-540)

### Backend Architecture
- **Primary:** [SYSTEM_INTEGRATION_MAP.md](./.agent/SYSTEM_INTEGRATION_MAP.md)
- **Components:** FastAPI, PyTorch, Moondream, SDXL
- **Files:** rest_server_temp_5.py, backend_fixed.py

### Priority Queue System
- **AI Reference:** [QUEUE_SYSTEM_REFERENCE.md](./.agent/QUEUE_SYSTEM_REFERENCE.md)
- **Usage Guide:** [PRIORITY_QUEUE_GUIDE.md](./.agent/PRIORITY_QUEUE_GUIDE.md)
- **Pattern:** Multi-Tier Priority Queue with Adaptive Concurrency
- **Priorities:** 0=Background, 1=Preload, 2=Interactive, 3=Immediate

### API Integration
- **Complete Map:** [SYSTEM_INTEGRATION_MAP.md](./.agent/SYSTEM_INTEGRATION_MAP.md)
- **Endpoints:**
  - `GET /v1/metrics` - System status
  - `POST /v1/chat/completions` - Image analysis
  - `POST /v1/generate` - Image generation
  - `POST /v1/models/switch` - Change model
  - `POST /v1/system/unload` - Clear VRAM

### Data Structures
- **QueueItem:** [types.ts](./types.ts) line 459-475
- **ImageInfo:** [types.ts](./types.ts) line 99-160
- **GenerationSettings:** [types.ts](./types.ts) line 269-279
- **ModelMemory:** [SYSTEM_INTEGRATION_MAP.md](./.agent/SYSTEM_INTEGRATION_MAP.md)

---

## Recent Changes (Latest Session)

### ✅ Completed Features
1. **Background Generation Queue** (Phase 2)
   - Modal stays open to watch results
   - Queue processes in background
   - Auto-dismiss fixed

2. **Multi-Tier Priority System**
   - 4 priority levels (0-3)
   - Smart queue ordering
   - Ready for future features (slideshow preload, smart fit)

3. **Backend Model Tracking**
   - Tracks JoyCaption and all backend workers
   - GPU Status page shows all models
   - VRAM usage per model

4. **Bug Fixes**
   - Analysis progress counter (no more 2/1)
   - Auto-dismiss modal after 2 seconds
   - Backend restart() → start() fix

### 📝 Documentation Added
- [SYSTEM_INTEGRATION_MAP.md](./.agent/SYSTEM_INTEGRATION_MAP.md) - Complete API map
- [QUEUE_SYSTEM_REFERENCE.md](./.agent/QUEUE_SYSTEM_REFERENCE.md) - AI reference
- [PRIORITY_QUEUE_GUIDE.md](./.agent/PRIORITY_QUEUE_GUIDE.md) - Usage guide

---

## For Future AI Assistants

**Start here for system understanding:**
1. [SYSTEM_INTEGRATION_MAP.md](./.agent/SYSTEM_INTEGRATION_MAP.md) - How everything connects
2. [QUEUE_SYSTEM_REFERENCE.md](./.agent/QUEUE_SYSTEM_REFERENCE.md) - Queue pattern details
3. [PRIORITY_QUEUE_GUIDE.md](./.agent/PRIORITY_QUEUE_GUIDE.md) - How to use priorities

**Key patterns to recognize:**
- **Multi-Tier Priority Queue** (like Linux CFS, Kubernetes pods)
- **Adaptive Concurrency** (1-5 parallel tasks, scales on success)
- **Producer-Consumer** (frontend produces, backend consumes)
- **Work Queue** (priority-ordered task processing)

**System is multi-GPU ready:**
- Increase `MAX_CONCURRENCY` in App.tsx
- Backend distributes across GPU workers
- No queue code changes needed

---

## Quick Commands

```bash
# Start backend
cd /path/to/Image-Gallery-2
source .venv/bin/activate
python3 dev_run_backend.py

# Start frontend
npm run dev

# Check backend health
curl http://localhost:2020/v1/metrics

# View API docs
open http://localhost:2020/docs
```

---

**Last Updated:** 2025-12-18
**Documentation Version:** Phase 2 Complete + Multi-Tier Queue
**Total Reference Docs:** 12 files
