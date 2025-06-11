const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/build')));

// Health check endpoint for Docker/AWS
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    message: 'DockerHub Auto-Deploy API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    deployments: {
      total: 156,
      successful: 142,
      failed: 14
    }
  });
});

app.get('/api/projects', (req, res) => {
  const projects = [
    {
      id: 1,
      name: 'Frontend Dashboard',
      status: 'deployed',
      lastDeploy: '2024-06-10T14:30:00Z',
      deployments: 25,
      branch: 'main'
    },
    {
      id: 2,
      name: 'API Gateway',
      status: 'building',
      lastDeploy: '2024-06-10T13:45:00Z',
      deployments: 18,
      branch: 'develop'
    },
    {
      id: 3,
      name: 'Database Service',
      status: 'failed',
      lastDeploy: '2024-06-10T12:15:00Z',
      deployments: 12,
      branch: 'hotfix'
    }
  ];
  res.json(projects);
});

app.post('/api/deploy', (req, res) => {
  const { projectId, branch = 'main' } = req.body;
  
  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  // Simulate deployment process
  const deploymentId = `deploy_${Date.now()}_${projectId}`;
  
  setTimeout(() => {
    res.json({
      success: true,
      message: `Deployment initiated successfully`,
      deploymentId,
      projectId,
      branch,
      timestamp: new Date().toISOString(),
      estimatedTime: '3-5 minutes'
    });
  }, 1500);
});

app.get('/api/deployments/:id', (req, res) => {
  const { id } = req.params;
  
  res.json({
    deploymentId: id,
    status: 'completed',
    logs: [
      'Starting deployment...',
      'Building Docker image...',
      'Pushing to DockerHub...',
      'Deploying to EC2...',
      'Health check passed',
      'Deployment successful!'
    ],
    duration: '4m 32s',
    timestamp: new Date().toISOString()
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
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});