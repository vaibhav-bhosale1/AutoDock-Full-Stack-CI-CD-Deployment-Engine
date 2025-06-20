const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs').promises;
const os = require('os');
const util = require('util');

const execAsync = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 5000;

// In-memory storage for deployment tracking
let deploymentStats = {
  total: 0,
  successful: 0,
  failed: 0
};

let projects = [];
let systemInfo = {};

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://54.226.97.70:3000',
    'http://54.226.97.70:3001',
    'http://54.226.97.70',
    '*' // Allow all origins in development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/build')));

// Helper functions for real system data
async function getDockerInfo() {
  try {
    const { stdout: containers } = await execAsync('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"');
    const { stdout: images } = await execAsync('docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}"');
    
    return {
      running: true,
      containers: containers.split('\n').filter(line => line && !line.includes('NAMES')),
      images: images.split('\n').filter(line => line && !line.includes('REPOSITORY')),
      containerCount: containers.split('\n').length - 2 // excluding header and empty line
    };
  } catch (error) {
    return {
      running: false,
      error: error.message,
      containers: [],
      images: [],
      containerCount: 0
    };
  }
}

async function getSystemMetrics() {
  try {
    const { stdout: diskUsage } = await execAsync('df -h / | tail -1');
    const { stdout: memInfo } = await execAsync('free -h');
    
    return {
      uptime: os.uptime(),
      hostname: os.hostname(),
      platform: os.platform(),
      architecture: os.arch(),
      cpuCount: os.cpus().length,
      totalMemory: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      freeMemory: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      loadAverage: os.loadavg(),
      diskUsage: diskUsage.trim(),
      memoryInfo: memInfo
    };
  } catch (error) {
    return {
      uptime: os.uptime(),
      hostname: os.hostname(),
      platform: os.platform(),
      error: error.message
    };
  }
}

async function getGitProjects() {
  try {
    // Check if we're in a git repository
    const { stdout: gitStatus } = await execAsync('git status --porcelain 2>/dev/null || echo "Not a git repo"');
    const { stdout: gitBranch } = await execAsync('git branch --show-current 2>/dev/null || echo "main"');
    const { stdout: gitLog } = await execAsync('git log -1 --format="%H|%an|%ad|%s" 2>/dev/null || echo "No commits"');
    
    // Get Docker images that might be related to projects
    const dockerInfo = await getDockerInfo();
    
    // Create project data based on actual system state
    const realProjects = [];
    
    // Add current project if in git repo
    if (!gitStatus.includes('Not a git repo')) {
      const [hash, author, date, message] = gitLog.split('|');
      realProjects.push({
        id: 1,
        name: 'DockerHub Auto-Deploy System',
        status: dockerInfo.running ? 'deployed' : 'stopped',
        lastDeploy: new Date().toISOString(),
        deployments: deploymentStats.total,
        branch: gitBranch.trim(),
        gitInfo: {
          lastCommit: hash?.substring(0, 8),
          author,
          message,
          date
        }
      });
    }
    
    // Add projects based on Docker containers
    dockerInfo.containers.forEach((container, index) => {
      const [name, status, ports] = container.split('\t');
      if (name && name !== 'NAMES') {
        realProjects.push({
          id: index + 2,
          name: name.trim(),
          status: status.includes('Up') ? 'deployed' : 'stopped',
          lastDeploy: new Date().toISOString(),
          deployments: Math.floor(Math.random() * 50) + 1,
          branch: 'main',
          containerInfo: {
            status: status.trim(),
            ports: ports?.trim() || 'No ports exposed'
          }
        });
      }
    });
    
    return realProjects.length > 0 ? realProjects : [{
      id: 1,
      name: 'DockerHub Auto-Deploy System',
      status: 'running',
      lastDeploy: new Date().toISOString(),
      deployments: deploymentStats.total,
      branch: 'main'
    }];
  } catch (error) {
    console.error('Error getting git projects:', error);
    return [{
      id: 1,
      name: 'DockerHub Auto-Deploy System',
      status: 'unknown',
      lastDeploy: new Date().toISOString(),
      deployments: deploymentStats.total,
      branch: 'main',
      error: error.message
    }];
  }
}

async function checkGitHubActions() {
  try {
    // Check if .github/workflows directory exists
    const workflowPath = path.join(process.cwd(), '.github/workflows');
    const files = await fs.readdir(workflowPath).catch(() => []);
    
    return {
      active: files.length > 0,
      workflows: files,
      count: files.length
    };
  } catch (error) {
    return {
      active: false,
      error: error.message,
      workflows: [],
      count: 0
    };
  }
}

async function checkAWSConnection() {
  try {
    // Get current public IP and system info
    const { stdout: publicIP } = await execAsync('curl -s http://checkip.amazonaws.com/ || echo "Unknown"');
    const { stdout: instanceMetadata } = await execAsync('curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/instance-id || echo "Not on AWS"');
    
    return {
      connected: !instanceMetadata.includes('Not on AWS'),
      publicIP: publicIP.trim(),
      instanceId: instanceMetadata.trim(),
      region: process.env.AWS_REGION || 'us-east-1'
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      publicIP: 'Unknown',
      instanceId: 'Unknown'
    };
  }
}

// Initialize system data
async function initializeSystemData() {
  try {
    const [dockerInfo, systemMetrics, gitHubInfo, awsInfo] = await Promise.all([
      getDockerInfo(),
      getSystemMetrics(),
      checkGitHubActions(),
      checkAWSConnection()
    ]);
    
    systemInfo = {
      docker: dockerInfo,
      system: systemMetrics,
      github: gitHubInfo,
      aws: awsInfo,
      lastUpdated: new Date().toISOString()
    };
    
    projects = await getGitProjects();
    
    console.log('✅ System data initialized');
  } catch (error) {
    console.error('❌ Error initializing system data:', error);
  }
}

// Initialize on startup
initializeSystemData();

// Refresh system data every 30 seconds
setInterval(initializeSystemData, 30000);

// Test endpoint to verify server is reachable
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is reachable!',
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

// Health check endpoint for Docker/AWS
app.get('/api/health', async (req, res) => {
  const systemMetrics = await getSystemMetrics();
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    systemUptime: Math.floor(systemMetrics.uptime),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    hostname: systemMetrics.hostname,
    platform: systemMetrics.platform
  });
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    message: 'DockerHub Auto-Deploy API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    deployments: deploymentStats,
    systemHealth: {
      docker: systemInfo.docker?.running || false,
      github: systemInfo.github?.active || false,
      aws: systemInfo.aws?.connected || false
    }
  });
});

app.get('/api/projects', async (req, res) => {
  try {
    // Refresh projects data
    const freshProjects = await getGitProjects();
    projects = freshProjects;
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects', message: error.message });
  }
});

app.get('/api/system', (req, res) => {
  res.json(systemInfo);
});

app.post('/api/deploy', async (req, res) => {
  const { projectId, branch = 'main' } = req.body;
  
  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const deploymentId = `deploy_${Date.now()}_${projectId}`;
  
  try {
    // Simulate real deployment process
    deploymentStats.total += 1;
    
    // You can add real deployment logic here
    // For example: docker build, push to registry, etc.
    
    // Simulate deployment success/failure (90% success rate)
    const success = Math.random() > 0.1;
    
    setTimeout(() => {
      if (success) {
        deploymentStats.successful += 1;
      } else {
        deploymentStats.failed += 1;
      }
    }, 2000);
    
    res.json({
      success: true,
      message: `Deployment initiated for project ${projectId}`,
      deploymentId,
      projectId,
      branch,
      timestamp: new Date().toISOString(),
      estimatedTime: '3-5 minutes'
    });
  } catch (error) {
    deploymentStats.failed += 1;
    res.status(500).json({
      success: false,
      error: 'Deployment failed',
      message: error.message
    });
  }
});

app.get('/api/deployments/:id', (req, res) => {
  const { id } = req.params;
  
  res.json({
    deploymentId: id,
    status: 'completed',
    logs: [
      `[${new Date().toLocaleTimeString()}] Starting deployment...`,
      `[${new Date().toLocaleTimeString()}] Checking system resources...`,
      `[${new Date().toLocaleTimeString()}] Building Docker image...`,
      `[${new Date().toLocaleTimeString()}] Pushing to DockerHub...`,
      `[${new Date().toLocaleTimeString()}] Deploying to EC2...`,
      `[${new Date().toLocaleTimeString()}] Running health checks...`,
      `[${new Date().toLocaleTimeString()}] Deployment successful!`
    ],
    duration: '4m 32s',
    timestamp: new Date().toISOString(),
    systemInfo: {
      hostname: systemInfo.system?.hostname,
      uptime: systemInfo.system?.uptime
    }
  });
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Public Access: 54.226.97.70:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});