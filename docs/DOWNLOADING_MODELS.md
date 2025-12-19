# 📥 Downloading SDXL Models

## Quick Start

Download all 10 premium SDXL models with one command:

```bash
python3 scripts/download_sdxl_models.py
```

## What Gets Downloaded

### 🥇 **Gold Standard** (The Big Three)
1. **Juggernaut XL** - Cinematic lighting and composition (~5 GB)
2. **RealVisXL V5** - Raw photography and imperfect realism (~5 GB)
3. **CyberRealistic XL** - Skin texture and portraits (~5 GB)

### ⭐ **Specialized Models**
4. **epiCRealism XL** - Natural unpolished realism (~5 GB)
5. **ZavyChroma XL** - Magic realism with vibrant color (~5 GB)
6. **HelloWorld XL** - Diverse subjects and architecture (~5 GB)
7. **NightVision XL** - Low-light and night photography (~5 GB)
8. **AlbedoBase XL** - General purpose safe realism (~5 GB)
9. **Copax Timeless XL** - Artistic/painterly realism (~5 GB)
10. **DreamShaper XL** - Fantasy realism and concept art (~5 GB)

**Total Size**: ~30-50 GB (depending on cached files)

## Features

✅ **Resumable Downloads** - Interrupted downloads continue from where they left off  
✅ **Smart Filtering** - Only downloads essential files (.safetensors, .json)  
✅ **HuggingFace Cache** - Uses standard HF cache directory (`~/.cache/huggingface`)  
✅ **Progress Tracking** - Shows download progress for each model  
✅ **Error Handling** - Failed downloads can be retried  

## Requirements

Make sure you have the required dependencies:

```bash
pip install huggingface_hub tqdm
```

Or if using the project venv:

```bash
source .venv/bin/activate
pip install huggingface_hub tqdm
```

## Download Options

### Download All Models
```bash
python3 scripts/download_sdxl_models.py
```

### Download in Background (Large Download)
```bash
nohup python3 scripts/download_sdxl_models.py > download.log 2>&1 &
```

Monitor progress:
```bash
tail -f download.log
```

## Storage Locations

Models are downloaded to your HuggingFace cache:
```
~/.cache/huggingface/hub/
```

The backend automatically finds models in this standard location.

## Troubleshooting

### "Out of disk space"
Check available space:
```bash
df -h ~
```

You need at least **50 GB free** for all 10 models.

### "Download failed"
1. Check your internet connection
2. Re-run the script - it will resume from where it stopped
3. If a specific model fails repeatedly, you can still use the other 9

### "HuggingFace authentication required"
Some models may require you to accept their license on HuggingFace first:
1. Visit the model page on HuggingFace
2. Accept the license/usage terms
3. Login via CLI:
   ```bash
   huggingface-cli login
   ```

## Model Selection Priority

If you have limited space, download in this order:

### **Must Have** (15 GB)
1. Juggernaut XL - Best all-around
2. RealVisXL V5 - Best for photography
3. CyberRealistic XL - Best for portraits

### **Highly Recommended** (10 GB)
4. NightVision XL - For dark/night scenes
5. AlbedoBase XL - Reliable general purpose

### **Nice to Have** (25 GB)
6-10. Remaining specialized models

## After Download

Once downloaded, the models are immediately available in the Generation Studio:
1. Open Generation Studio
2. Type a prompt
3. See intelligent model recommendations
4. Click to select and auto-configure
5. Generate stunning images!

## Verify Downloads

Check which models are available:
```bash
ls -lh ~/.cache/huggingface/hub/ | grep -E "(Juggernaut|RealVis|Cyber|epic|Zavy|Hello|Night|Albedo|Copax|Dream)"
```

## Removing Models

To free up space, delete specific model folders from:
```bash
rm -rf ~/.cache/huggingface/hub/models--<username>--<model-name>
```

Example:
```bash
rm -rf ~/.cache/huggingface/hub/models--RunDiffusion--Juggernaut-XL-Lightning
```

---

**Pro Tip**: Start with the **Gold Standard** models (1-3) and add specialized models as needed for your specific use cases!
