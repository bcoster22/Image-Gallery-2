# 🏗️ Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Image Grid  │  │   Viewer     │  │   Status     │      │
│  │  (Virtualized)│  │  (Actions)   │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │   API Client   │                        │
│                    └───────┬────────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTP/REST
┌────────────────────────────▼─────────────────────────────────┐
│                    Backend API (FastAPI)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  REST Routes │  │  VRAM Manager│  │  Queue       │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌────────▼───────┐   ┌───────▼───────┐
│   Moondream   │   │  SDXL Backend  │   │  Model Cache  │
│   (Vision)    │   │   (Generation) │   │  (HuggingFace)│
│   7B Model    │   │   SDXL Models  │   │   ~/.cache    │
└───────────────┘   └────────────────┘   └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   GPU (CUDA)    │
                    │   12-16GB VRAM  │
                    └─────────────────┘
```

## Component Breakdown

### Frontend Stack
- **React 19**: UI framework with concurrent features
- **Vite 6**: Lightning-fast dev server and build tool
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **IndexedDB**: Client-side image storage
- **react-window**: Virtualized list rendering (1000+ images)

### Backend Stack
- **FastAPI**: Modern async Python web framework
- **Uvicorn**: ASGI server
- **PyTorch 2.x**: Deep learning framework
- **Diffusers**: Stable Diffusion pipeline
- **Transformers**: Moondream vision model
- **bitsandbytes**: 4-bit quantization for VRAM efficiency

### AI Models
1. **SDXL (Stable Diffusion XL) - Image Generation**
   - `Juggernaut-XL-Lightning`: Photorealistic (6GB)
   - `Animagine-XL-3.1`: Anime/Illustration (6GB)
   - `DreamShaper-Lightning`: Artistic/Surreal (6GB)

2. **Moondream 2 - Vision Analysis**
   - 7B parameter vision-language model
   - Optimized for edge devices
   - Captioning and object detection

## Data Flow

### Image Upload Flow
```
User Uploads ──► Frontend ──► IndexedDB ──► Analysis Queue ──► Backend
                                                │
                                                ├─► Moondream (Caption)
                                                ├─► Moondream (Tags)
                                                └─► NSFW Detection
                                                      │
Frontend Update ◄── Analysis Result ◄───────────────┘
```

### Image Generation Flow
```
User Action ──► PromptModal ──► Backend API ──► Model Check
  │                                                  │
  │                                          ┌──────▼────────┐
  │                                          │ Model Loaded? │
  │                                          └──────┬────────┘
  │                                                 │
  │                                          ┌──────▼────────┐
  │                                          │ Load SDXL     │
  │                                          │ (4-bit quant) │
  │                                          └──────┬────────┘
  │                                                 │
  │                                          ┌──────▼────────┐
  │                                          │ Generate      │
  │                                          │ (GPU process) │
  │                                          └──────┬────────┘
  │                                                 │
Frontend ◄─── Notification ◄─── API Response ◄─────┘
   │
   └─► Save to Gallery ──► IndexedDB
```

## Performance Optimizations

### Frontend
- **Virtualized Rendering**: Only renders visible images (react-window)
- **Image Lazy Loading**: Progressive loading with placeholders
- **Debounced Search**: Reduces re-renders during search
- **IndexedDB**: Async storage for offline capability
- **Code Splitting**: Lazy-loaded components (to be added)

### Backend
- **4-bit Quantization**: Reduces VRAM usage by 75%
- **Model Caching**: Keeps models in VRAM between requests
- **Adaptive Concurrency**: Dynamic queue management based on GPU load
- **VRAM Modes**: Low/Balanced/High for different hardware
- **Tiled Processing**: For images larger than GPU memory

### GPU Memory Management
```python
Memory Layout (12GB GPU, Balanced Mode):
├── System Reserved: 2GB
├── SDXL Model (4-bit): 4-6GB
├── Moondream Model: 2-3GB
├── Processing Buffer: 2-3GB
└── Safety Margin: 1GB
```

---

# 📚 Additional Resources

## Documentation

| Document | Description |
|----------|-------------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Comprehensive deployment guide |
| [docs/ADVANCED_SETTINGS.md](./docs/ADVANCED_SETTINGS.md) | AI provider configuration |
| [docs/SDXL_MODELS_ADDED.md](./docs/SDXL_MODELS_ADDED.md) | Model selection guide |
| [docs/UI_UX_ENHANCEMENT_PLAN.md](./docs/UI_UX_ENHANCEMENT_PLAN.md) | UI design decisions |

## API Reference

### Backend Endpoints

```bash
# Health Check
GET /v1/status

# Image Generation
POST /v1/generate
{
  "prompt": "...",
  "model": "sdxl-realism",
  "steps": 30,
  "width": 1024,
  "height": 1024
}

# Image-to-Image
POST /v1/generate
{
  "prompt": "...",
  "image": "base64...",
  "strength": 0.75,
  "model": "sdxl-realism"
}

# Vision Analysis
POST /v1/chat/completions
{
  "model": "moondream-2",
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": "Describe this image"},
      {"type": "image_url", "image_url": {"url": "data:image/..."}}
    ]
  }]
}

# Model Management
POST /v1/model/switch
{
  "model_id": "moondream-2"
}

POST /v1/model/unload
```

## Testing

### Run Tests

```bash
# Backend tests
source .venv/bin/activate
python -m pytest tests/

# Action suite (integration tests)
python scripts/test_actions_suite.py

# Verify outputs
python scripts/verify_action_outputs.py
```

### Test Coverage

- ✅ Image generation (text-to-image)
- ✅ Image enhancement (img-to-img)
- ✅ Image remixing (style transfer)
- ✅ Sketch conversion
- ✅ Caption generation
- ✅ Model switching
- ✅ VRAM management

---

# 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

## Development Setup

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. Make your changes
5. Test thoroughly
6. Commit with clear messages: `git commit -m 'feat: add amazing feature'`
7. Push to your fork: `git push origin feature/amazing-feature`
8. Open a Pull Request

## Contribution Guidelines

### Code Style

**TypeScript/React:**
- Use functional components with hooks
- Follow existing naming conventions
- Add TypeScript types for all props
- Use Tailwind CSS for styling

**Python:**
- Follow PEP 8 style guide
- Use type hints
- Add docstrings for functions
- Keep functions focused and small

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new slideshow transition
fix: resolve VRAM leak in model switching
docs: update installation guide
refactor: simplify image analysis queue
perf: optimize rendering with virtualization
test: add integration tests for generation
```

### Pull Request Process

1. **Update Documentation**: Add/update relevant docs
2. **Add Tests**: Include tests for new features
3. **Check Build**: Ensure `npm run build` succeeds
4. **Run Linter**: Fix any linting errors
5. **Describe Changes**: Clearly explain what and why
6. **Link Issues**: Reference related issues

## Development Tips

### Debugging

**Frontend:**
```bash
# Enable verbose logging
localStorage.setItem('debug', 'true')

# React DevTools
npm install -g react-devtools

# Check network requests
Open DevTools → Network → Filter: /api/
```

**Backend:**
```bash
# Enable debug logging
LOG_LEVEL=DEBUG python3 dev_run_backend.py

# Monitor GPU
watch -n 1 nvidia-smi

# Profile code
python -m cProfile dev_run_backend.py
```

### Common Development Tasks

```bash
# Rebuild frontend
npm run build

# Format code
npm run format  # Frontend
black .         # Backend

# Type checking
npm run type-check

# Bundle analysis
npm run build -- --report
```

---

# 🐛 Troubleshooting

## Common Issues

### "CUDA out of memory"

**Solution 1: Reduce VRAM usage**
```bash
# Edit .env
VRAM_MODE=low

# Restart backend
docker-compose restart backend
```

**Solution 2: Use tiled processing**
```typescript
// In AI settings panel
Enable "Tiled Processing"
Reduce "Target Megapixels"
```

### "Models not loading"

**Check:**
```bash
# Verify model path
ls -la ~/.cache/huggingface/hub/

# Check permissions
chmod -R 755 ~/.cache/huggingface/

# Re-download
huggingface-cli download RunDiffusion/Juggernaut-XL-Lightning --force-download
```

### "Connection refused (ECONNREFUSED)"

**Backend not running:**
```bash
# Check if backend is running
lsof -i :2020

# Start backend
source .venv/bin/activate
python3 dev_run_backend.py

# Check logs
tail -f scripts/server.log
```

### "npm install fails"

**Solution:**
```bash
# Clear cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### "GPU not detected"

**Check:**
```bash
# NVIDIA driver
nvidia-smi

# CUDA
nvcc --version

# Docker GPU access
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

## Getting Help

- 📖 **Docs**: Check `/docs` folder
- 💬 **Issues**: [GitHub Issues](https://github.com/bcoster22/Image-Gallery-2/issues)
- 🐛 **Bug Reports**: Use issue template
- 💡 **Feature Requests**: Open a discussion

---

# 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

You are free to:
- ✅ Use commercially
- ✅ Modify
- ✅ Distribute
- ✅ Use privately

**Attribution appreciated but not required!**

---

# 🙏 Acknowledgments

## Core Technologies
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [PyTorch](https://pytorch.org/) - Deep learning

## AI Models
- [Stable Diffusion XL](https://stability.ai/stable-diffusion) - Base generation model
- [Juggernaut XL Lightning](https://huggingface.co/RunDiffusion/Juggernaut-XL-Lightning) - Photorealistic model
- [Animagine XL](https://huggingface.co/cagliostrolab/animagine-xl-3.1) - Anime model
- [DreamShaper Lightning](https://huggingface.co/Lykon/dreamshaper-xl-lightning) - Artistic model
- [Moondream](https://github.com/vikhyat/moondream) - Vision model

## Community
- Special thanks to all contributors
- Inspired by modern image galleries and AI tools
- Built with ❤️ for the open-source community

---

# 🔮 Roadmap

## Upcoming Features

### v2.0 (Q1 2025)
- [ ] Multi-user authentication (OAuth)
- [ ] Cloud storage integration (S3, GCS)
- [ ] Video generation (AnimateDiff)
- [ ] Advanced prompt engineering UI
- [ ] API rate limiting and quotas

### v2.1 (Q2 2025)
- [ ] Image organization (albums, collections)
- [ ] Collaborative galleries (share with team)
- [ ] Advanced search (semantic, visual similarity)
- [ ] Batch operations (bulk edit, export)
- [ ] Mobile app (React Native)

### v3.0 (Q3 2025)
- [ ] LoRA training interface
- [ ] Custom model fine-tuning
- [ ] Advanced compositing tools
- [ ] Real-time collaboration
- [ ] Plugin system

**Want to contribute?** Pick a feature and open a PR!

---

**⭐ If you found this project helpful, please star it on GitHub!**

**Last Updated:** December 17, 2025
