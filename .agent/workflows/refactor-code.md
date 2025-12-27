---
description: Refactor existing code to follow AI-Maintainability Framework
---

# Refactor Code Workflow

Use this workflow when refactoring existing code to improve maintainability.

## 1. Identify the Problem

What makes the current code hard to maintain?
- [ ] Functions too long (>50 lines)?
- [ ] Magic numbers inline?
- [ ] Missing types?
- [ ] Mixed concerns/responsibilities?
- [ ] Too much nesting (>3 levels)?

## 2. Read the Framework

```bash
cat docs/AI_MAINTAINABILITY_FRAMEWORK.md
```

Look for patterns that apply to your refactoring:
- **50-Line Rule**: Break down long functions
- **Named Constants**: Extract magic values
- **Single Responsibility**: Separate concerns
- **Type Everything**: Add missing interfaces

## 3. Review Refactoring Example

See how ModelLoadTestPanel was refactored:
```bash
cat docs/REFACTORING_SUMMARY.md
```

Key lessons:
- Break 187-line function → 8 focused functions (30-50 lines each)
- Extract constants to top of file
- Add proper TypeScript types
- Use useCallback for performance
- Organize into sections

## 4. Create a Refactoring Plan

Document your strategy:
1. Which functions will you split?
2. What constants will you extract?
3. What types need to be added?
4. How will you test nothing broke?

## 5. Implement Refactoring

**Follow these steps**:

### Step A: Extract Constants
Move all magic numbers/strings to named constants at the top of the file.

### Step B: Add Types
Define interfaces for all data structures.

### Step C: Split Long Functions
Break functions over 50 lines into focused helpers.

### Step D: Add useCallback/useMemo
Optimize React components for performance.

### Step E: Organize Code
Add section comments (TYPES, CONSTANTS, HELPERS, RENDER, etc.)

## 6. Verify No Regressions

// turbo
Run linter:
```bash
npm run lint
```

// turbo
Run type checker:
```bash
npm run type-check
```

## 7. Test Functionality

- Manually test all affected features
- Ensure behavior is identical to before refactoring
- Check console for any new errors

## 8. Document the Refactoring

If this was a significant refactoring:
- Consider adding it as an example to the framework
- Update any relevant documentation
- Add comments explaining complex logic

---

**Refactoring Checklist**:
- [ ] All functions under 50 lines
- [ ] All magic numbers extracted to constants
- [ ] TypeScript types defined for all data
- [ ] Single responsibility per function
- [ ] Max 3 levels of nesting
- [ ] useCallback/useMemo added where appropriate
- [ ] Code organized into sections
- [ ] Lint passes
- [ ] Type-check passes
- [ ] Functionality unchanged
