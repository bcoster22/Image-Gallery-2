# Oversized Files Audit (Jan 2026)

This document lists files that exceed the size limits defined in `AI_MAINTAINABILITY_FRAMEWORK.md`.
**Limit:** 200 lines (Components/API), 150 lines (Services).

## 🚨 Critical Violations (>500 Lines)

These files are monolithic and should be prioritized for immediate refactoring to improve AI maintainability and reduce regression risks.

### Backend (Python)
| File | Lines | Responsibility | Suggested Action |
|------|-------|----------------|------------------|
| ~~`moondream_station/core/rest_server.py`~~ | ~~**2583**~~ → **645** | Main API Server | ✅ **COMPLETED** - Extracted routes into `routers/` (models.py, vision.py, generation.py, system.py, tools.py, diagnostics.py). Fixes applied by Claude on 2026-01-03. |
| `backends/sdxl_backend/backend.py` | **804** | SDXL Logic | Split into `pipeline_manager.py`, `image_generator.py`, `utils.py`. |
| `moondream_station/launcher.py` | **717** | Startup Logic | Separate `setup` logic from `execution` logic. |
| `moondream_station/core/manifest.py` | **559** | Model Manifests | Extract validation and discovery into sub-modules. |
| `moondream_station/commands.py` | **516** | CLI Commands | Split by command group (install, run, config). |

### Frontend (TypeScript/React)
| File | Lines | Responsibility | Suggested Action |
|------|-------|----------------|------------------|
| `hooks/queue/useQueueProcessor.ts` | **765** | Queue Logic | **Critical:** Extract `execution` logic and `retry` logic into separate hooks. |
| `App.tsx` | **672** | Main Entry | Move context providers to `AppProviders.tsx`; extract modal logic. |
| `components/ImageGrid.tsx` | **658** | Gallery Grid | Extract `SelectionLogic` and `ImageCard` sub-components. |
| `components/EnhancePlayer.tsx` | **630** | Compare View | Extract `Slider` and `Controls` components. |
| `components/AdvancedSettingsPanel.tsx` | **548** | Settings UI | Split by tab/section (e.g., `GenerationSettings.tsx`, `SystemSettings.tsx`). |
| `services/providers/moondream/MoondreamLocalProvider.ts` | **523** | API Provider | Extract `apiCaller` utilities and `types`. |
| `components/StatusPage/GPUMetrics/GPUControlCard.tsx` | **518** | GPU UI | Extract `FanControl` and `PowerLimit` into small components. |

## ⚠️ Major Violations (300-500 Lines)

These files are becoming hard to maintain and should be refactored when possible.

### Backend
- `moondream_station/inference.py` (451 lines)
- `moondream_station/core/system_diagnostics.py` (444 lines)
- `moondream_station/ui/display.py` (309 lines)

### Frontend
- `components/PromptEngineeringPage.tsx` (489 lines)
- `services/providers/gemini.ts` (465 lines)
- `components/AdminSettingsPage.tsx` (457 lines)
- `components/ImageViewer/MetadataPanel.tsx` (412 lines)
- `components/Diagnostics/DiagnosticsPage.tsx` (390 lines)
- `services/aiService.ts` (388 lines)
- `components/ImageViewer.tsx` (362 lines)
- `components/AdminVersions.tsx` (346 lines)
- `components/settings/SettingsComponents.tsx` (344 lines)
- `utils/fileUtils.ts` (342 lines)

## Action Plan Recommendation
1.  ~~**Refactor `useQueueProcessor.ts`**~~: It contains mixed concerns (queue management, execution, error handling).
2.  ~~**Modularize `rest_server.py`**~~: ✅ **COMPLETED (2026-01-03)** - Successfully refactored from 2583 to 645 lines with 6 new router modules. Bugs fixed and tested by Claude.
3.  **Performance Page Strategy**: For the requested "Performance Graph" feature, ensure usage of a new specialized component (e.g., `components/PerformanceOverview/BenchmarkGraph.tsx`) to avoid bloating `PerformanceOverview.tsx` (currently ~150 lines, safe for now).
