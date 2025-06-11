#!/bin/bash

# DockerHub Auto-Deploy Script for EC2

set -e

echo "🚀 Starting DockerHub Auto-Deploy System deployment..."

# Color Codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_IMAGE="vaibhavbhosale1/autodock"
CONTAINER_NAME="autodock"
APP_PORT="5000"
DEPLOY_DIR="$HOME/autodock"

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Prevent running as root
if [[ $EUID -eq 0 ]]; then
    log_error "Do not run this script as root. Use a non-root user with sudo access."
    exit 1
fi

# System update
log_info "Updating packages..."
sudo apt-get update -y

# Docker install (if missing)
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker "$USER"
    log_info "Docker installed. Please log out and log back in, then re-run this script."
    exit 0
fi

# Docker Compose v2 install (if missing)
if ! command -v docker compose &> /dev/null; then
    log_info "Installing Docker Compose v2..."
    sudo curl -SL "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -s /usr/local/bin/docker-compose /usr/local/bin/docker 2>/dev/null || true
fi

# App directory setup
log_info "Creating/cleaning $DEPLOY_DIR..."
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# Stop any existing containers
log_info "Stopping old containers (if any)..."
docker compose down 2>/dev/null || true
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Pull the latest Docker image
log_info "Pulling latest image: $DOCKER_IMAGE"
docker pull "$DOCKER_IMAGE:latest"

# Create docker-compose.yml
log_info "Writing docker-compose.yml..."
cat > docker-compose.yml <<EOF
version: '3.8'

services:
  app:
    image: $DOCKER_IMAGE:latest
    container_name: $CONTAINER_NAME
    ports:
      - "$APP_PORT:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:5000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

networks:
  default:
    name: autodock
EOF

# Launch container
log_info "Launching container..."
docker compose up -d

# Wait & Health check
log_info "Waiting for startup..."
sleep 20

log_info "Checking app health..."
if curl -f "http://localhost:$APP_PORT/api/health" > /dev/null 2>&1; then
    log_info "✅ App is healthy!"
else
    log_error "❌ Health check failed!"
    docker compose logs --tail=50
    exit 1
fi

# Clean up old images
log_info "Cleaning up unused Docker images..."
docker image prune -f

# Setup log rotation
log_info "Setting up log rotation..."
sudo tee /etc/logrotate.d/docker-logs > /dev/null <<EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
EOF

# Done
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com)
log_info "🎉 Deployment complete!"
log_info "🌐 App URL: http://$PUBLIC_IP:$APP_PORT"
log_info "🩺 Health Check: http://$PUBLIC_IP:$APP_PORT/api/health"
