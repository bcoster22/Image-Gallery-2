# ⚡ God Tier SDXL Presets - 2025 Edition

## Overview
10 professionally-crafted preset "recipes" combining Models, Samplers, Schedulers, and parameters for specific use cases. Optimized for **3070 Ti (8GB VRAM)**.

---

## 🥇 **Category A: Photorealism** (Best for Humans/Photos)

### 1. **2025 Standard** ⭐ RECOMMENDED
**Best For**: General photorealism - the safest bet  
**Configuration**:
- Model: Juggernaut XL  
- Sampler: `dpmpp_2m_sde_gpu`  
- Scheduler: Karras  
- Steps: 35 | CFG: 5.0 | VRAM: ~6GB  

**Why**: Perfect balance - Karras structure + SDE noise for skin texture  
**Speed**: Medium  
**Use When**: Default choice for portraits, people, realistic photos

---

### 2. **Velvet Skin**
**Best For**: Close-up female portraits, beauty shots, fashion  
**Configuration**:
- Model: CyberRealistic XL  
- Sampler: `dpmpp_2m_sde_gpu`  
- Scheduler: **Beta** (Crucial!)  
- Steps: 40 | CFG: 4.5 | VRAM: ~6.5GB  

**Why**: Beta scheduler removes "crunchy" digital sharpening → naturally soft skin  
**Speed**: Slow  
**Use When**: Beauty photography, soft portraits, magazine covers

---

### 3. **Cinema**
**Best For**: Night shots, neon lighting, dramatic shadows  
**Configuration**:
- Model: NightVision XL  
- Sampler: `dpmpp_2m_sde_gpu`  
- Scheduler: **Exponential**  
- Steps: 40 | CFG: 5.5 | VRAM: ~6.5GB  

**Why**: Exponential curve resolves deep blacks without grey mush  
**Speed**: Slow  
**Use When**: Dark moody scenes, "Batman" aesthetics, neon streets

---

## ⚡ **Category B: Efficiency** (Speed & Tech)

### 4. **Smart Step (AYS)**
**Best For**: High quality in half the time  
**Configuration**:
- Model: Any SDXL  
- Sampler: `dpmpp_2m` (No SDE)  
- Scheduler: **Align Your Steps**  
- Steps: 12-15 | CFG: 6.0 | VRAM: ~5GB  

**Why**: Front-loads noise removal - 30-step quality in 12 steps  
**Speed**: Fast  
**Use When**: Testing prompts, iteration, previews

---

### 5. **Turbo Snap** ⚡
**Best For**: Rapid prototyping, testing  
**Configuration**:
- Model: Juggernaut XL **Lightning**  
- Sampler: `dpmpp_sde_gpu`  
- Scheduler: **SGM Uniform**  
- Steps: 6-8 | CFG: 1.5-2.0 | VRAM: ~4GB  

**Why**: Full image in under 2 seconds on 3070 Ti  
**Speed**: Lightning  
**Use When**: Draft mode, prompt experiments

---

## 🏗️ **Category C: Stylized & Structural**

### 6. **Digital Crisp**
**Best For**: Buildings, cars, product design, hard surfaces  
**Configuration**:
- Model: RealVisXL  
- Sampler: `dpmpp_2m` (No SDE!)  
- Scheduler: Karras  
- Steps: 30 | CFG: 7.0 | VRAM: ~5.5GB  

**Why**: No SDE = mathematically perfect lines (3D render style)  
**Speed**: Medium  
**Use When**: Architecture, product shots, geometric subjects

---

### 7. **Creative Chaos** 🎨
**Best For**: Oil paintings, concept art, messy backgrounds  
**Configuration**:
- Model: DreamShaper XL  
- Sampler: **Euler Ancestral**  
- Scheduler: Normal  
- Steps: 30 | CFG: 6.0 | VRAM: ~5.5GB  

**Why**: Ancestral sampler adds noise → painterly "happy accidents"  
**Speed**: Medium  
**Use When**: Artistic style, concept art, fantasy

---

### 8. **The Grounded** (Flux Mimic)
**Best For**: Dense, heavy realism - solid feel  
**Configuration**:
- Model: RealVisXL  
- Sampler: **Euler**  
- Scheduler: Simple/Beta  
- Steps: 50 | CFG: 4.0 | VRAM: ~7GB  

**Why**: Imitates Flux - slow/steady for maximum coherence  
**Speed**: Very Slow  
**Use When**: Need extreme coherence, "weight" in images

---

## 🔬 **Category D: Specialist**

### 9. **Detail Beast**
**Best For**: Extreme close-ups (eyes, bugs, jewelry)  
**Configuration**:
- Model: CyberRealistic XL  
- Sampler: **`dpmpp_3m_sde_gpu`** (3M!)  
- Scheduler: Karras  
- Steps: 50+ | CFG: 5.0 | VRAM: ~7.5GB  

**Why**: 3M solver resolves finer details than 2M  
**Speed**: Very Slow  
**Use When**: Macro photography, texture detail shots

---

### 10. **The Resurrector** 🔧
**Best For**: Difficult poses, multiple people, hands  
**Configuration**:
- Model: Juggernaut XL  
- Sampler: **Restart**  
- Scheduler: Karras  
- Steps: 35-40 | CFG: 5.0 | VRAM: ~7GB  

**Why**: Restart sampler error-checks itself during generation  
**Speed**: Slow  
**Use When**: Complex anatomy, yoga poses, hand-heavy scenes

---

## 📊 Quick Reference Table

| # | Name | Sampler | Scheduler | Steps | CFG | Speed | VRAM |
|---|------|---------|-----------|-------|-----|-------|------|
| 1 | Standard | dpmpp_2m_sde | karras | 35 | 5.0 | Medium | 6GB |
| 2 | Velvet Skin | dpmpp_2m_sde | **beta** | 40 | 4.5 | Slow | 6.5GB |
| 3 | Cinema | dpmpp_2m_sde | **exponential** | 40 | 5.5 | Slow | 6.5GB |
| 4 | AYS | dpmpp_2m | **ays** | 15 | 6.0 | Fast | 5GB |
| 5 | Turbo | dpmpp_sde | sgm_uniform | 8 | 2.0 | Lightning | 4GB |
| 6 | Crisp | dpmpp_2m | karras | 30 | 7.0 | Medium | 5.5GB |
| 7 | Chaos | euler_a | normal | 30 | 6.0 | Medium | 5.5GB |
| 8 | Grounded | euler | simple | 50 | 4.0 | Very Slow | 7GB |
| 9 | Detail | **dpmpp_3m_sde** | karras | 50 | 5.0 | Very Slow | 7.5GB |
| 10 | Resurrector | **restart** | karras | 40 | 5.0 | Slow | 7GB |

---

## 🎯 How to Use

### In the UI:
1. Open **Generation Studio**
2. Type your prompt
3. See **God Tier Presets** section
4. Click a preset card → **Everything auto-configures**
5. Generate!

### Auto-Recommendations:
Type keywords to trigger recommendations:
- **"portrait"** → Standard Realism or Velvet Skin
- **"night"** → Cinema
- **"fast"** → Smart Step (AYS)
- **"hands"** → Resurrector

---

## 💡 Pro Tips

### CFG Guidelines:
- **Keep CFG LOW** (4.0-6.5) for SDXL realism
- High CFG (>7) destroys realism → "plastic AI look"
- Only use CFG 7+ for structural/product work

### When to Use SDE:
- **With SDE** (`dpmpp_2m_sde`): Portraits, skin, organic textures
- **Without SDE** (`dpmpp_2m`): Architecture, hard edges, products

### Step Count Sweet Spots:
- **Lightning**: 6-8 steps
- **Fast**: 12-20 steps  
- **Quality**: 30-40 steps
- **Maximum**: 50+ (diminishing returns)

---

## 🔧 Technical Notes

### Scheduler Behavior:
- **Karras**: Best structure, standard choice
- **Beta**: Smoothest gradients for soft portraits
- **Exponential**: Aggressive end-curve for dark scenes
- **AYS**: Front-loaded efficiency
- **Simple**: Linear, predictable

### Sampler Types:
- **dpmpp_2m**: Standard, clean
- **dpmpp_2m_sde**: Adds texture/noise
- **dpmpp_3m_sde**: Higher detail resolution
- **euler**: Simple, stable
- **euler_ancestral**: Creative variation
- **restart**: Self-correcting for anatomy

---

**Created**: 2025-12-19  
**Optimized For**: RTX 3070 Ti (8GB VRAM)  
**Status**: ✅ Production Ready
