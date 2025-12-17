#!/bin/bash
# ============================================
# Image Gallery 2 - Quick Deployment Script
# ============================================

set -e

echo "🚀 Image Gallery 2 - Deployment Setup"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo ""
echo "📋 Checking Prerequisites..."

# Check Docker
if ! command_exists docker; then
    echo -e "${YELLOW}Docker not found. Installing...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker found${NC}"
fi

# Check Docker Compose
if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    echo -e "${YELLOW}Docker Compose not found. Installing...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✓ Docker Compose found${NC}"
fi

# Check NVIDIA GPU
if ! command_exists nvidia-smi; then
    echo -e "${RED}✗ NVIDIA GPU drivers not found${NC}"
    echo "Please install NVIDIA drivers first: https://www.nvidia.com/Download/index.aspx"
    exit 1
else
    echo -e "${GREEN}✓ NVIDIA GPU found:${NC}"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader | head -1
fi

# Check NVIDIA Container Toolkit
if ! docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi >/dev/null 2>&1; then
    echo -e "${YELLOW}NVIDIA Container Toolkit not found. Installing...${NC}"
    
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
    curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
        sudo tee /etc/apt/sources.list.d/nvidia-docker.list
    
    sudo apt-get update
    sudo apt-get install -y nvidia-docker2
    sudo systemctl restart docker
    
    echo -e "${GREEN}✓ NVIDIA Container Toolkit installed${NC}"
else
    echo -e "${GREEN}✓ NVIDIA Container Toolkit found${NC}"
fi

# Environment setup
echo ""
echo "⚙️  Setting up environment..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}Created .env file. Please edit it with your configuration:${NC}"
    echo "  nano .env"
    echo ""
    read -p "Press Enter when you've configured .env..."
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Load environment
set -a
source .env
set +a

# Check models directory
echo ""
echo "📦 Checking models..."

if [ -z "$MOONDREAM_MODELS_DIR" ]; then
    echo -e "${RED}✗ MOONDREAM_MODELS_DIR not set in .env${NC}"
    exit 1
fi

if [ ! -d "$MOONDREAM_MODELS_DIR" ]; then
    echo -e "${YELLOW}Models directory not found. Creating...${NC}"
    mkdir -p "$MOONDREAM_MODELS_DIR"
    echo -e "${YELLOW}⚠️  Models directory created but empty.${NC}"
    echo "You'll need to download models. See DEPLOYMENT.md for details."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ Models directory exists${NC}"
    echo "  Path: $MOONDREAM_MODELS_DIR"
    echo "  Size: $(du -sh $MOONDREAM_MODELS_DIR | cut -f1)"
fi

# Build images
echo ""
echo "🏗️  Building Docker images..."
echo "This may take 10-20 minutes on first run..."

docker-compose build

echo -e "${GREEN}✓ Images built successfully${NC}"

# Start services
echo ""
echo "🚀 Starting services..."

docker-compose up -d

# Wait for health check
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check status
BACKEND_STATUS=$(docker-compose ps backend | grep -c "Up" || true)
FRONTEND_STATUS=$(docker-compose ps frontend | grep -c "Up" || true)

if [ $BACKEND_STATUS -eq 1 ] && [ $FRONTEND_STATUS -eq 1 ]; then
    echo -e "${GREEN}✓ All services are running!${NC}"
    echo ""
    echo "🎉 Deployment Complete!"
    echo "================================"
    echo ""
    echo "Frontend:  http://localhost"
    echo "Backend:   http://localhost:2020"
    echo ""
    echo "To view logs:"
    echo "  docker-compose logs -f"
    echo ""
    echo "To stop:"
    echo "  docker-compose down"
    echo ""
else
    echo -e "${RED}✗ Some services failed to start${NC}"
    echo "Check logs with: docker-compose logs"
    exit 1
fi
