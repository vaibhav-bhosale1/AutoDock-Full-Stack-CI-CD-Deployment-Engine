import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [status, setStatus] = useState(null);
  const [projects, setProjects] = useState([]);
  const [deployments, setDeployments] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    fetchProjects();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await axios.get('/api/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setLoading(false);
    }
  };

  const handleDeploy = async (projectId) => {
    try {
      const response = await axios.post('/api/deploy', { projectId });
      setDeployments({
        ...deployments,
        [projectId]: response.data
      });
      
      // Refresh projects after deployment
      setTimeout(fetchProjects, 2000);
    } catch (error) {
      console.error('Error deploying:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'deployed': return '#28a745';
      case 'building': return '#ffc107';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>🐳 DockerHub Auto-Deploy System</h1>
        {status && (
          <div className="status-bar">
            <span>Status: Online</span>
            <span>Total Deployments: {status.deployments?.total || 0}</span>
            <span>Success Rate: {status.deployments ? Math.round((status.deployments.successful / status.deployments.total) * 100) : 0}%</span>
          </div>
        )}
      </header>

      <main className="main">
        <section className="projects">
          <h2>Projects</h2>
          <div className="project-grid">
            {projects.map(project => (
              <div key={project.id} className="project-card">
                <div className="project-header">
                  <h3>{project.name}</h3>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(project.status) }}
                  >
                    {project.status}
                  </span>
                </div>
                
                <div className="project-info">
                  <p>Branch: <strong>{project.branch}</strong></p>
                  <p>Deployments: <strong>{project.deployments}</strong></p>
                  <p>Last Deploy: <strong>{new Date(project.lastDeploy).toLocaleString()}</strong></p>
                </div>

                <div className="project-actions">
                  <button 
                    onClick={() => handleDeploy(project.id)}
                    className="deploy-btn"
                    disabled={project.status === 'building'}
                  >
                    {project.status === 'building' ? 'Building...' : 'Deploy'}
                  </button>
                </div>

                {deployments[project.id] && (
                  <div className="deployment-info">
                    <p>✅ {deployments[project.id].message}</p>
                    <p>Deployment ID: {deployments[project.id].deploymentId}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="system-info">
          <h2>System Information</h2>
          <div className="info-grid">
            <div className="info-card">
              <h4>Docker Status</h4>
              <p>✅ Container Running</p>
              <p>🔄 Auto-deploy Active</p>
            </div>
            <div className="info-card">
              <h4>GitHub Actions</h4>
              <p>✅ Workflow Active</p>
              <p>🔗 DockerHub Connected</p>
            </div>
            <div className="info-card">
              <h4>AWS EC2</h4>
              <p>✅ Instance Running</p>
              <p>🌐 Public IP Active</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>DockerHub Auto-Deploy System v1.0.0 | Built with ❤️</p>
      </footer>
    </div>
  );
}

export default App;