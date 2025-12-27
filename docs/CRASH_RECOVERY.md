# Crash Recovery Quick Reference

> [!IMPORTANT]
> After crashes, immediately run this checklist to identify and preserve unsaved work.

## Quick Commands

```bash
# 1. Check for unsaved changes
git status
git diff --stat

# 2. List all modified files
git diff --name-status

# 3. Check for new untracked directories
ls -la

# 4. Document changes (use Antigravity)
# Run: /document-unsaved-changes workflow
```

## Critical Files to Check

After crashes, these files often contain unsaved work:

### Backend
- `rest_server_temp_5.py` - Main backend server
- `station_manager.py` - Process manager
- `scripts/backend_fixed.py` - Backend fixes
- `dev_run_backend.py` - Development runner

### Frontend
- `App.tsx` - Main application
- `components/**/*.tsx` - All React components
- `hooks/**/*.ts` - Custom React hooks
- `services/**/*.ts` - API service layers

### Configuration
- `package.json` - Dependencies
- `requirements.txt` - Python dependencies
- `.agent/workflows/*.md` - Workflow definitions

## What to Look For

1. **Staged files** (green in `git status`)
   - Already added, just need `git commit`

2. **Modified files** (red in `git status`)
   - Changes not staged, need `git add` then `git commit`

3. **Untracked files** (red, labeled "untracked")
   - New files/directories, need `git add` then `git commit`

4. **Ghost directories**
   - `backend/`, `config/`, `components/Diagnostics/`
   - Check if these exist but aren't tracked

## Recovery Steps

### Step 1: Don't Panic
Git tracks all committed changes. Uncommitted changes may be recoverable.

### Step 2: Document First
```bash
# Create documentation of what changed
# Use: /document-unsaved-changes
```

### Step 3: Stage Changes
```bash
# Stage modified files
git add -u

# Stage new directories
git add backend/ components/Diagnostics/ config/

# Or stage everything
git add .
```

### Step 4: Review Before Commit
```bash
git status
git diff --cached --stat
```

### Step 5: Commit
```bash
git commit -m "recovery: Restore work after crash

- List major changes here
- Group by feature area
- Note any testing needed"
```

## Prevention Strategies

1. **Commit frequently** - Every 15-30 minutes of work
2. **Use WIP commits** - `git commit -m "WIP: description"`
3. **Enable auto-save** in your editor
4. **Use feature branches** for experimental work
5. **Push to remote** regularly

## See Full Workflow

For detailed procedures:
```bash
# View the complete workflow
cat .agent/workflows/document-unsaved-changes.md
```

Or ask Antigravity to run: `/document-unsaved-changes`

---

**Last Updated**: 2025-12-28  
**Related Docs**: `docs/UNSAVED_CHANGES.md`
