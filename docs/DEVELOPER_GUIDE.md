# Developer Guide & Codebase Overview

This document provides a comprehensive overview of the **Image Gallery 2** project structure, architecture, and key files. It is intended to help AI assistants (like Gemini and Claude Code) and human developers quickly understand the codebase to accelerate feature development and bug fixing.

## 1. Project Overview

**Name**: Image Gallery 2  
**Type**: React Single Page Application (SPA)  
**Tech Stack**:
*   **Frontend**: React (v19), TypeScript, Vite
*   **Styling**: Tailwind CSS, Emotion (legacy/styled components)
*   **State Management**: React `useState`/`useContext` (mostly localized in `App.tsx` and passed down)
*   **Data Persistence**: IndexedDB (via `idb` library) for large image data; LocalStorage for lightweight settings.
*   **Backend Interactions**: Communicates with a local Python backend (Moondream Station) via REST API for AI operations.

**Purpose**: An advanced local image gallery focusing on AI-powered features:
*   Smart Searching (semantic search via CLIP/Moondream).
*   Automatic Captioning & Tagging.
*   Generative AI (Image Generation, Editing, Video Animation).
*   Local-first privacy (runs on user's hardware).

---

## 2. Directory Structure

```
/
├── components/         # React UI Components (Pages, Modals, Widgets)
├── services/           # Business Logic & API Clients
│   ├── providers/      # Individual AI Provider implementations
├── utils/              # Helper functions (File I/O, Hashing, DB)
├── scripts/            # Maintenance, Setup, and Debug scripts
├── App.tsx             # Main Application Logic & State Container
├── types.ts            # Global TypeScript Definitions (Data Models)
├── index.tsx           # Entry Point
└── vite.config.ts      # Build Configuration
```

---

## 3. Key Core Files

### `App.tsx`
*   **Role**: The "Brain" of the application.
*   **Responsibilities**:
    *   **State**: Manages `images`, `settings`, `selection`, `currentUser`, and `activeView`.
    *   **Routing**: Handles "manual" routing via Conditional Rendering (e.g., `activeView === 'gallery'`).
    *   **Logic**: Contains high-level handlers like `handleGenerationSubmit`, `handleImport`, `handleLogin`.
    *   **Initialization**: Loads settings, initializes DB connection on mount.

### `types.ts`
*   **Role**: The Source of Truth for Data Models.
*   **Key Interfaces**:
    *   `ImageInfo`: The core image object (ID, dataUrl, metadata).
    *   `AdminSettings`: Configuration for AI providers and app behavior.
    *   `AiProvider`: Union type of supported providers (`gemini`, `moondream_local`, etc.).
    *   `PromptModalConfig`: Controls the state of the Generation Modal.

### `services/aiService.ts`
*   **Role**: Unified Facade for AI Operations.
*   **Responsibilities**:
    *   **Routing**: Decides which provider to use for a task (Vision, Generation) based on `AdminSettings`.
    *   **Fallback**: Implements `executeWithFallback` to try multiple providers if one fails.
    *   **Methods**: `analyzeImage`, `generateImageFromPrompt`, `animateImage`.

### `services/providerCapabilities.ts`
*   **Role**: Registry of what each AI Provider can do.
*   **Content**: A mapping object defining if a provider supports `vision`, `generation`, `animation`, etc. Used by the UI to show/hide options.

---

## 4. Component Reference

### Core Views
*   **`ImageGrid.tsx`**: The main gallery view. Displays thumbnails, handles selection, drag-and-drop sorting.
*   **`ImageViewer.tsx`**: The detailed single-image view. Handles zooming, panning, and slideshows.
*   **`CreationsPage.tsx`**: A dedicated view for AI-generated assets.
*   **`AdminSettingsPage.tsx`**: The configuration panel for API keys, models, and routing.

### AI & Generation
*   **`PromptSubmissionModal.tsx`**: The main interface for creating new content.
    *   **Features**: Text prompt input, Aspect Ratio selection, Source Image toggle, Dynamic Model Selection dropdown.
*   **`PromptHistoryPage.tsx`**: Lists past prompts; allows re-running them.
*   **`IdleSlideshow.tsx`**: A screensaver-like component that auto-plays images after inactivity.

### Utility Components
*   **`SelectionActionBar.tsx`**: Floating toolbar for batch operations (Delete, Remix, Download).
*   **`AnalysisProgressIndicator.tsx`**: Visual feedback for background AI analysis tasks.
*   **`NotificationArea.tsx`**: Toast notification system.

---

## 5. Services & Logic

### `services/providerRegistry.ts`
*   **Role**: Dynamic loader for AI provider classes to avoid circular dependencies and huge bundle sizes.

### `services/providers/`
*   **`moondream.ts`**: Client for the local Moondream Station API.
*   **`gemini.ts`**: Client for Google's Gemini API (Vision, Generation, Veo).
*   **`openai.ts`**: Client for DALL-E 3 and GPT-4.
*   **`comfyui.ts`**: Client for local ComfyUI instance (highly customizable generation).
*   **`grok.ts`**: Client for xAI's Grok API.

### `utils/`
*   **`idb.ts`**: IndexedDB wrapper for storing large blobs (images) efficiently.
*   **`fileUtils.ts`**: Helpers for reading files, converting Blobs to Base64, and downloads.

---

## 6. Development workflows

### Adding a New AI Model
1.  **Backend**: Add the model handler in `.moondream-station/backends/`.
2.  **Manifest**: Update `.moondream-station/local_manifest.json`.
3.  **Frontend Types**: Update types in `types.ts` if needed (rare).
4.  **Frontend UI**: Add the model ID to `MOONDREAM_MODELS` list in `AdminSettingsPage.tsx`.

### Debugging
*   **Console**: The app logs extensively to the browser console.
*   **LogViewer**: There is a built-in `LogViewer.tsx` component (accessible via Settings) to see internal app logs.
*   **Backend Logs**: Check `scripts/logs/server.log` for Python backend issues.

---

## 7. Known Quirks

*   **"Silent Failures"**: Historically, some buttons didn't provide feedback on auth failure. We are actively moving to explicit `addNotification` calls (e.g., in `App.tsx` generation handlers).
*   **Routing**: It's not a true Router (like React Router). Use `setActiveView` in `App.tsx` to navigate.
*   **Selection Mode**: The `SelectionActionBar` only appears when `selectionMode` is true. `Ctrl+Click` on an image usually toggles this.

---

## 8. Standard Components & Libraries

### `components/Modal.tsx`
*   **Role**: The standard, accessible modal wrapper for the application.
*   **Library**: Built on `@headlessui/react`.
*   **Usage**: Wraps content in a standard Dialog. Supports `maxWidth`, `title`, and custom styling via `panelClassName`.
*   **Refactoring Rule**: Always use this component instead of creating custom `div` overlays or `z-50` layers.

### Icons
*   **Library**: `@heroicons/react`.
*   **Usage**: Import directly from `@heroicons/react/24/outline` (or `24/solid`).
*   **Refactoring Rule**: Do not use inline SVGs or legacy `d="..."` paths. If a custom brand icon is needed, place it in `components/BrandIcons.tsx`.

### `presetManager.ts`
*   **Role**: Manages generation presets (Generation vs Upscale).
*   **Usage**: Use `loadPresets()`, `createPreset()`, etc. Note: `createPreset` uses strict structural typing (`cfg_scale` vs `targetMegapixels`) to differentiate preset types.
