# Dynamic Model Discovery - How It Works

## Overview

The Image Gallery Frontend **automatically discovers** models from the Moondream-Station backend. When new models are added to moondream-station (like Moondream 3, Florence-2, WD14 Tagger), they **automatically appear** in the frontend UI without code changes.

---

## How It Works

### 1. Backend Endpoint
```http
GET /v1/models
```

**Returns:**
```json
{
  "models": [
    {
      "id": "model-id",
      "name": "Model Display Name", 
      "description": "What this model does",
      "version": "1.0.0",
      "last_known_vram_mb": 2500
    }
  ]
}
```

### 2. Frontend Auto-Discovery

**Location:** `components/AdminSettingsPage.tsx` (lines 345-383)

```typescript
const [availableMoondreamModels, setAvailableMoondreamModels] = useState([...]);

useEffect(() => {
  const fetchModels = async () => {
    const url = `${settings.providers.moondream_local.endpoint}/v1/models`;
    const res = await fetch(url);
    
    if (res.ok) {
      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        setAvailableMoondreamModels(data.models); // ✅ Dynamic!
      }
    }
  };
  
  fetchModels();
}, [settings.providers.moondream_local.endpoint]); // Re-fetch when endpoint changes
```

### 3. UI Updates Automatically

Model dropdowns populate from `availableMoondreamModels`:

```typescript
<select value={model} onChange={...}>
  {availableMoondreamModels.map(model => (
    <option key={model.id} value={model.id}>
      {model.name}
    </option>
  ))}
</select>
```

**Where it's used:**
- Admin Settings → Providers → Moondream Local → Model selector
- Admin Settings → Providers → Moondream Local → Captioning Model override
- Admin Settings → Providers → Moondream Local → Tagging Model override

---

## Current Models (Auto-Discovered)

As of 2025-12-18, moondream-station reports:

| ID | Name | Type |
|---|---|---|
| `moondream-3-preview` | Moondream 3 Preview | Vision |
| `moondream-2` | Moondream 2 Latest | Vision |
| `joycaption-alpha-2` | JoyCaption Alpha 2 | Captioning |
| `florence-2-large` | Florence-2 Large | Analysis/OCR |
| `wd14-vit-v2` | WD14 ViT Tagger v2 | Tagging |
| `sdxl-realism` | SDXL Realism (Juggernaut) | Generation |
| `sdxl-anime` | SDXL Anime (Animagine) | Generation |
| `sdxl-surreal` | SDXL Surreal (DreamShaper) | Generation |
| `nsfw-detector` | NSFW Detector (Marqo) | Safety |

---

## Fallback Behavior

**If backend is unreachable:**
- Uses hardcoded `MOONDREAM_MODELS` array (line 20-32)
- This fallback is updated periodically to match common models
- Prevents UI from being empty if backend is offline

**Fallback updated:** 2025-12-18 (matches all current backend models)

---

## Adding New Models

### Backend Side (moondream-station)
1. Add model to manifest: `local_manifest.json`
   ```json
   {
     "models": {
       "new-model-id": {
         "id": "new-model-id",
         "name": "New Model Name",
         "type": "vision",
         "backend": "moondream_backend",
         ...
       }
     }
   }
   ```

2. Restart moondream-station
   ```bash
   # Backend auto-loads manifest on startup
   python3 dev_run_backend.py
   ```

### Frontend Side
**NO CODE CHANGES NEEDED!** 🎉

1. Frontend automatically fetches `/v1/models`
2. New model appears in dropdowns
3. Users can select it immediately

### Optional: Update Fallback
If you want the fallback to include the new model (for offline scenarios):

```typescript
// AdminSettingsPage.tsx line 20-32
const MOONDREAM_MODELS = [
  // ... existing models ...
  { id: 'new-model-id', name: 'New Model Name' }
];
```

---

## Testing Dynamic Discovery

### 1. Verify Backend Endpoint
```bash
curl http://localhost:2020/v1/models | python3 -m json.tool
```

**Expected:** JSON with `models` array

### 2. Check Frontend Fetch
```typescript
// Open browser DevTools → Network tab
// Filter: /v1/models
// Should see request when opening Admin Settings
```

### 3. Verify UI Updates
```
1. Open Admin Settings
2. Go to Providers → Moondream Local
3. Model dropdown should show all backend models
4. Add new model to backend manifest
5. Restart backend
6. Refresh Admin Settings (or change endpoint URL to re-trigger fetch)
7. New model should appear in dropdown
```

---

## Edge Cases

### Backend Returns Invalid Data
- **Fallback kicks in**: Uses hardcoded `MOONDREAM_MODELS`
- **Console warning**: "Failed to fetch dynamic Moondream models, using defaults."

### Backend Endpoint Changes
- **Auto re-fetch**: `useEffect` dependency triggers new fetch
- **Previous models cleared**: Replaced with new endpoint's models

### Model Removed from Backend
- **Immediately disappears** from frontend dropdowns
- **If currently selected**: May still work if backend accepts it
- **Recommendation**: Deprecate gradually, don't delete immediately

---

## Benefits of Dynamic Discovery

✅ **No frontend deployments** when adding models
✅ **Always up-to-date** with backend capabilities  
✅ **Multi-backend support** - can point to different endpoints
✅ **Graceful degradation** - falls back if backend offline
✅ **Future-proof** - works with unknown models

---

## Related Files

| File | Purpose | Lines |
|------|---------|-------|
| `AdminSettingsPage.tsx` | Model fetching logic | 345-383 |
| `AdminSettingsPage.tsx` | Fallback model list | 20-32 |
| `AdminSettingsPage.tsx` | Model dropdown rendering | 700-708, 718-728, 735-745 |
| `rest_server_temp_5.py` | Backend `/v1/models` endpoint | 578-607 |
| `SYSTEM_INTEGRATION_MAP.md` | API integration reference | Full document |

---

## API Contract

**Frontend expects:**
```typescript
interface ModelResponse {
  models: Array<{
    id: string;           // Required: Unique model ID
    name: string;         // Required: Display name
    description?: string; // Optional: What it does
    version?: string;     // Optional: Version number
    last_known_vram_mb?: number; // Optional: Memory usage
  }>;
}
```

**Backend must provide:**
- `id` - Used in API calls (e.g., `model: "joycaption-alpha-2"`)
- `name` - Displayed in UI dropdowns

All other fields are optional but recommended for better UX.

---

**Last Updated:** 2025-12-18
**System:** Phase 2 Complete with Dynamic Model Discovery
**Backend API Version:** v1
