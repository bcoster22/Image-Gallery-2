# System Update & Verification Guide

## Overview
Image Gallery 2.5 introduces a comprehensive **Frontend-Driven Backend Auto-Update System**. This system allows you to keep technical dependencies (like PyTorch, CUDA support, and AI models) up-to-date directly from the web interface, without needing to run terminal commands.

## Features

### 1. Backend Version Monitoring
The Admin Dashboard (`Settings` -> `Versions`) now displays real-time version information for:
- **Core AI Libraries**: `torch`, `diffusers`, `transformers`, `accelerate`
- **System Info**: Python version, Platform, CUDA availability.

### 2. Critical Security Alerts
The system automatically checks for known security vulnerabilities (e.g., CVE-2025-32434 in PyTorch < 2.6). If a vulnerability is detected:
- A crimson **Critical Security Update** banner appears in the Admin Actions area.
- You can click **"Apply Security Fix Now"** to resolve it immediately.

### 3. One-Click Verification Console
After an update (or at any time), you can run a **System Health Check**. This runs 7 diagnostic tests:
- **PyTorch Version**: Ensures you are on a secure, GPU-enabled version.
- **CUDA GPU**: Verifies the backend can see your NVIDIA card.
- **VRAM**: Checks available video memory.
- **Disk Space**: Warns if you are running low on space for models.
- **Network**: Tests connectivity to HuggingFace (crucial for model downloads).
- **FFmpeg**: Checks if video generation tools are present.
- **GPU Tensor Op**: Runs a real mathematical operation on the GPU to prove stability.

## How to Update

1. Navigate to **Settings** (Gear Icon) -> **System Status** (or **Versions** in Admin panel).
2. Look for the **Backend System** panel.
3. Click **Update Backend** (or "Apply Security Fix").
4. Wait for the process to complete (usually 5-10 minutes).
5. The system will automatically run the **Health Check** to verify success.

## Manual Commands (Fallback)
If the web updater fails, you can run these commands in your backend terminal:

**Verify Health:**
```bash
curl http://localhost:2020/v1/system/verify-backend
```

**Force Upgrade:**
```bash
curl -X POST http://localhost:2020/v1/system/upgrade-backend
```
