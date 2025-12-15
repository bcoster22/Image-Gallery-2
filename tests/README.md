# Test Scripts Directory

## 📍 Location
All test scripts are organized in this `tests/` directory.

## 📂 Directory Structure

```
tests/
├── backend/          # Backend/API tests (Python)
├── integration/      # Integration tests (JS/TS)
├── fixtures/         # Test data and mock responses
└── README.md         # This file
```

## 🧪 Test Categories

### Backend Tests (`tests/backend/`)
Python scripts for testing backend functionality:
- `test_backend_load.py` - Backend loading and initialization
- `test_backend_models.py` - AI model loading and management
- `test_cuda.py` - CUDA/GPU functionality
- `test_moondream.py` - Moondream model integration

**Run with:**
```bash
python3 tests/backend/test_backend_load.py
```

### Integration Tests (`tests/integration/`)
JavaScript/TypeScript tests for API integration:
- `test_moondream_connection.js` - Moondream API connection
- `test_parsing.js` - Response parsing (JavaScript)
- `test_parsing.ts` - Response parsing (TypeScript)
- `test_sse.js` - Server-Sent Events streaming

**Run with:**
```bash
node tests/integration/test_moondream_connection.js
```

### Test Fixtures (`tests/fixtures/`)
Mock data and test responses:
- `test_nsfw.json` - NSFW detection test data (825KB)
- `test_vlm.json` - VLM (Vision Language Model) test data (825KB)

## 🚀 Quick Start

### Running All Backend Tests
```bash
for test in tests/backend/*.py; do
    echo "Running $test..."
    python3 "$test"
done
```

### Running All Integration Tests
```bash
for test in tests/integration/*.js; do
    echo "Running $test..."
    node "$test"
done
```

## 📝 Notes

- These tests were used during development of features now committed to GitHub
- Tests are kept for regression testing and future development
- Backend tests require moondream-station to be running on localhost:2020
- Integration tests may require specific API endpoints to be available

## 🔗 Related Documentation

- **Backend Setup:** See moondream-station repository
- **API Documentation:** Check `moondream-station/core/rest_server.py`
- **Feature Documentation:** See `/home/bcoster/.gemini/antigravity/brain/*/walkthrough.md`

## 💡 When to Use These Tests

1. **After updating moondream-station** - Run backend tests to verify compatibility
2. **Before major releases** - Run all tests to catch regressions
3. **When debugging issues** - Use relevant tests to isolate problems
4. **When adding new features** - Reference existing tests as examples

## 🗂️ Test File Purposes

| File | Purpose | Dependencies |
|------|---------|--------------|
| `test_backend_load.py` | Verify backend starts correctly | moondream-station |
| `test_backend_models.py` | Check model loading/unloading | CUDA, models |
| `test_cuda.py` | Validate GPU/CUDA setup | NVIDIA GPU |
| `test_moondream.py` | Test Moondream API endpoints | moondream-station |
| `test_moondream_connection.js` | Verify API connectivity | Node.js |
| `test_parsing.js/ts` | Test response parsing logic | Node.js/TypeScript |
| `test_sse.js` | Validate streaming responses | Node.js |
| `test_nsfw.json` | NSFW detection test cases | - |
| `test_vlm.json` | VLM response examples | - |

## 🔍 Finding This Directory Later

If you're looking for test scripts in the future:
1. Check `Image-Gallery-2/tests/` directory
2. This README explains what each test does
3. All test files follow the naming pattern `test_*.{py,js,ts,json}`

---

**Last Updated:** December 14, 2024
**Project:** Image-Gallery-2
**Related Repos:** moondream-station
