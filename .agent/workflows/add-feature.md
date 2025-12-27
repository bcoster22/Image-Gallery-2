---
description: Add a new feature following AI-Maintainability Framework
---

# Add New Feature Workflow

Follow these steps when adding any new feature to ensure code quality and AI-maintainability.

## 1. Read the Framework
```bash
cat docs/AI_MAINTAINABILITY_FRAMEWORK.md
```

**Key Principles to Remember**:
- Functions under 50 lines
- Extract all magic numbers to named constants
- Add TypeScript types for all data structures
- Use single responsibility principle

## 2. Plan Your Changes

Create a brief plan:
- What components/files will be modified?
- What new files will be created?
- How will you keep functions under 50 lines?
- What constants need to be extracted?

## 3. Implement the Feature

**Before writing code, check**:
- [ ] Is each function focused on a single responsibility?
- [ ] Are all functions under 50 lines?
- [ ] Have I extracted magic numbers to constants?
- [ ] Have I defined TypeScript interfaces/types?

## 4. Verify Code Quality

// turbo
Run linter to catch violations:
```bash
npm run lint
```

// turbo
Run type checker:
```bash
npm run type-check
```

## 5. Fix Any Issues

If lint errors appear:
- Review the AI-Maintainability Framework
- Refactor long functions into smaller helpers
- Extract constants
- Add missing types

You can auto-fix some issues:
```bash
npm run lint:fix
```

## 6. Test the Feature

Manually test the feature works as expected in the browser.

## 7. Document Changes

Update relevant documentation:
- Add comments for complex logic
- Update README if adding new user-facing features
- Consider adding examples to the framework if you discovered a useful pattern

---

**Remember**: The goal is code that both humans AND AI assistants can easily understand and modify.
