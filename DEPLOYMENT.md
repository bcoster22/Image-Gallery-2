# Deployment Guide - Image Gallery 2

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Manual Deployment](#manual-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **GPU:** NVIDIA GPU with at least 12GB VRAM (recommended: 16GB+)
- **RAM:** 32GB+ system RAM
- **Storage:** 50GB+ free space (for models)
- **OS:** Linux (Ubuntu 22.04 recommended)

### Software Requirements
- Docker & Docker Compose (with NVIDIA Container Toolkit)
- OR Python 3.11+ and Node.js 20+
- CUDA 12.1+ (for GPU support)

---

## Quick Start (Docker)

### 1. Install NVIDIA Container Toolkit

```bash
# Add NVIDIA package repositories
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

# Install nvidia-docker2
sudo apt-get update
sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

# Test GPU access
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env

# Set required variables:
# - MOONDREAM_MODELS_DIR (path to your models)
# - VITE_API_BASE_URL (backend URL)
# - API keys (if using cloud providers)
```

### 3. Download Models

```bash
# Create models directory
mkdir -p models

# Download Moondream models (if not already downloaded)
# Follow instructions from: https://github.com/vikhyat/moondream
```

### 4. Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check health
docker-compose ps
```

### 5. Access Application

- **Frontend:** http://localhost
- **Backend API:** http://localhost:2020
- **Health Check:** `curl http://localhost:2020/v1/chat/completions`

---

## Manual Deployment

### Backend Deployment

#### 1. Install Python Dependencies

```bash
# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### 2. Install Moondream Station

```bash
# Clone Moondream Station
git clone https://github.com/vikhyat/moondream ~/.moondream-station/moondream-station

# Install dependencies
cd ~/.moondream-station/moondream-station
pip install -r requirements.txt
```

#### 3. Configure Environment

```bash
export MOONDREAM_PATH=~/.moondream-station/moondream-station
export MOONDREAM_MODELS_DIR=~/.moondream-station/models
export PORT=2020
export VRAM_MODE=balanced
```

#### 4. Start Backend

```bash
cd /path/to/Image-Gallery-2
source .venv/bin/activate
python3 dev_run_backend.py
```

### Frontend Deployment

#### 1. Build Frontend

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Output will be in dist/ folder
```

#### 2. Serve with Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    root /var/www/gallery/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:2020/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Cloud Deployment

### AWS Deployment (EC2 + GPU)

#### 1. Launch EC2 Instance

- **Instance Type:** `g5.xlarge` or higher (NVIDIA A10G GPU)
- **AMI:** Deep Learning AMI (Ubuntu 22.04)
- **Storage:** 100GB+ EBS volume
- **Security Group:** 
  - Port 80 (HTTP)
  - Port 443 (HTTPS)
  - Port 2020 (Backend API)

#### 2. Setup Script

```bash
#!/bin/bash
# Save as setup.sh

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update
sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

# Clone repository
git clone https://github.com/yourusername/Image-Gallery-2.git
cd Image-Gallery-2

# Setup environment
cp .env.example .env
nano .env  # Configure your settings

# Start services
docker-compose up -d

echo "Deployment complete! Access at http://$(curl -s ifconfig.me)"
```

### Google Cloud Platform (GCP)

```bash
# Create VM with GPU
gcloud compute instances create gallery-server \
  --zone=us-central1-a \
  --machine-type=n1-standard-8 \
  --accelerator=type=nvidia-tesla-t4,count=1 \
  --image-family=pytorch-latest-gpu \
  --image-project=deeplearning-platform-release \
  --boot-disk-size=100GB \
  --maintenance-policy=TERMINATE

# SSH and deploy
gcloud compute ssh gallery-server
# ... follow setup steps
```

### Runpod / Lambda Labs

These GPU cloud providers have Docker support built-in:

1. **Create Instance:**
   - Choose GPU (RTX 4090, A100, etc.)
   - Select "Docker" template
   - Open ports: 80, 2020

2. **Deploy:**
```bash
# Upload your code
git clone https://github.com/yourusername/Image-Gallery-2.git
cd Image-Gallery-2

# Run with docker-compose
docker-compose up -d
```

---

## Environment Configuration

### Critical Environment Variables

```bash
# Backend
PORT=2020                          # Backend API port
VRAM_MODE=balanced                 # Options: low, balanced, high
MOONDREAM_MODELS_DIR=/path/to/models
CUDA_VISIBLE_DEVICES=0             # Which GPU to use

# Frontend
VITE_API_BASE_URL=http://localhost:2020

# Optional API Keys
VITE_GEMINI_API_KEY=your_key
VITE_OPENAI_API_KEY=your_key
```

### Model Storage

Models are stored in `MOONDREAM_MODELS_DIR`. The following models are needed:

- `RunDiffusion/Juggernaut-XL-Lightning` (~6GB)
- `cagliostrolab/animagine-xl-3.1` (~6GB)
- `Lykon/dreamshaper-xl-lightning` (~6GB)
- `vikhyatk/moondream2` (~3GB)

**Total:** ~20GB+ storage needed

---

## Troubleshooting

### Backend Won't Start

```bash
# Check GPU
nvidia-smi

# Check CUDA
python3 -c "import torch; print(torch.cuda.is_available())"

# Check logs
docker-compose logs backend

# Restart with verbose logging
LOG_LEVEL=DEBUG docker-compose up backend
```

### Out of Memory Errors

```bash
# Reduce VRAM usage
echo "VRAM_MODE=low" >> .env
docker-compose restart backend

# Or reduce model quality
# Edit rest_server_temp_5.py and set use_4bit=True
```

### Network/CORS Issues

```bash
# Check CORS settings in rest_server_temp_5.py
# Add your domain to allowed origins

# Or use nginx proxy (recommended)
```

### Models Not Loading

```bash
# Verify model path
ls -la $MOONDREAM_MODELS_DIR

# Check permissions
chmod -R 755 $MOONDREAM_MODELS_DIR

# Re-download models
huggingface-cli download RunDiffusion/Juggernaut-XL-Lightning
```

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Models downloaded and accessible
- [ ] GPU drivers installed and working
- [ ] Docker + NVIDIA toolkit installed
- [ ] Firewall rules configured
- [ ] SSL certificate setup (for HTTPS)
- [ ] Backup strategy for user data
- [ ] Monitoring/logging configured
- [ ] Health checks passing
- [ ] CORS configured for your domain

---

## Support

For issues, please check:
- [GitHub Issues](https://github.com/yourusername/Image-Gallery-2/issues)
- [Deployment Logs](./logs)
- Server logs: `docker-compose logs -f`

---

**Last Updated:** December 2025
