---
description: Propose improvements to the AI-Maintainability Framework
---

# Improve Framework Workflow

Use this when you discover a better pattern or practice while working on the codebase.

## When to Use This Workflow

Propose framework improvements when you:
- ✨ Discover a better way to organize code
- 🚫 Find a common anti-pattern not covered in the framework
- 📚 Learn a new best practice worth documenting
- 🔧 Create a reusable pattern that others should follow

## 1. Identify the Improvement

Document:
- **What is the improvement?** (Be specific)
- **Why is it better?** (Benefits for AI and human maintainability)
- **Where did you discover it?** (Which file/task?)

## 2. Check Existing Framework

Read the current framework to avoid duplicating:
```bash
cat docs/AI_MAINTAINABILITY_FRAMEWORK.md
```

Is your improvement:
- [ ] A new principle not covered?
- [ ] A refinement of an existing principle?
- [ ] An example that would clarify existing guidance?

## 3. Draft the Improvement

Create a clear explanation following the framework's format:

### For New Principles
```markdown
### N. **[Principle Name]**
**Principle**: [One sentence description]

**Why**: [Explanation of benefits]

**Example**:

❌ **Bad**:
[Code example showing the anti-pattern]

✅ **Good**:
[Code example showing the better way]
```

### For New Examples
```markdown
**Example - [Scenario Name]**:
[Description of when this applies]

[Code example with explanation]
```

## 4. Verify the Improvement

Before proposing:
- [ ] Is it consistent with existing framework principles?
- [ ] Would it improve AI maintainability?
- [ ] Is it practical to apply?
- [ ] Do you have a real example from the codebase?

## 5. Propose to User

**Use this template**:

```
📋 Framework Improvement Proposal

**What**: [Brief description]

**Why**: [Benefits]

**Example from codebase**: [File/function where you discovered this]

**Proposed addition to framework**:
[Your drafted content]

**Would you like me to add this to the AI-Maintainability Framework?**
```

## 6. Update Framework (If Approved)

If user approves, add to the appropriate section of:
```
docs/AI_MAINTAINABILITY_FRAMEWORK.md
```

**Update locations**:
- Core Principles section (for new principles)
- Before & After section (for examples)
- Quick Reference section (for checklists)

## 7. Update History

Add an entry to the framework's changelog:
```markdown
## Framework Updates

**[Date]**: Added principle "[Name]" - [Brief description]
```

---

**Framework Evolution Guidelines**:

**Auto-Update Allowed** (do without asking):
- Adding new code examples to existing principles
- Fixing typos or improving clarity
- Adding language-specific variations (Python, TypeScript, etc.)

**Requires User Approval** (ask first):
- Adding new core principles
- Changing existing rules
- Removing sections
- Major reorganization

---

**Remember**: The framework should evolve with the codebase. Good patterns you discover should be captured and shared!
