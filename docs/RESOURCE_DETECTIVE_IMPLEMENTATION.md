# Resource Detective & Log Server Implementation

**Date:** 2025-12-19
**Status:** Implemented

## 1. Resource Detective (Metadata Extraction)
The system now parses "A1111/Forge" style metadata from PNG `tEXt` chunks to identify the exact resources used to generate an image.

### Features
*   **Automatic Parsing:** Triggered on image import.
*   **Model Identification:** Extracts `Model hash` and `Model` name.
*   **LoRA Extraction:** Detects all `Lora hashes` (e.g., `<lora:DetailTweaker:1.0>`).
*   **UI Integration:** Displays color-coded badges in the Image Viewer metadata panel.

### Implementation Details
*   **File:** `utils/fileUtils.ts` (New parsing logic in `extractAIGenerationMetadata` and `parseA1111Extended`)
*   **File:** `components/ImageViewer.tsx` (New rendering logic in `MetadataPanel`)
*   **Types:** Added `ResourceHash` and `ResourceUsage` interfaces in `types.ts`.

### Updates (2026-01-04)
*   **JPEG Support:** Added support for parsing A1111 metadata from JPEG `EXIF UserComment` tags (via custom parser in `fileUtils.ts`).
*   **Metadata Recovery:** `useAnalysisExecutor` now attempts to extract metadata from the source file if it was missing during the initial upload (e.g. legacy uploads).

---

## 2. Centralized Log Server
A new Python-based microservice was created to aggregate frontend console logs, making it easier to debug runtime issues without browser dev tools.

### Architecture
*   **Port:** `3001`
*   **Endpoints:**
    *   `POST /log`: Accepts JSON logs (`{ level, message, context, ... }`)
    *   `GET /log`: Returns all logs as HTML (or JSON with `?format=json`)
    *   `DELETE /log/clear`: Clears current logs
*   **Integration:** The frontend `loggingService.ts` automatically forwards `warn` and `error` logs to this server.

### Implementation Details
*   **Microservice:** `log_server.py` (Flask application)
*   **Frontend Hook:** `services/aiService.ts` modified to use `logger.error` which pipes to the server.

---

## 3. Dynamic Model Loading
The hardcoded list of Moondream models in the frontend fallback was preventing the use of newer, optimized models. This has been resolved by relying on the backend as the single source of truth.

### Changes
*   **Reverted Hardcoding:** Removed manual entries in `AdminSettingsPage.tsx`.
*   **Backend Source:** The `moondream_local` provider now correctly populates its dropdown from the `GET /v1/models` endpoint.
*   **New Models:**
    *   `Moondream 3 (4-bit 8GB)`: Optimized for speed and GPU usage.
    *   `WD14 ViT Tagger v3`: Latest tagging model.

---

## Future Improvements
*   **Persist Resources:** Save extracted resource hashes to the `gallery.json` database.
*   **Resource Search:** Allow users to click a LoRA badge to search for all images using that LoRA.
*   **Log Persistence:** Write server logs to disk instead of memory-only.
