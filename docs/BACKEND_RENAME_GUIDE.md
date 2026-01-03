# Renaming Moondream-Station Backend - Complete Guide

**Current Name**: moondream-station  
**Proposed New Name**: [YOUR_NEW_NAME]

---

## Overview

Renaming the backend involves changes across multiple layers:
1. Python package names
2. Directory structures
3. Import statements
4. Configuration files
5. Environment variables
6. Frontend references
7. Documentation
8. Git repository

**Estimated Time**: 2-3 hours  
**Complexity**: HIGH  
**Risk**: MEDIUM (many moving parts)

---

## Pre-Rename Checklist

Before starting, decide on:
- [ ] **New project name** (e.g., "vision-server", "ai-backend", "gallery-engine")
- [ ] **New package name** (e.g., "vision_server", "ai_backend", "gallery_engine")
- [ ] **New directory name** (e.g., ".vision-server", ".ai-backend")
- [ ] **Keep/change GitHub repo name**
- [ ] **Backup current working state** (commit all changes)

---

## Part 1: Python Package Rename

### 1.1 Package Directory Structure

**Current**:
```
~/.moondream-station/
  └── moondream-station/
      └── moondream_station/
          ├── __init__.py
          ├── core/
          ├── commands.py
          └── ...
```

**New** (example: "vision-server"):
```
~/.vision-server/
  └── vision-server/
      └── vision_server/
          ├── __init__.py
          ├── core/
          ├── commands.py
          └── ...
```

### 1.2 Files to Rename/Modify

**Python Package Directory**:
```bash
# Rename main package directory
mv moondream_station/ vision_server/
```

**Setup/Config Files** to update:
- `pyproject.toml` or `setup.py`
- `requirements.txt` (if it references the package)
- `MANIFEST.in`
- `setup.cfg`
- `__init__.py` files

---

## Part 2: Import Statement Changes

### 2.1 All Python Files

Need to update imports throughout:

**Find all imports**:
```bash
grep -r "from moondream_station" .
grep -r "import moondream_station" .
```

**Example changes**:
```python
# Before
from moondream_station.core.rest_server import RESTServer
import moondream_station.launcher

# After
from vision_server.core.rest_server import RESTServer
import vision_server.launcher
```

**Files likely affected** (~50-100 files):
- All Python files in the package
- Test files
- Backend files
- Router files
- Launcher/CLI files

---

## Part 3: Configuration Files

### 3.1 Package Configuration

**`pyproject.toml`** (or `setup.py`):
```toml
# Before
[project]
name = "moondream-station"
packages = ["moondream_station"]

# After
[project]
name = "vision-server"
packages = ["vision_server"]
```

### 3.2 Entry Points

**CLI commands**:
```toml
# Before
[project.scripts]
moondream-station = "moondream_station.launcher:main"

# After
[project.scripts]
vision-server = "vision_server.launcher:main"
```

---

## Part 4: Directory Structure

### 4.1 User Data Directory

**Current**: `~/.moondream-station/`

**Options**:
1. **Rename in place** (keeps existing data):
   ```bash
   mv ~/.moondream-station ~/.vision-server
   ```

2. **Fresh install** (loses data):
   - Keep old directory
   - Create new directory
   - Manually migrate models/configs

### 4.2 Path References

**Update all hardcoded paths**:
```python
# Before
models_dir = os.path.expanduser("~/.moondream-station/models")

# After
models_dir = os.path.expanduser("~/.vision-server/models")
```

---

## Part 5: Environment Variables

### 5.1 Variable Names

**Current variables**:
- `MOONDREAM_MODELS_DIR`
- `MOONDREAM_CONFIG_PATH`
- (any other MOONDREAM_* variables)

**Options**:
1. **Rename completely**:
   ```bash
   VISION_SERVER_MODELS_DIR
   VISION_SERVER_CONFIG_PATH
   ```

2. **Keep backward compatibility**:
   ```python
   models_dir = os.environ.get(
       "VISION_SERVER_MODELS_DIR",
       os.environ.get("MOONDREAM_MODELS_DIR", default)
   )
   ```

### 5.2 Files to Update

Search for environment variable usage:
```bash
grep -r "MOONDREAM_" .
grep -r "moondream-station" .
```

---

## Part 6: Frontend Integration

### 6.1 API URLs

**Current** (in frontend code):
```typescript
const MOONDREAM_API = "http://localhost:2020";
```

**Update references**:
- Provider configuration files
- API service files
- Environment variables (.env)
- Documentation

### 6.2 Frontend Files to Update

In `Image-Gallery-2/`:
- `services/providers/moondream/MoondreamLocalProvider.ts`
- `.env` or config files
- Any hardcoded references to "moondream-station"
- Documentation

**Example**:
```typescript
// Before
const provider = new MoondreamLocalProvider({
  baseUrl: "http://localhost:2020",
  name: "Moondream Local"
});

// After
const provider = new VisionServerProvider({
  baseUrl: "http://localhost:2020",
  name: "Vision Server Local"
});
```

---

## Part 7: Service/Process Names

### 7.1 SystemD Service (if used)

**Service file**: `/etc/systemd/system/moondream-station.service`

```bash
# Rename service file
sudo mv /etc/systemd/system/moondream-station.service \
        /etc/systemd/system/vision-server.service

# Edit service file
sudo nano /etc/systemd/system/vision-server.service
# Update ExecStart, Description, etc.

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl enable vision-server
sudo systemctl start vision-server
```

### 7.2 Process Names

Any scripts that reference:
- Service names
- Process names
- Log file names

---

## Part 8: Documentation

### 8.1 All Documentation Files

**Update**:
- README.md (both repos)
- docs/*.md files
- Code comments
- Docstrings
- API documentation
- User guides

**Search and replace**:
```bash
# In all markdown files
find . -name "*.md" -exec sed -i 's/moondream-station/vision-server/g' {} +
find . -name "*.md" -exec sed -i 's/moondream_station/vision_server/g' {} +
```

---

## Part 9: Git Repository

### 9.1 GitHub Repository

**Option A: Rename existing repo**:
- GitHub Settings → Rename repository
- Update local remotes:
  ```bash
  git remote set-url origin https://github.com/USER/vision-server.git
  ```

**Option B: Create new repo**:
- Keep old repo for history
- Create new repo with new name
- Push fresh code

### 9.2 Git History

Consider:
- Keep old commits? (yes, for history)
- Update commit messages? (not necessary)
- Tags/releases? (update references)

---

## Part 10: Testing Checklist

After renaming, test:

### Installation
- [ ] `pip install -e .` works
- [ ] Package imports correctly
- [ ] CLI command works (`vision-server --help`)

### Functionality
- [ ] Backend starts successfully
- [ ] API endpoints respond
- [ ] Model loading works
- [ ] Frontend connects properly
- [ ] Configuration persists

### Data Migration
- [ ] Models directory accessible
- [ ] Config files loaded
- [ ] No broken paths

---

## Step-by-Step Execution Plan

### Phase 1: Preparation (30 min)
1. Commit all current changes
2. Create backup branch: `git checkout -b pre-rename-backup`
3. Decide on new names (project, package, directory)
4. Document current installation (paths, configs)

### Phase 2: Python Package (45 min)
1. Rename package directory: `moondream_station/` → `vision_server/`
2. Update `pyproject.toml` or `setup.py`
3. Update all import statements (use find/replace)
4. Test imports: `python -c "import vision_server"`

### Phase 3: Paths & Environment (30 min)
1. Rename user directory: `~/.moondream-station/` → `~/.vision-server/`
2. Update all path references in code
3. Update environment variable names
4. Test path resolution

### Phase 4: Configuration (15 min)
1. Update entry points
2. Update CLI commands
3. Test: `vision-server --version`

### Phase 5: Frontend Integration (20 min)
1. Update API URLs
2. Update provider names
3. Update environment variables
4. Test connection

### Phase 6: Documentation (20 min)
1. Update all README files
2. Update docs/ files
3. Update code comments

### Phase 7: Testing (30 min)
1. Reinstall package: `pip install -e .`
2. Start backend
3. Test API endpoints
4. Connect frontend
5. Verify full stack works

---

## Automated Script (Partial)

Here's a starter script to automate some changes:

```bash
#!/bin/bash

OLD_NAME="moondream-station"
OLD_PKG="moondream_station"
NEW_NAME="vision-server"
NEW_PKG="vision_server"

echo "Renaming $OLD_NAME to $NEW_NAME..."

# Rename package directory
mv $OLD_PKG/ $NEW_PKG/

# Update imports in Python files
find . -name "*.py" -exec sed -i "s/from $OLD_PKG/from $NEW_PKG/g" {} +
find . -name "*.py" -exec sed -i "s/import $OLD_PKG/import $NEW_PKG/g" {} +

# Update documentation
find . -name "*.md" -exec sed -i "s/$OLD_NAME/$NEW_NAME/g" {} +
find . -name "*.md" -exec sed -i "s/$OLD_PKG/$NEW_PKG/g" {} +

echo "Done! Manual steps still required:"
echo "1. Update pyproject.toml"
echo "2. Rename user directory (~/.moondream-station/)"
echo "3. Update environment variables"
echo "4. Update frontend references"
echo "5. Test installation"
```

---

## Rollback Plan

If something goes wrong:

```bash
# Restore from backup branch
git checkout pre-rename-backup

# Or restore package directory
mv vision_server/ moondream_station/

# Reinstall old version
pip uninstall vision-server
pip install -e .
```

---

## Estimated Impact

| Area | Files Affected | Estimated Changes |
|------|----------------|-------------------|
| Python imports | 50-100 | Medium |
| Config files | 5-10 | Low |
| Path references | 20-30 | Medium |
| Frontend files | 5-10 | Low |
| Documentation | 15-20 | Low |
| Environment vars | 3-5 | Low |

**Total Estimated Changes**: 100-175 files

---

## Recommendations

### Option 1: Full Rename (Clean Break)
**Pros**: Clean, modern name  
**Cons**: Breaks existing installations  
**Best for**: Fresh start, active development

### Option 2: Backward Compatible
**Pros**: Existing users unaffected  
**Cons**: Technical debt (supporting old names)  
**Best for**: Production systems, many users

### Option 3: Gradual Migration
**Pros**: Smooth transition  
**Cons**: Longer timeline  
**Best for**: Large codebases

---

## My Recommendation

**If this is just for you** (personal project):
→ **Option 1** (Full Rename) - Clean break, no legacy baggage

**If you have users/deployments**:
→ **Option 2** (Backward Compatible) - Support old `MOONDREAM_*` env vars for 6 months

---

## Questions to Answer

Before proceeding:
1. What's the new name? (e.g., "vision-server", "ai-backend")
2. Keep existing data directory or fresh install?
3. Rename GitHub repo or create new one?
4. Support backward compatibility?
5. Timeline for migration?

---

**Would you like me to help with the actual renaming process once you decide on a new name?**
