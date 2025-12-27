---
description: Document and recover unsaved code changes after crashes
---

# Document Unsaved Changes Workflow

Use this workflow when you suspect code changes were lost due to crashes or unexpected shutdowns.

## Steps

### 1. Check Git Status
```bash
git status
```
This shows:
- Files staged for commit (in green)
- Files modified but not staged (in red)
- Untracked files (new files not in git)

### 2. Get Change Statistics
```bash
git diff --stat
```
Shows a summary of how many lines changed in each file.

### 3. Review Modified Files
```bash
git diff --name-status
```
Lists all modified files with their status (M=modified, A=added, D=deleted).

### 4. Examine Specific File Changes
For detailed analysis of a specific file:
```bash
git diff <filename>
```

For a compact view (context lines only):
```bash
git diff --unified=0 <filename>
```

### 5. Check for Untracked Directories
```bash
ls -la
```
Look for new directories that might contain important work.

### 6. Create Documentation

Create `docs/UNSAVED_CHANGES.md` with:
- Overview of total changes
- Feature categories
- File-by-file breakdown
- Code snippets for critical changes
- Recommended next steps
- Git commands to save work

### 7. Update Task Checklist

Document findings in task.md:
- List all modified files
- Mark analysis phases complete
- Plan commit strategy

### 8. Recommend Commit Strategy

Based on the changes, suggest either:
- **Single commit** - If changes are tightly related
- **Multiple commits** - If changes span multiple features
- **Feature branches** - If changes need separate review

Example multi-commit strategy:
```bash
# Fix bugs first
git add <bug-fix-files>
git commit -m "fix: <description>"

# Then features
git add <feature-files>
git commit -m "feat: <description>"

# Finally refactors
git add <refactor-files>
git commit -m "refactor: <description>"
```

### 9. Stage and Commit

After review, stage changes:
```bash
# Stage modified files
git add -u

# Stage new files/directories
git add <new-directory>/

# Or stage everything
git add .

# Review what will be committed
git status

# Commit with descriptive message
git commit -m "type(scope): description

- Detail 1
- Detail 2

BREAKING CHANGE: if applicable"
```

### 10. Verify Commit
```bash
git log -1 --stat
```
Confirms the commit was created successfully.

## Tips

- **Don't panic** - Git tracks everything that was committed
- **Review carefully** - Don't blindly commit everything
- **Test critical changes** - Especially backend API changes
- **Commit often** - Prevents future data loss
- **Use branches** - For experimental or risky changes

## Common Scenarios

### Scenario A: Small changes to few files
```bash
git add -u
git commit -m "fix: description"
```

### Scenario B: Multiple unrelated features
```bash
# Commit each feature separately
git add file1.tsx file2.tsx
git commit -m "feat: feature 1"

git add file3.py file4.py
git commit -m "feat: feature 2"
```

### Scenario C: New directories + modified files
```bash
git add new-directory/
git add -u
git commit -m "feat: add new-directory with updates"
```

### Scenario D: Want to review before committing
```bash
# Use interactive staging
git add -p

# Or use a GUI tool
git gui
```

## Recovery Best Practices

1. **Document first, commit second** - Understand what changed
2. **Group related changes** - Logical commits are easier to review
3. **Write good commit messages** - Future you will thank you
4. **Test before pushing** - Ensure nothing is broken
5. **Update documentation** - Keep docs in sync with code

## Prevention

To avoid losing work in the future:

1. **Commit frequently** - "Commit early, commit often"
2. **Use auto-save** - Configure your editor
3. **Enable git auto-stash** - For safer branch switches
4. **Use WIP commits** - `git commit -m "WIP: description"` then amend later
5. **Configure IDE** - Enable auto-recovery features

## See Also

- `/fix-bug` - For bug fix workflow
- `/add-feature` - For new feature workflow
- Git documentation: https://git-scm.com/doc
