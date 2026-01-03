# Backend Rename - Quick Checklist

Use this checklist when renaming from `moondream-station` to your new name.

---

## Pre-Flight

- [ ] Decided on new name: ________________
- [ ] Committed all current changes
- [ ] Created backup branch: `git checkout -b pre-rename-backup`
- [ ] Documented current paths and configs

---

## Python Package (Backend Repo)

- [ ] Renamed package directory: `moondream_station/` → `NEW_PKG/`
- [ ] Updated `pyproject.toml` or `setup.py` (name, packages)
- [ ] Updated all `import moondream_station` statements
- [ ] Updated all `from moondream_station` statements  
- [ ] Updated entry points/CLI commands
- [ ] Tested: `python -c "import NEW_PKG"`

**Estimated files**: 50-100

---

## Paths & Directories

- [ ] Renamed user directory: `~/.moondream-station/` → `~/.NEW_NAME/`
- [ ] Updated all path references in code
- [ ] Updated `models_dir` default paths
- [ ] Updated `config_dir` default paths
- [ ] Tested path resolution

**Estimated files**: 20-30

---

## Environment Variables

- [ ] Renamed `MOONDREAM_MODELS_DIR` → `NEW_MODELS_DIR`
- [ ] Renamed `MOONDREAM_CONFIG_PATH` → `NEW_CONFIG_PATH`
- [ ] Updated all env var references in code
- [ ] Updated .env files
- [ ] (Optional) Added backward compatibility fallbacks

**Estimated files**: 3-5

---

## Configuration Files

- [ ] Updated `pyproject.toml`
- [ ] Updated `setup.py` (if exists)
- [ ] Updated `requirements.txt`
- [ ] Updated `MANIFEST.in`
- [ ] Updated `README.md`

---

## Frontend Integration (Image-Gallery-2 Repo)

- [ ] Updated API URLs in providers
- [ ] Updated provider names
- [ ] Updated `.env` files
- [ ] Updated TypeScript interfaces
- [ ] Updated configuration files
- [ ] Updated documentation

**Files to check**:
- `services/providers/moondream/MoondreamLocalProvider.ts`
- `.env`
- `README.md`

---

## Services & Processes

- [ ] Renamed systemd service file (if used)
- [ ] Updated service `ExecStart` command
- [ ] Reloaded systemd: `sudo systemctl daemon-reload`
- [ ] Updated log file names
- [ ] Updated process monitoring scripts

---

## Documentation

- [ ] Updated main README.md (backend)
- [ ] Updated main README.md (frontend)
- [ ] Updated all docs/*.md files
- [ ] Updated code comments
- [ ] Updated docstrings
- [ ] Updated API documentation

**Quick replace**:
```bash
find . -name "*.md" -exec sed -i 's/moondream-station/NEW-NAME/g' {} +
```

---

## Git Repository

- [ ] Renamed GitHub repo (or created new one)
- [ ] Updated local remote URL
- [ ] Updated repo description
- [ ] Updated README badges
- [ ] Tagged release (optional)

```bash
git remote set-url origin https://github.com/USER/NEW-REPO.git
```

---

## Testing

### Installation
- [ ] Uninstalled old package: `pip uninstall moondream-station`
- [ ] Installed new package: `pip install -e .`
- [ ] CLI command works: `NEW-NAME --help`
- [ ] Version check works: `NEW-NAME --version`

### Functionality
- [ ] Backend starts: `NEW-NAME interactive`
- [ ] API responds: `curl http://localhost:2020/health`
- [ ] Models endpoint works: `curl http://localhost:2020/v1/models`
- [ ] Generation works (test image)

### Frontend
- [ ] Frontend connects to backend
- [ ] Models list populates
- [ ] Image generation works
- [ ] No console errors

### Data Migration
- [ ] Models directory found
- [ ] Config files loaded
- [ ] No path errors in logs

---

## Post-Rename Cleanup

- [ ] Removed old package directory (if renamed)
- [ ] Removed old user directory (if migrated)
- [ ] Updated all team members
- [ ] Updated deployment scripts
- [ ] Updated CI/CD pipelines
- [ ] Archived old repo (if created new one)

---

## Rollback (if needed)

If something breaks:

```bash
# Switch back to backup
git checkout pre-rename-backup

# Restore old package
mv NEW_PKG/ moondream_station/

# Reinstall
pip install -e .

# Restart services
```

---

## Files That Need Manual Review

These can't be auto-replaced safely:

1. **API documentation** - May have specific moondream references
2. **User guides** - May mention moondream in examples
3. **Error messages** - Should be user-friendly
4. **Log messages** - For debugging clarity
5. **Comments** - Especially historical ones

---

## Common Gotchas

1. **Case sensitivity**: `moondream-station` vs `moondream_station`
2. **Hidden files**: `.moondream-station` directory
3. **Cached imports**: Clear Python cache (`__pycache__`)
4. **Old processes**: Kill existing backend processes
5. **Browser cache**: Clear if frontend cached old name

---

## Final Verification

Run this test suite:

```bash
# Backend
python -c "import NEW_PKG; print('✅ Import works')"
NEW-NAME --version
NEW-NAME interactive &
sleep 5
curl http://localhost:2020/health
curl http://localhost:2020/v1/models

# Frontend
cd ../Image-Gallery-2
npm run dev
# Visit http://localhost:3000 and test
```

---

**Completion**: When all boxes are checked, renaming is complete! 🎉
