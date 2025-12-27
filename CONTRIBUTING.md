# Contributing to Image Gallery 2

Thank you for contributing! This project follows the **[AI-Maintainability Framework](docs/AI_MAINTAINABILITY_FRAMEWORK.md)** to ensure code is easy for both humans and AI assistants to understand and maintain.

## For AI Assistants

**Before making any changes, please:**

1. **Read the framework**: [AI-Maintainability Framework](docs/AI_MAINTAINABILITY_FRAMEWORK.md)
2. **Use the workflows**: Located in `.agent/workflows/`
   - `/add-feature` - Adding new features
   - `/refactor-code` - Refactoring existing code
   - `/fix-bug` - Fixing bugs
   - `/improve-framework` - Proposing framework improvements

3. **Run quality checks**:
   ```bash
   npm run lint        # Check for code quality issues
   npm run type-check  # Verify TypeScript types
   ```

## Core Rules (Quick Reference)

### 🔢 The 50-Line Rule
**All functions must be under 50 lines**. If a function exceeds this, split it into smaller, focused functions.

### 🎯 Single Responsibility
Each function should do ONE thing well.

### 🔤 Named Constants
Extract ALL magic numbers and strings to named constants at the top of the file.

### 📝 Type Everything
Use TypeScript interfaces/types for all data structures.

### 🚫 Max Nesting
No more than 3 levels of nesting. Deep nesting suggests the function needs to be split.

---

## Automated Enforcement

The project has **automated quality checks** that run on every commit:

### ESLint Rules
- `max-lines-per-function`: Functions limited to 50 lines
- `max-depth`: Maximum 3 levels of nesting
- `complexity`: Cognitive complexity limit
- `no-magic-numbers`: Warns on magic numbers
- Plus TypeScript-specific rules

### Pre-commit Hooks
Git hooks automatically run before commits to:
- Lint all changed TypeScript files
- Run type checking
- Auto-fix issues where possible

**Your commit will be blocked** if violations are detected.

---

## Development Workflow

### 1. Make Changes
Follow the AI-Maintainability Framework principles while coding.

### 2. Test Locally
```bash
npm run dev
```

### 3. Check Quality
```bash
npm run lint        # Find issues
npm run lint:fix    # Auto-fix some issues
npm run type-check  # Check TypeScript types
```

### 4. Commit
```bash
git add .
git commit -m "Your message"
```

Pre-commit hooks will automatically run. If they pass, your commit succeeds.

---

## File Organization

### Maximum File Sizes
- **Components**: 200 lines max → Split into sub-components
- **Services/Utils**: 150 lines max → Extract into multiple modules
- **Hooks**: 100 lines max → One hook = one concern

### When to Split Files
If a file exceeds limits, create a subdirectory:

**Example**:
```
Before:
components/StatusPage.tsx (1705 lines) ❌

After:
components/StatusPage.tsx (400 lines) ✅
components/status/
  ModelLoadTestPanel.tsx (200 lines) ✅
  GPUMetricsPanel.tsx (150 lines) ✅
```

---

## Code Review Checklist

Before submitting code, verify:

- [ ] All functions are under 50 lines
- [ ] No magic numbers (all extracted to constants)
- [ ] TypeScript types defined for all data
- [ ] Each function has single responsibility
- [ ] Maximum 3 levels of nesting
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] Functionality tested in browser

---

## Example: Adding a New Feature

```bash
# 1. Read framework (first time only)
cat docs/AI_MAINTAINABILITY_FRAMEWORK.md

# 2. Follow workflow
# Use /add-feature workflow if available

# 3. Implement feature following principles
# - Functions under 50 lines
# - Extract constants
# - Add types

# 4. Verify quality
npm run lint
npm run type-check

# 5. Test
npm run dev

# 6. Commit (pre-commit hooks run automatically)
git commit -m "feat: add new feature"
```

---

## Questions?

- **Framework details**: See [AI-Maintainability Framework](docs/AI_MAINTAINABILITY_FRAMEWORK.md)
- **Refactoring examples**: See [Refactoring Summary](docs/REFACTORING_SUMMARY.md)
- **Workflows**: Check `.agent/workflows/` directory

---

**Remember**: Code is read 10x more than it's written. Write for the reader (human or AI), not the compiler.
