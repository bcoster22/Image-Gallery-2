# AI-Maintainability Framework

**Version**: 1.0  
**Purpose**: Guidelines for writing code that AI assistants (Claude, Gemini, GitHub Copilot) can easily understand, maintain, and modify.

---

## Core Principles

### 1. **The 50-Line Rule**
**Principle**: Keep functions under 50 lines of code

**Why**: AI assistants have limited context windows. Functions over 50 lines are:
- Harder to keep in working memory
- More error-prone when AI modifies them
- Difficult to understand at a glance

**Example**:

❌ **Bad** (187 lines):
```typescript
const handleTestLoad = async () => {
  // 187 lines of nested logic
  // Testing, validation, error handling, UI updates all mixed
};
```

✅ **Good** (broken into focused functions):
```typescript
const handleTestLoad = async () => {
  const config = getTestConfiguration();
  await runModelTests(config);
  showTestResults();
};

const runModelTests = async (config) => {
  for (const model of availableModels) {
    await testSingleModel(model, config);
  }
};

const testSingleModel = async (model, config) => {
  // 30-40 lines max
};
```

---

### 2. **Single Responsibility**
**Principle**: Each function should do ONE thing

**Why**: AI can better understand and modify focused functions

**Example**:

❌ **Bad** (multiple responsibilities):
```typescript
async function processUserData(userId) {
  // Fetches data
  const user = await fetch(`/api/users/${userId}`);
  
  // Validates data
  if (!user.email) throw new Error('Invalid');
  
  // Transforms data
  const normalized = user.email.toLowerCase();
  
  // Updates UI
  setUserEmail(normalized);
  
  // Logs analytics
  trackEvent('user_loaded', { userId });
}
```

✅ **Good** (separated concerns):
```typescript
async function loadUser(userId) {
  const user = await fetchUser(userId);
  validateUser(user);
  return normalizeUser(user);
}

function validateUser(user) {
  if (!user.email) throw new Error('Invalid email');
}

function normalizeUser(user) {
  return { ...user, email: user.email.toLowerCase() };
}
```

---

### 3. **Named Constants Over Magic Values**
**Principle**: Extract all magic numbers and strings to named constants

**Why**: AI can understand intent and safely modify values

**Example**:

❌ **Bad**:
```typescript
if (vramUsedPct >= 75) { /* ... */ }
await new Promise(resolve => setTimeout(resolve, 1500));
```

✅ **Good**:
```typescript
const VRAM_THRESHOLD_BALANCED = 75;
const UNLOAD_VERIFICATION_WAIT_MS = 1500;

if (vramUsedPct >= VRAM_THRESHOLD_BALANCED) { /* ... */ }
await sleep(UNLOAD_VERIFICATION_WAIT_MS);
```

---

### 4. **Type Everything**
**Principle**: Use TypeScript interfaces/types everywhere (frontend) and type hints (Python backend)

**Why**: Types are documentation that AI can parse

**Example**:

❌ **Bad**:
```typescript
function processData(data) {
  return data.map(item => item.value * 2);
}
```

✅ **Good**:
```typescript
interface DataItem {
  value: number;
  id: string;
}

function processData(data: DataItem[]): number[] {
  return data.map(item => item.value * 2);
}
```

**Python**:
```python
# ❌ Bad
def process_data(data):
    return [item['value'] * 2 for item in data]

# ✅ Good
from typing import List, Dict

def process_data(data: List[Dict[str, int]]) -> List[int]:
    return [item['value'] * 2 for item in data]
```

---

### 5. **Extract UI Markup from Logic**
**Principle**: No inline HTML/JSX strings in business logic

**Why**: AI struggles with escaped HTML in strings

**Example**:

❌ **Bad**:
```typescript
button.innerHTML = '<span class="flex items-center gap-1.5"><svg class="w-3 h-3 animate-spin" fill="none">...</svg>Loading...</span>';
```

✅ **Good**:
```typescript
// constants/ui-states.tsx
export const ButtonStates = {
  loading: (progress?: string) => (
    <span className="flex items-center gap-1.5">
      <Spinner className="w-3 h-3" />
      {progress || 'Loading...'}
    </span>
  ),
  success: () => (
    <span className="flex items-center gap-1.5">
      <CheckIcon className="w-3 h-3" />
      Complete
    </span>
  )
};

// In component
setButtonContent(ButtonStates.loading(progress));
```

---

### 6. **Error Handling Patterns**
**Principle**: Use consistent error handling with detailed context

**Why**: AI can propagate error patterns correctly

**Example**:

❌ **Bad**:
```typescript
try {
  await fetch(url);
} catch (e) {
  console.error(e);
}
```

✅ **Good**:
```typescript
interface OperationResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    context: Record<string, any>;
  };
}

async function fetchWithErrorHandling(url: string): Promise<OperationResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: `Request failed with status ${response.status}`,
          context: { url, status: response.status }
        }
      };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        context: { url }
      }
    };
  }
}
```

---

### 7. **Document Complex Logic**
**Principle**: Add step-by-step comments for multi-step processes

**Why**: AI uses comments to understand intent

**Example**:

❌ **Bad**:
```typescript
const result = data
  .filter(x => x.active)
  .map(x => ({ ...x, score: x.visits * 0.3 + x.purchases * 0.7 }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 10);
```

✅ **Good**:
```typescript
// Calculate user engagement scores and get top performers
const topUsers = data
  // 1. Filter to only active users
  .filter(user => user.active)
  // 2. Calculate engagement score (visits weighted 30%, purchases 70%)
  .map(user => ({
    ...user,
    score: user.visits * 0.3 + user.purchases * 0.7
  }))
  // 3. Sort by score descending
  .sort((a, b) => b.score - a.score)
  // 4. Take top 10
  .slice(0, 10);
```

---

### 8. **Separate Business Logic from Framework Code**
**Principle**: Extract business logic into pure functions/hooks

**Why**: AI can test and modify business logic independently

**Example**:

❌ **Bad** (React component with mixed concerns):
```typescript
function UserProfile() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(data => {
        // Complex validation and transformation
        const validated = validateUser(data);
        const normalized = normalizeUser(validated);
        setUser(normalized);
      });
  }, []);
  
  return <div>{user?.name}</div>;
}
```

✅ **Good** (separated concerns):
```typescript
// hooks/useUser.ts
function useUser() {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    loadUser().then(setUser);
  }, []);
  
  return { user };
}

// services/userService.ts
async function loadUser(): Promise<User> {
  const data = await fetchUser();
  validateUser(data);
  return normalizeUser(data);
}

// components/UserProfile.tsx
function UserProfile() {
  const { user } = useUser();
  return <div>{user?.name}</div>;
}
```

---

### 9. **Use Standard Libraries & Components**
**Principle**: Do not reinvent the wheel. Use the project's established UI libraries.

**Why**: 
- Reduces maintenance burden
- Ensures consistency (visuals and accessibility)
- AI can leverage documentation of popular libraries

**Standards**:
- **Icons**: Use `@heroicons/react`. Do NOT create custom SVG components.
- **Modals**: Use `components/Modal.tsx` (wraps `@headlessui/react`). Do NOT create custom `fixed inset-0` overlays.
- **Dropdowns/Dialogs**: Use `@headlessui/react`.

**Example**:

❌ **Bad** (Custom Modal):
```tsx
<div className="fixed inset-0 z-50 bg-black/50">
  <div className="bg-white p-4">...</div>
</div>
```

✅ **Good** (Standard Modal):
```tsx
<Modal isOpen={isOpen} onClose={close} title="My Modal">
  <div>...</div>
</Modal>
```

---

## File Organization

### Maximum File Sizes

| File Type | Max Lines | Reasoning |
|-----------|-----------|-----------|
| Components | 200 lines | Split into sub-components if larger |
| Services/Utils | 150 lines | Extract into multiple modules |
| Hooks | 100 lines | Each hook = single concern |
| API Routes | 200 lines | Split by resource |

**When a file exceeds limits**: Create a subdirectory and split by feature

Example:
```
❌ Before:
components/
  StatusPage.tsx (1705 lines)

✅ After:
components/
  StatusPage.tsx (400 lines)
  status/
    ModelLoadTestPanel.tsx (200 lines)
    GPUMetricsPanel.tsx (150 lines)
    QueueMonitor.tsx (180 lines)
```

---

## Naming Conventions

### Functions
- **Use verb prefixes**: `get`, `set`, `fetch`, `validate`, `transform`, `handle`, `process`
- **Be specific**: `getUserById` not `getUser`
- **Avoid abbreviations**: `calculateUserScore` not `calcUsrScr`

### Variables
- **Boolean**: Prefix with `is`, `has`, `should`, `can`
  ```typescript
  const isLoading = true;
  const hasPermission = checkPermission();
  const shouldRender = isVisible && hasData;
  ```

### Constants
- **SCREAMING_SNAKE_CASE** for true constants
- **PascalCase** for configuration objects
  ```typescript
  const MAX_RETRY_ATTEMPTS = 3;
  const API_BASE_URL = 'https://api.example.com';
  
  const VramThresholds = {
    low: 60,
    balanced: 75,
    high: 90
  } as const;
  ```

---

## Refactoring Checklist

When refactoring code for AI maintainability:

- [ ] Functions are under 50 lines
- [ ] Each function has a single, clear responsibility
- [ ] All magic numbers/strings are named constants
- [ ] TypeScript types/interfaces are defined for all data
- [ ] Error handling is consistent and detailed
- [ ] Complex logic has step-by-step comments
- [ ] Business logic is separated from UI/framework code
- [ ] File is under suggested size limits
- [ ] Function and variable names are descriptive and follow conventions
- [ ] No inline HTML/JSX strings in logic

---

## Python Backend Guidelines

### Function Length
Same 50-line rule applies

### Type Hints
```python
from typing import List, Dict, Optional, Union

def process_models(
    model_ids: List[str],
    config: Dict[str, any]
) -> Dict[str, Union[str, int]]:
    """Process multiple models with given configuration.
    
    Args:
        model_ids: List of model unique identifiers
        config: Configuration dictionary with settings
        
    Returns:
        Dictionary with processing results and metadata
    """
    # Implementation
```

### Error Handling
```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class OperationResult:
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    error_code: Optional[str] = None

def load_model(model_id: str) -> OperationResult:
    try:
        # Logic here
        return OperationResult(success=True, data={'model_id': model_id})
    except FileNotFoundError:
        return OperationResult(
            success=False,
            error=f"Model {model_id} not found",
            error_code="MODEL_NOT_FOUND"
        )
    except Exception as e:
        return OperationResult(
            success=False,
            error=str(e),
            error_code="UNKNOWN_ERROR"
        )
```

### Constants
```python
# constants.py
MAX_VRAM_USAGE_MB = 8192
DEFAULT_TIMEOUT_SECONDS = 30
SUPPORTED_MODEL_TYPES = ['vision', 'generation', 'analysis']

# Configuration objects
VRAM_THRESHOLDS = {
    'low': 60,
    'balanced': 75,
    'high': 90
}
```

---

## 10. Resource Management and Memory Safety

**Principle**: Properly manage resources to prevent memory leaks and system instability

**Why**: Memory leaks cause progressive performance degradation, system freezes, and difficult-to-debug runtime issues.

### Frontend: Timer Cleanup with useRef

❌ **Bad** (Timer may be undefined):
```typescript
useEffect(() => {
    let interval: NodeJS.Timeout;
    if (condition) {
        interval = setInterval(() => {}, 1000);
    }
    return () => clearInterval(interval);  // ❌ Undefined if condition false
}, [deps]);
```

✅ **Good** (useRef pattern):
```typescript
const intervalRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
    if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
    }
    
    if (condition) {
        intervalRef.current = setInterval(() => {}, 1000);
    }
    
    return () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };
}, [deps]);
```

### Backend: Proper GPU Memory Release

❌ **Bad**:
```python
def unload_model(self):
    del self.model
    torch.cuda.empty_cache()
```

✅ **Good**:
```python
def unload_model(self):
    if self.model is not None:
        if hasattr(self.model, 'cpu'):
            self.model.cpu()  # Move to CPU first
        del self.model
        self.model = None
        
        import gc
        gc.collect()
        torch.cuda.empty_cache()
        torch.cuda.synchronize()  # Wait for CUDA ops
```

### PIL Images: Context Managers

❌ **Bad**:
```python
image = Image.open(io.BytesIO(data))  # BytesIO not closed
return image
```

✅ **Good**:
```python
with io.BytesIO(data) as buffer:
    return Image.open(buffer).copy()  # .copy() detaches from buffer

# In caller:
image = load_image(url)
try:
    result = process(image)
finally:
    if image:
        image.close()
```

### Resource Checklist

- [ ] Timers use `useRef` pattern
- [ ] Models call `.cpu()` before deletion  
- [ ] Images closed in `finally` blocks
- [ ] HTTP connections use context managers
- [ ] Generators handle `GeneratorExit`

---

## Quick Reference

### Before Committing Code, Ask:
1. ✅ Can a function be understood in < 30 seconds?
2. ✅ Are all magic values named constants?
3. ✅ Does each function do one clear thing?
4. ✅ Is there proper error handling with context?
5. ✅ Are types/hints defined for all data?
6. ✅ Is the file under size limits?
7. ✅ Are resources (timers, images, models) properly cleaned up?

### Red Flags 🚩
- Functions over 100 lines
- More than 3 levels of nesting
- Inline HTML strings in logic
- Variables like `data`, `temp`, `x`, `result`
- Catch blocks with just `console.log` or `pass`
- Magic numbers without explanation
- Timers without useRef or proper cleanup
- PIL Images not closed in finally blocks
- Models deleted without `.cpu()` call first

---

## Benefits

Following this framework:
- ✅ **AI assistants** can make changes with 90%+ accuracy
- ✅ **Onboarding** new developers is faster
- ✅ **Debugging** is easier with clear function boundaries
- ✅ **Testing** becomes simpler with pure functions
- ✅ **Maintenance** costs decrease over time

---

## Example: Before & After

### Before (Hard for AI)
```typescript
async function processEverything(id) {
  try {
    const d = await fetch(`/api/${id}`).then(r => r.json());
    if (!d) return;
    const v = d.value * 1.5 + d.bonus;
    if (v > 100) {
      alert('Too high!');
      return;
    }
    document.getElementById('result').innerHTML = `<div class="text-lg">${v}</div>`;
    await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify({ id, v })
    });
  } catch (e) {
    console.log(e);
  }
}
```

### After (AI-Friendly)
```typescript
// constants.ts
const MAX_SCORE_THRESHOLD = 100;
const SCORE_MULTIPLIER = 1.5;

// types.ts
interface UserData {
  value: number;
  bonus: number;
}

interface ScoreResult {
  score: number;
  isValid: boolean;
  error?: string;
}

// services/scoreService.ts
async function fetchUserData(id: string): Promise<UserData | null> {
  const response = await fetch(`/api/${id}`);
  if (!response.ok) return null;
  return response.json();
}

function calculateScore(data: UserData): number {
  return data.value * SCORE_MULTIPLIER + data.bonus;
}

function validateScore(score: number): ScoreResult {
  if (score > MAX_SCORE_THRESHOLD) {
    return {
      score,
      isValid: false,
      error: 'Score exceeds maximum threshold'
    };
  }
  return { score, isValid: true };
}

async function saveScore(id: string, score: number): Promise<void> {
  await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, score })
  });
}

// components/ScoreProcessor.tsx
async function processUserScore(id: string): Promise<ScoreResult> {
  const data = await fetchUserData(id);
  if (!data) {
    return { score: 0, isValid: false, error: 'User not found' };
  }
  
  const score = calculateScore(data);
  const result = validateScore(score);
  
  if (result.isValid) {
    await saveScore(id, score);
  }
  
  return result;
}
```

---

## Implementation Strategy

1. **Start Small**: Pick one component/module to refactor
2. **Use This Checklist**: Run through the refactoring checklist
3. **Test Thoroughly**: Ensure functionality remains identical
4. **Document Changes**: Update comments and README
5. **Iterate**: Apply learnings to next component

---

**Remember**: Code is read 10x more than it's written. Write for the reader (human or AI), not the compiler.
