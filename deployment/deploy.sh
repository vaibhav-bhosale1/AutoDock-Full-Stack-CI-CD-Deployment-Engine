#!/bin/bash

# DockerHub Auto-Deploy System - Deployment Script
# Run this script on your EC2 instance

set -e

echo "🚀 Starting DockerHub Auto-Deploy System deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_IMAGE="your-dockerhub-username/dockerhub-auto-deploy"
CONTAINER_NAME="dockerhub-auto-deploy"
APP_PORT="5000"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    log_error "This script should not be run as root for security reasons."
    exit 1
fi

# Update system packages
log_info "Updating system packages..."
sudo apt-get update

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    log_info "Docker installed. Please log out and log back in, then run this script again."
    exit 0
fi

# Install Docker Compose v2 if not installed
if ! command -v docker compose &> /dev/null; then
    log_info "Installing Docker Compose v2..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -s /usr/local/bin/docker-compose /usr/local/bin/docker 2>/dev/null || true
fi

# Create application directory
log_info "Setting up application directory..."
mkdir -p ~/dockerhub-auto-deploy
cd ~/dockerhub-auto-deploy

# Stop existing containers
log_info "Stopping existing containers..."
docker compose down 2>/dev/null || true
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Pull latest image
log_info "Pulling latest Docker image..."
docker pull "$DOCKER_IMAGE:latest"

# Create production docker-compose.yml
log_info "Creating production configuration..."
cat > docker-compose.yml << EOF
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
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  default:
    name: dockerhub-auto-deploy-network
EOF

# Start containers
log_info "Starting application containers..."
docker compose up -d

# Wait for application to start
log_info "Waiting for application to start..."
sleep 30

# Health check
log_info "Performing health check..."
if curl -f "http://localhost:$APP_PORT/api/health" > /dev/null 2>&1; then
    log_info "✅ Application is healthy!"
else
    log_error "❌ Health check failed!"
    log_info "Container logs:"
    docker compose logs --tail=50
    exit 1
fi

# Clean up old images
log_info "Cleaning up old Docker images..."
docker image prune -f

# Setup log rotation
log_info "Setting up log rotation..."
sudo tee /etc/logrotate.d/docker-logs > /dev/null << EOF
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

log_info "🎉 Deployment completed successfully!"
log_info "Application is running at: http://$(curl -s http://checkip.amazonaws.com):$APP_PORT"
log_info "Health endpoint: http://$(curl -s http://checkip.amazonaws.com):$APP_PORT/api/health"
