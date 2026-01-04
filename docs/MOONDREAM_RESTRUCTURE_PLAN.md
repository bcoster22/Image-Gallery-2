# Implementation Plan: Restructuring Moondream Station for AI-Driven Development

This plan addresses the critical "Split Brain" issue where the Moondream Station backend exists in two conflicting states: the Repository (`moondream-station`) and the Application Data Directory (`~/.moondream-station`). This structure causes confusion, difficult debugging, and deployment drift.

We will consolidate code into the Repository and treat the Application Data Directory purely as a runtime artifact storage (models, configs, logs).

## Current State Assessment

| Component | Repository Location (`.../moondream-station/`) | App Data Location (`~/.moondream-station/`) | Status |
| :--- | :--- | :--- | :--- |
| **Source Code** | ✅ Primary source | ❌ Copies found (e.g. backends) | **SPLIT** |
| **Backends** | Has `sdxl`, `z_image`, `joycaption` | Has `moondream`, `wd14`, `nsfw` | **FRAGMENTED** |
| **Virtual Env** | ❌ Missing (expected by scripts) | ✅ Exists (`venv/`) | **MISALIGNED** |
| **Logs** | ❌ Stale/Duplicate logs | ✅ Active logs | **DUPLICATED** |
| **Config** | defaults in code | `config.json` | **OK** (Runtime vs Static) |

## Objectives

1.  **Single Source of Truth**: All backend code (including all sub-backends) MUST reside in the Git Repository.
2.  **Standardized Environment**: The Python environment must be accessible via standard paths (`.venv`) within the repo.
3.  **Clear Separation**:
    *   **Repo**: Code, Tests, Scripts.
    *   **App Dir**: Models, User Config, Active Logs.

---

## Phase 1: Unify Backend Code base

**Goal**: Move all "orphaned" backends from the App Directory into the Repository so they are version controlled.

1.  **Inventory & Move**:
    *   Identify backends in `~/.moondream-station/backends` that are missing from repo.
    *   *Action*: Move `florence2_backend`, `moondream_backend`, `moondream_gpu`, `nsfw_backend`, `wd14_backend` to `.../moondream-station/backends/`.
    *   *Conflict Resolution*: For `joycaption_backend` (exists in both), diff them. If identical/similar, prefer the Repo version but check for latest changes in App Dir.

2.  **Clean App Directory**:
    *   Once confirmed moved, delete the `backends` folder in `~/.moondream-station/` to prevent future confusion. The server should be configured to load from the source (Repo) in Dev Mode.

## Phase 2: Standardize Development Environment

**Goal**: Make the `venv` discoverable by standard tools (VSCode, Pytest, AI Agents).

1.  **Symlink Venv**:
    *   *Action*: Create a symbolic link in the repo root pointing to the actual venv.
    *   Command: `ln -s ~/.moondream-station/venv ~/.moondream-station/moondream-station/.venv`
    *   *Benefit*: `package.json` scripts, `pytest`, and IDEs will "just work" without custom paths.

2.  **fix `start_server.sh`**:
    *   Update the startup script to explicitly look for `.venv/bin/python` in the repo directory first.

## Phase 3: Configuration & Testing Setup

**Goal**: Prepare the unified codebase for the testing framework.

1.  **Create `pytest.ini`**:
    *   Add configuration to the repo root to define test discovery paths and python path.
    *   *Content*:
        ```ini
        [pytest]
        pythonpath = .
        testpaths = tests
        asyncio_mode = auto
        ```

2.  **Update `package.json`**:
    *   Update scripts to rely on the local `.venv` symlink.
    *   `"backend": "./.venv/bin/python3 start_server.py"`
    *   `"test:backend": "./.venv/bin/pytest"`

3.  **Create `DEVELOPER.md`**:
    *   Create a new documentation file explaining this layout.
    *   *Key Sections*: "Where is the code?", "Where are the logs?", "How to run tests".

## Phase 4: Verification

1.  **Manual Start**: Run `./start_server.sh` and ensure it finds all backends (now in the repo).
2.  **Test Run**: Run `npm run test:backend` (which calls pytest) and ensure it finds the environment and code.

---

## Approval Request

Please confirm you wish to proceed with **Phase 1 (Unify Backends) and Phase 2 (Link Venv)**.

> **Note**: This involves moving files. I will perform a backup of the `~/.moondream-station/backends` folder to `~/.moondream-station/backends_backup` before modifying anything.
