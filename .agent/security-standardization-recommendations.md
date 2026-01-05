# API Security & Standardization Recommendations
**Date:** 2026-01-05  
**For:** Image-Gallery-2 + Moondream Station Architecture

---

## 🔒 Security Recommendations

### CRITICAL (P0) - Address Immediately

#### 1. Authentication & Authorization
**Current State:** ❌ No authentication on any endpoints  
**Risk:** Anyone with network access can control your system

**Recommendations:**
```typescript
// Option 1: API Key Authentication (Simple)
Headers: {
  'X-API-Key': 'your-secure-key-here'
}

// Option 2: JWT Tokens (More Robust)
Headers: {
  'Authorization': 'Bearer <jwt-token>'
}

// Option 3: Session-based (Browser-friendly)
Cookies: {
  'session_id': '<encrypted-session>'
}
```

**Implementation Priority:**
- [ ] P0: Add API key auth to sensitive endpoints (restart, GPU reset, model conversion)
- [ ] P1: Add JWT auth to all AI operation endpoints
- [ ] P2: Implement role-based access (admin vs user)

**Code Example:**
```python
# Backend: Add auth middleware
from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader

API_KEY = os.getenv("MOONDREAM_API_KEY", "change-me-in-production")
api_key_header = APIKeyHeader(name="X-API-Key")

def verify_api_key(key: str = Security(api_key_header)):
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return key

# Protect sensitive endpoints
@app.post("/v1/system/gpu-reset", dependencies=[Depends(verify_api_key)])
async def reset_gpu():
    ...
```

```typescript
// Frontend: Add API key to requests
const API_KEY = import.meta.env.VITE_MOONDREAM_API_KEY;

fetch('/v1/system/unload', {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY
  }
})
```

---

#### 2. Network Exposure
**Current State:** ⚠️ Services bound to `0.0.0.0` or `localhost`  
**Risk:** Potential exposure to local network

**Recommendations:**
- [ ] **Production:** Bind to `127.0.0.1` only (localhost-only access)
- [ ] **Remote Access:** Use reverse proxy (nginx) with HTTPS
- [ ] **Multi-user:** Use proper firewall rules

**Config Changes:**
```python
# station_manager.py (line 398)
# BEFORE:
app.run(host='0.0.0.0', port=3001, ...)

# AFTER:
app.run(host='127.0.0.1', port=3001, ...)  # Localhost only
```

```python
# rest_server.py
# BEFORE:
config = uvicorn.Config(self.app, host="127.0.0.1", port=2020, ...)

# AFTER: Add environment variable
HOST = os.getenv("MOONDREAM_HOST", "127.0.0.1")
config = uvicorn.Config(self.app, host=HOST, port=2020, ...)
```

---

#### 3. Sudo Command Execution
**Current State:** ⚠️ Passwordless sudo required for GPU reset, Prime switching  
**Risk:** Improper sudo configuration = privilege escalation

**Recommendations:**
- [ ] **Scope sudo permissions** to specific scripts only
- [ ] **Use absolute paths** in sudoers
- [ ] **Validate script integrity** before execution
- [ ] **Add audit logging** for all sudo commands

**Proper `/etc/sudoers.d/moondream-gpu` file:**
```bash
# Restrict to specific user
bcoster ALL=(root) NOPASSWD: /home/bcoster/.moondream-station/moondream-station/nuclear_gpu_reset.sh
bcoster ALL=(root) NOPASSWD: /home/bcoster/.moondream-station/moondream-station/setup_prime_switch.sh

# Add these constraints:
Defaults!/home/bcoster/.moondream-station/moondream-station/nuclear_gpu_reset.sh !requiretty
Defaults!/home/bcoster/.moondream-station/moondream-station/setup_prime_switch.sh !requiretty

# NO wildcards or broad permissions like:
# bcoster ALL=(ALL) NOPASSWD: ALL  <-- NEVER DO THIS
```

**Script Validation:**
```python
# Before executing sudo commands, verify script hasn't been tampered with
import hashlib

def verify_script_integrity(script_path, expected_hash):
    with open(script_path, 'rb') as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
    if file_hash != expected_hash:
        raise SecurityError("Script integrity check failed!")
```

---

#### 4. Input Validation
**Current State:** ⚠️ Limited validation on user inputs  
**Risk:** Command injection, path traversal, prompt injection

**Recommendations:**

**Model IDs:**
```python
# Validate model IDs to prevent path traversal
import re

MODEL_ID_PATTERN = re.compile(r'^[a-zA-Z0-9/_\-\.]+$')

def validate_model_id(model_id: str):
    if not MODEL_ID_PATTERN.match(model_id):
        raise HTTPException(400, "Invalid model ID format")
    if ".." in model_id or model_id.startswith("/"):
        raise HTTPException(400, "Path traversal not allowed")
    return model_id
```

**Prompts:**
```python
# Limit prompt length to prevent abuse
MAX_PROMPT_LENGTH = 10000

def validate_prompt(prompt: str):
    if len(prompt) > MAX_PROMPT_LENGTH:
        raise HTTPException(400, f"Prompt exceeds {MAX_PROMPT_LENGTH} chars")
    return prompt
```

**File Paths:**
```python
# Validate paths stay within allowed directories
from pathlib import Path

ALLOWED_MODEL_DIRS = [
    Path("/home/bcoster/.moondream-station/models"),
]

def validate_model_path(path: str):
    file_path = Path(path).resolve()
    if not any(file_path.is_relative_to(d) for d in ALLOWED_MODEL_DIRS):
        raise HTTPException(403, "Access denied")
    return file_path
```

---

#### 5. Rate Limiting
**Current State:** ❌ No rate limiting  
**Risk:** DoS attacks, GPU exhaustion

**Recommendations:**
```python
# Add slowapi for rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Apply to expensive endpoints
@app.post("/v1/images/generations")
@limiter.limit("10/minute")  # Max 10 generations per minute
async def generate_image(request: Request, ...):
    ...

@app.post("/v1/system/gpu-reset")
@limiter.limit("1/hour")  # Max 1 GPU reset per hour
async def reset_gpu(request: Request):
    ...
```

---

### HIGH Priority (P1)

#### 6. HTTPS/TLS Encryption
**Current State:** ❌ HTTP only (unencrypted)  
**Risk:** Credentials, prompts, images sent in plaintext

**Recommendations:**
- [ ] Use reverse proxy (nginx/caddy) with Let's Encrypt
- [ ] Enable HSTS headers
- [ ] Redirect HTTP → HTTPS

**Nginx Config Example:**
```nginx
server {
    listen 443 ssl http2;
    server_name moondream.local;
    
    ssl_certificate /etc/letsencrypt/live/moondream.local/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/moondream.local/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:2020/;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

#### 7. CORS Configuration
**Current State:** ⚠️ `allow_origins=["*"]` (allows any origin)  
**Risk:** Cross-site request forgery

**Recommendations:**
```python
# rest_server.py - Restrict CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # Add your production domain:
        # "https://moondream.yourdomain.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["X-VRAM-Used", "X-VRAM-Total"],
)
```

---

#### 8. Secrets Management
**Current State:** ⚠️ Hardcoded paths, no secret rotation  
**Risk:** Exposed credentials in code

**Recommendations:**
```bash
# Use environment variables
export MOONDREAM_API_KEY="$(openssl rand -hex 32)"
export MOONDREAM_MODELS_DIR="/home/bcoster/.moondream-station/models"
export DATABASE_URL="postgresql://user:pass@localhost/db"
```

```python
# Load from .env file
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    api_key: str
    models_dir: str
    database_url: str
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

---

### MEDIUM Priority (P2)

#### 9. Audit Logging
**Current State:** ⚠️ Limited logging of security events  

**Recommendations:**
```python
# Log all sensitive operations
import logging

security_logger = logging.getLogger("security")
handler = logging.FileHandler("/var/log/moondream/security.log")
security_logger.addHandler(handler)

@app.post("/v1/system/gpu-reset")
async def reset_gpu(request: Request):
    security_logger.warning(
        f"GPU_RESET requested from {request.client.host} "
        f"at {datetime.now().isoformat()}"
    )
    ...
```

**Log Events:**
- [ ] Authentication attempts (success/failure)
- [ ] Sudo command execution
- [ ] GPU resets
- [ ] Model loads/unloads
- [ ] API errors (rate limit hits, validation failures)

---

#### 10. Content Security Policy
**Current State:** ❌ No CSP headers  

**Recommendations:**
```python
# Add CSP headers to prevent XSS
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:;"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response
```

---

## 📏 Standardization Recommendations

### 1. Consistent Error Responses

**Current State:** ⚠️ Inconsistent error formats  

**Recommendation:** Adopt RFC 7807 Problem Details
```typescript
// Standard error format
{
  "type": "https://moondream.local/errors/model-not-found",
  "title": "Model Not Found",
  "status": 404,
  "detail": "The model 'invalid-model-id' could not be found in the registry",
  "instance": "/v1/images/generations",
  "context": {
    "model_id": "invalid-model-id",
    "available_models": 12
  }
}
```

**Implementation:**
```python
# Backend: Standardized error handler
from fastapi import Request
from fastapi.responses import JSONResponse

class ModelNotFoundError(Exception):
    def __init__(self, model_id: str):
        self.model_id = model_id

@app.exception_handler(ModelNotFoundError)
async def model_not_found_handler(request: Request, exc: ModelNotFoundError):
    return JSONResponse(
        status_code=404,
        content={
            "type": f"{request.base_url}errors/model-not-found",
            "title": "Model Not Found",
            "status": 404,
            "detail": f"Model '{exc.model_id}' not found",
            "instance": str(request.url),
            "context": {"model_id": exc.model_id}
        }
    )
```

---

### 2. Naming Conventions

**Current Issues:**
- ❌ Inconsistent endpoint naming (`/v1/system/unload` vs `/control/restart`)
- ❌ Mixed casing in responses (`memory_used` vs `memoryUsed`)

**Recommendations:**

**URL Patterns:**
```
✅ /v1/{resource}/{action}
✅ /v1/system/gpu/reset
✅ /v1/models/refresh
✅ /v1/images/generations

❌ /v1/system/gpu-reset  (prefer slash)
❌ /control/restart      (use /v1/system/restart)
```

**Response Keys:**
```typescript
// Use snake_case for consistency with Python
✅ { "model_id", "memory_used", "is_downloaded" }
❌ { "modelId", "memoryUsed", "isDownloaded" }
```

**HTTP Methods:**
```
GET    - Read operations
POST   - Create or complex operations
PUT    - Full update
PATCH  - Partial update
DELETE - Remove
```

---

### 3. API Versioning Strategy

**Current State:** ⚠️ `/v1` prefix but no version management  

**Recommendations:**

**Option A: URL Versioning (Current)**
```
✅ /v1/images/generations
✅ /v2/images/generations  (breaking changes)
```

**Option B: Header Versioning**
```typescript
Headers: {
  'Accept': 'application/vnd.moondream.v1+json'
}
```

**Deprecation Policy:**
```python
# Add deprecation warnings
@app.get("/v1/generate")  # Legacy
async def generate_legacy():
    warnings.warn("This endpoint is deprecated. Use /v1/images/generations")
    ...
```

---

### 4. Request/Response Schemas

**Recommendation:** Use Pydantic models for all I/O

```python
# Define schemas
from pydantic import BaseModel, Field

class ImageGenerationRequest(BaseModel):
    model: str = Field(..., description="Model ID")
    prompt: str = Field(..., max_length=10000)
    size: str = Field(default="512x512", pattern=r"^\d+x\d+$")
    n: int = Field(default=1, ge=1, le=10)
    
class ImageGenerationResponse(BaseModel):
    id: str
    created: int
    data: list[ImageData]
    
# Use in endpoint
@app.post("/v1/images/generations", response_model=ImageGenerationResponse)
async def generate(request: ImageGenerationRequest):
    ...
```

**Benefits:**
- Auto-validation
- Auto-documentation (OpenAPI)
- Type safety

---

### 5. Status Codes Standardization

**Recommended Usage:**
```
200 OK              - Successful GET/POST
201 Created         - Resource created
204 No Content      - Successful DELETE
400 Bad Request     - Invalid input
401 Unauthorized    - Not authenticated
403 Forbidden       - Not authorized
404 Not Found       - Resource doesn't exist
409 Conflict        - Resource already exists
422 Unprocessable   - Validation failed
429 Too Many Req    - Rate limit exceeded
500 Internal Error  - Server error
503 Service Unavail - Backend down
```

---

### 6. Pagination Standardization

**Current State:** ⚠️ No pagination on `/log` endpoint  

**Recommendation:**
```typescript
// Request
GET /log?limit=50&offset=100&order=desc

// Response
{
  "data": [...],
  "pagination": {
    "limit": 50,
    "offset": 100,
    "total": 1500,
    "has_more": true
  }
}
```

---

### 7. Timestamp Format

**Recommendation:** Use ISO 8601 everywhere
```typescript
✅ "2026-01-05T11:06:00Z"           (UTC with Z)
✅ "2026-01-05T21:06:00+10:00"      (Local timezone)
❌ "2026-01-05 11:06:00"            (Not ISO)
❌ 1704441960                       (Unix timestamp - inconsistent)
```

---

### 8. OpenAPI Documentation

**Recommendation:** Generate from code
```python
# FastAPI auto-generates OpenAPI
# Access at: http://localhost:2020/docs

# Enhance with descriptions
@app.post(
    "/v1/images/generations",
    summary="Generate images",
    description="Generate images using SDXL models",
    tags=["Generation"],
    responses={
        200: {"description": "Image generated successfully"},
        400: {"description": "Invalid parameters"},
        503: {"description": "Backend not available"}
    }
)
async def generate_image(...):
    ...
```

---

## 🎯 Implementation Roadmap

### Phase 1: Critical Security (Week 1)
- [ ] Add API key authentication
- [ ] Restrict CORS origins
- [ ] Validate all user inputs
- [ ] Bind services to localhost only
- [ ] Review sudo permissions

### Phase 2: Standardization (Week 2)
- [ ] Standardize error responses
- [ ] Implement rate limiting
- [ ] Add request validation schemas
- [ ] Unify naming conventions
- [ ] Add audit logging

### Phase 3: Hardening (Week 3)
- [ ] Setup HTTPS/TLS
- [ ] Add security headers
- [ ] Implement secrets management
- [ ] Add integrity checks
- [ ] Setup log monitoring

### Phase 4: Documentation (Week 4)
- [ ] Generate OpenAPI spec
- [ ] Document authentication
- [ ] Create security guide
- [ ] Add deployment guide
- [ ] Write API migration guide

---

## 📊 Security Testing Checklist

- [ ] SQL Injection testing (if database added)
- [ ] Path traversal testing
- [ ] Command injection testing
- [ ] CORS bypass attempts
- [ ] Rate limit validation
- [ ] Auth bypass attempts
- [ ] Privilege escalation testing
- [ ] VRAM exhaustion testing
- [ ] Log injection testing
- [ ] XSS vulnerability scan

---

## 🔍 Monitoring & Alerts

### Recommended Monitoring:
```python
# Add metrics endpoint
@app.get("/metrics")
async def metrics():
    return {
        "requests_total": request_counter,
        "errors_total": error_counter,
        "auth_failures": auth_failure_counter,
        "rate_limit_hits": rate_limit_counter,
        "avg_response_time_ms": avg_response_time
    }
```

### Alert Triggers:
- 🚨 Multiple auth failures from same IP
- 🚨 Sudo command execution
- 🚨 GPU reset triggered
- 🚨 High error rate (>10% of requests)
- 🚨 VRAM exhaustion
- 🚨 Backend crash/restart

---

## 📝 Compliance Notes

### Local Use Only:
If this is strictly local development:
- Authentication can be optional (but recommended)
- HTTPS can be skipped (but use for remote access)
- Rate limiting can be relaxed

### Multi-User / Remote Access:
If multiple users or remote access:
- ✅ **MUST** implement authentication
- ✅ **MUST** use HTTPS
- ✅ **MUST** implement rate limiting
- ✅ **MUST** add audit logging

### Production Deployment:
- ✅ All P0 + P1 security items
- ✅ Reverse proxy with WAF
- ✅ Regular security audits
- ✅ Backup and disaster recovery

---

**Next Steps:**
1. Review recommendations with team
2. Prioritize based on deployment context
3. Create GitHub issues for each action item
4. Begin Phase 1 implementation
