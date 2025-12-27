---
description: Fix a bug while maintaining code quality
---

# Fix Bug Workflow

Follow these steps when fixing bugs to ensure the fix doesn't introduce new problems.

## 1. Understand the Bug

Document:
- What is the expected behavior?
- What is the actual behavior?
- How to reproduce?
- Which file(s) contain the bug?

## 2. Locate the Root Cause

// turbo
Use linter to check for potential issues:
```bash
npm run lint
```

// turbo
Check type errors:
```bash
npm run type-check
```

Sometimes lint/type errors reveal the root cause.

## 3. Plan the Fix

Before coding:
- [ ] Have I identified the root cause?
- [ ] Will my fix conform to the AI-Maintainability Framework?
- [ ] Do I need to refactor while fixing?
- [ ] Will this require new tests?

## 4. Implement the Fix

**Follow framework principles**:
- Keep fix functions under 50 lines
- Extract any new magic numbers to constants
- Add types if working with new data structures
- Don't just patch - fix properly

**Avoid common pitfalls**:
- ❌ Adding more complexity to already complex functions
- ❌ Quick hacks that violate framework
- ✅ Refactor if needed to make fix clean

## 5. Verify the Fix

**Check the specific bug**:
- [ ] Bug no longer reproduces
- [ ] Expected behavior works correctly
- [ ] No new console errors

**Check for regressions**:
- [ ] Test related functionality
- [ ] Test edge cases
- [ ] Test other code paths in the same file

## 6. Run Quality Checks

// turbo
```bash
npm run lint
```

// turbo
```bash
npm run type-check
```

Fix any violations introduced by your changes.

## 7. Document the Fix

Add comments explaining:
- What caused the bug
- Why this fix works
- Any gotchas to watch out for

If the bug was subtle or complex, consider adding it as an example to the framework.

---

**Bug Fix Checklist**:
- [ ] Root cause identified
- [ ] Fix follows AI-Maintainability Framework
- [ ] Bug no longer reproduces
- [ ] No regressions introduced
- [ ] Lint passes
- [ ] Type-check passes
- [ ] Fix is documented with comments
