# 🐳 Autodock Auto-Deploy System

Complete CI/CD pipeline with Docker, GitHub Actions, and AWS EC2 deployment

you can view  pipeline at https://github.com/vaibhav-bhosale1/AutoDock-Full-Stack-CI-CD-Deployment-Engine/actions/runs/15603376044

## 🚀 Features

- **Full-Stack Application**: Node.js backend + React frontend
- **Docker Containerization**: Multi-stage optimized builds
- **CI/CD Pipeline**: Automated testing, building, and deployment
- **AWS EC2 Deployment**: Production-ready server setup
- **Health Monitoring**: Built-in health checks and monitoring
- **Zero-Downtime Deployment**: Rolling updates with health verification

## 📋 Prerequisites

- GitHub account
- DockerHub account
- AWS account (free tier)
- Domain name (optional)

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone https://github.com/vaibhav-bhosale1/AutoDock-Full-Stack-CI-CD-Deployment
cd AutoDock-Full-Stack-CI-CD-Deployment

2. Install Dependencies
bashnpm run install-all
3. Local Development
bashnpm run dev
4. Set Up GitHub Secrets
See GITHUB_SECRETS.md for detailed instructions.
5. Deploy to AWS
See AWS_SETUP.md for EC2 configuration.

🏗️ Architecture

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Repo   │───▶│  GitHub Actions  │───▶│   DockerHub     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        │
                       ┌──────────────────┐             │
                       │   Run Tests      │             │
                       └──────────────────┘             │
                                │                        │
                                ▼                        │
                       ┌──────────────────┐             │
                       │   Build Image    │             │
                       └──────────────────┘             │
                                │                        │
                                ▼                        │
                       ┌──────────────────┐    ┌────────▼────────┐
                       │   Deploy to EC2  │───▶│   AWS EC2       │
                      └──────────────────┘    └─────────────────┘

🔧 Tech Stack

Frontend: React 18, Axios
Backend: Node.js, Express
Containerization: Docker, Docker Compose
CI/CD: GitHub Actions
Cloud: AWS EC2
Reverse Proxy: Nginx
Process Manager: PM2

📝 API Endpoints

GET /api/health - Health check
GET /api/status - System status
GET /api/projects - List projects
POST /api/deploy - Trigger deployment
GET /api/deployments/:id - Deployment details

🚀 Deployment
Push to main branch triggers automatic deployment:
bashgit add .
git commit -m "Deploy changes"
git push origin main
📊 Monitoring

Health checks: /api/health
Container logs: docker-compose logs
System metrics: Built-in monitoring dashboard

🔒 Security

Non-root Docker containers
Security headers via Nginx
Rate limiting
Input validation
Regular security updates

🤝 Contributing

Fork the repository
Create feature branch
Commit changes
Push to branch
Open pull request

📄 License
MIT License - see LICENSE file for details.

## 🎯 Quick Start Commands

After setting up the project structure:

```bash
# 1. Install all dependencies
npm run install-all

# 2. Start development server
npm run dev

# 3. Build for production
npm run build

# 4. Test Docker build locally
docker build -t autodock .
docker run -p 5000:5000 autodock

# 5. Deploy to production (via GitHub Actions)
git add .
git commit -m "Initial deployment"
git push origin main
🔧 Customization

Update DockerHub username in:

.github/workflows/deploy.yml
deployment/deploy.sh
Environment variables


Modify application:

Backend: server/index.js
Frontend: client/src/App.js
Styles: client/src/App.css


Configure domain:

Update nginx.conf
Set up SSL certificates
Configure DNS records



📱 Live Demo
After deployment, your app will be available at:

http://your-ec2-ip:5000 - Main application
http://your-ec2-ip:5000/api/health - Health check
http://your-ec2-ip:5000/api/status - API status
