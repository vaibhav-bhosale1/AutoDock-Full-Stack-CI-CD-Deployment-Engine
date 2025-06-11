# AWS EC2 Setup Guide

## 🚀 Step-by-Step AWS EC2 Configuration

### Step 1: Launch EC2 Instance

1. **Log into AWS Console**
   - Go to [AWS Console](https://console.aws.amazon.com)
   - Navigate to EC2 Dashboard

2. **Launch Instance**
   - Click "Launch Instance"
   - **Name**: `dockerhub-auto-deploy-server`
   - **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance Type**: t2.micro (Free tier eligible)
   - **Key Pair**: Create new or use existing
   - **Security Group**: Create new with these rules:
     - SSH (22) - Your IP
     - HTTP (80) - Anywhere
     - Custom TCP (5000) - Anywhere
     - HTTPS (443) - Anywhere

3. **Configure Storage**
   - 8 GB gp2 (Free tier eligible)

4. **Launch Instance**

### Step 2: Connect to Instance

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Update system
sudo apt update && sudo apt upgrade -y

Step 3: Run Deployment Script
bash# Download and run deployment script
curl -fsSL https://raw.githubusercontent.com/your-username/your-repo/main/deployment/deploy.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh
Step 4: Configure Security Group
Inbound Rules:

Type: SSH, Port: 22, Source: My IP
Type: HTTP, Port: 80, Source: 0.0.0.0/0
Type: HTTPS, Port: 443, Source: 0.0.0.0/0
Type: Custom TCP, Port: 5000, Source: 0.0.0.0/0

Step 5: Set Up Elastic IP (Optional)

Go to EC2 → Elastic IPs
Allocate new address
Associate with your instance

Step 6: Configure Domain (Optional)

Buy domain from Route 53 or external provider
Create A record pointing to your Elastic IP
Update nginx.conf with your domain name
Set up SSL with Let's Encrypt:

bashsudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com

### Step 8: GitHub Secrets Configuration

**File: `GITHUB_SECRETS.md`**
```markdown
# GitHub Secrets Setup

## Required Secrets

Add these secrets in your GitHub repository:
Settings → Secrets and variables → Actions → New repository secret

### DockerHub Secrets

1. **DOCKERHUB_USERNAME**
   - Your DockerHub username

2. **DOCKERHUB_TOKEN**
   - Go to DockerHub → Account Settings → Security
   - Create new Access Token
   - Copy the token

### AWS EC2 Secrets

3. **EC2_HOST**
   - Your EC2 instance public IP address

4. **EC2_USERNAME**
   - Usually: `ubuntu` for Ubuntu instances

5. **EC2_SSH_KEY**
   - Your private key content (.pem file)
   - Copy entire content including headers:
-----BEGIN RSA PRIVATE KEY-----
[your key content]
-----END RSA PRIVATE KEY-----

## Testing Secrets

After adding secrets, push to main branch to trigger deployment:

```bash
git add .
git commit -m "Initial deployment setup"
git push origin main

### Step 9: Environment Configuration

**File: `.env.example`**
```env
# Server Configuration
NODE_ENV=production
PORT=5000

# DockerHub Configuration
DOCKER_IMAGE=your-dockerhub-username/dockerhub-auto-deploy
CONTAINER_NAME=dockerhub-auto-deploy

# AWS Configuration
EC2_HOST=your-ec2-ip-address
EC2_USERNAME=ubuntu

# Optional: Database Configuration
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=deploy_db
# DB_USER=deploy_user
# DB_PASS=secure_password

# Optional: Monitoring
# SENTRY_DSN=your-sentry-dsn
# LOG_LEVEL=info