import React, { useState, useEffect, useCallback } from 'react';

function App() {
  const [status, setStatus] = useState(null);
  const [projects, setProjects] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [deployments, setDeployments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ------------------------------------------------------------------ */
  /*  🔄 Fetch helpers                                                   */
  /* ------------------------------------------------------------------ */
  const fetchStatus = async () => {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Failed to fetch status');
    setStatus(await res.json());
  };

  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to fetch projects');
    setProjects(await res.json());
  };

  const fetchSystemInfo = async () => {
    const res = await fetch('/api/system');
    if (!res.ok) throw new Error('Failed to fetch system info');
    setSystemInfo(await res.json());
  };

  /* ------------------------------------------------------------------ */
  /*  ✅ Memoised fetch-all to keep ESLint happy                         */
  /* ------------------------------------------------------------------ */
  const fetchAllData = useCallback(async () => {
    try {
      await Promise.all([fetchStatus(), fetchProjects(), fetchSystemInfo()]);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data from server');
    } finally {
      setLoading(false);
    }
  }, []); //  ← no deps, stays stable

  /* ------------------------------------------------------------------ */
  /*  🪝 Effect: initial load + 30-s refresh                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    fetchAllData();                       // first load
    const int = setInterval(fetchAllData, 30_000);
    return () => clearInterval(int);      // cleanup
  }, [fetchAllData]);                     //  ← dependency satisfied ✅

  /* ------------------------------------------------------------------ */
  /*  🚀 Deploy handler                                                  */
  /* ------------------------------------------------------------------ */
  const handleDeploy = async (projectId) => {
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error('Deployment failed');

      const data = await res.json();
      setDeployments((d) => ({ ...d, [projectId]: data }));
      setTimeout(fetchProjects, 2_000);   // refresh list
    } catch (err) {
      console.error('Error deploying:', err);
      alert(`Deployment failed: ${err.message}`);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  💄 Utility helpers                                                */
  /* ------------------------------------------------------------------ */
  const getStatusColor = (s) => {
    switch (s?.toLowerCase()) {
      case 'running':
      case 'deployed':
        return '#28a745';
      case 'building':
        return '#ffc107';
      case 'failed':
      case 'stopped':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const formatUptime = (secs) => {
    const d = Math.floor(secs / 86_400);
    const h = Math.floor((secs % 86_400) / 3_600);
    const m = Math.floor((secs % 3_600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  /* ------------------------------------------------------------------ */
  /*  ⏳ Loading & error states                                         */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div style={styles.centerFull}>
        <div style={{ textAlign: 'center' }}>
          <div style={styles.spinner} />
          <div>Loading system data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerFull}>
        <div style={styles.errorBox}>
          <h3>⚠️ Connection Error</h3>
          <p>{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchAllData();
            }}
            style={styles.retryBtn}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  🎨 Main dashboard                                                 */
  /* ------------------------------------------------------------------ */
  return (
    <div style={styles.page}>
      {/* keyframes for spinner */}
      <style>
        {`@keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }`}
      </style>

      {/* ───────────────── Header ───────────────── */}
      <header style={styles.card}>
        <h1 style={{ margin: '0 0 15px', color: '#333' }}>🐳 DockerHub Auto-Deploy System</h1>
        {status && (
          <div style={styles.statusBar}>
            <span style={{ color: '#28a745', fontWeight: 700 }}>✅ Status: Online</span>
            <span>📊 Total Deployments: {status.deployments?.total ?? 0}</span>
            <span>
              ✅ Success Rate:{' '}
              {status.deployments?.total
                ? Math.round((status.deployments.successful / status.deployments.total) * 100)
                : 0}
              %
            </span>
            <span style={{ fontSize: 12, color: '#666' }}>
              Last Updated: {new Date(status.timestamp).toLocaleString()}
            </span>
          </div>
        )}
      </header>

      {/* ───────────────── Projects ───────────────── */}
      <main>
        <section style={{ marginBottom: 30 }}>
          <h2 style={styles.sectionTitle}>Projects</h2>
          <div style={styles.grid}>
            {projects.map((p) => (
              <div key={p.id} style={styles.card}>
                {/* Project head */}
                <div style={styles.projHead}>
                  <h3 style={{ margin: 0, color: '#333' }}>{p.name}</h3>
                  <span style={{ ...styles.statusChip, background: getStatusColor(p.status) }}>
                    {p.status}
                  </span>
                </div>

                {/* Project meta */}
                <div style={styles.meta}>
                  <p><strong>Branch:</strong> {p.branch}</p>
                  <p><strong>Deployments:</strong> {p.deployments}</p>
                  <p><strong>Last Deploy:</strong> {new Date(p.lastDeploy).toLocaleString()}</p>
                  {p.gitInfo && <p><strong>Last Commit:</strong> {p.gitInfo.lastCommit}</p>}
                  {p.containerInfo && <p><strong>Container:</strong> {p.containerInfo.status}</p>}
                </div>

                {/* Deploy button */}
                <button
                  onClick={() => handleDeploy(p.id)}
                  disabled={p.status === 'building'}
                  style={{
                    ...styles.deployBtn,
                    background: p.status === 'building' ? '#6c757d' : '#007bff',
                    cursor: p.status === 'building' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {p.status === 'building' ? 'Building…' : 'Deploy'}
                </button>

                {/* Deploy result */}
                {deployments[p.id] && (
                  <div style={styles.deployResult}>
                    <p style={{ margin: 0 }}>✅ {deployments[p.id].message}</p>
                    <p style={{ margin: 0, fontSize: 12 }}>ID: {deployments[p.id].deploymentId}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ───────────────── System info ───────────────── */}
        <section>
          <h2 style={styles.sectionTitle}>System Information</h2>
          <div style={styles.grid}>
            {/* Docker */}
            <div style={styles.card}>
              <h4 style={styles.cardTitle}>🐳 Docker Status</h4>
              {systemInfo?.docker ? (
                <>
                  <p style={{ color: systemInfo.docker.running ? '#28a745' : '#dc3545' }}>
                    {systemInfo.docker.running ? '✅ Container Running' : '❌ Container Stopped'}
                  </p>
                  <p>📦 Active Containers: {systemInfo.docker.containerCount}</p>
                  <p>🔄 Auto-deploy: {systemInfo.docker.running ? 'Active' : 'Inactive'}</p>
                </>
              ) : (
                <p style={{ color: '#dc3545' }}>❌ Docker info unavailable</p>
              )}
            </div>

            {/* GitHub */}
            <div style={styles.card}>
              <h4 style={styles.cardTitle}>⚙️ GitHub Actions</h4>
              {systemInfo?.github ? (
                <>
                  <p style={{ color: systemInfo.github.active ? '#28a745' : '#dc3545' }}>
                    {systemInfo.github.active ? '✅ Workflows Active' : '❌ No Workflows'}
                  </p>
                  <p>📋 Workflow Files: {systemInfo.github.count}</p>
                  <p>🔗 DockerHub: {systemInfo.github.active ? 'Connected' : 'Not Connected'}</p>
                </>
              ) : (
                <p style={{ color: '#dc3545' }}>❌ GitHub info unavailable</p>
              )}
            </div>

            {/* AWS */}
            <div style={styles.card}>
              <h4 style={styles.cardTitle}>☁️ AWS EC2</h4>
              {systemInfo?.aws ? (
                <>
                  <p style={{ color: systemInfo.aws.connected ? '#28a745' : '#dc3545' }}>
                    {systemInfo.aws.connected ? '✅ Instance Running' : '❌ Not on AWS'}
                  </p>
                  <p>🌐 Public IP: {systemInfo.aws.publicIP}</p>
                  {systemInfo.aws.instanceId !== 'Unknown' && (
                    <p style={{ fontSize: 12 }}>ID: {systemInfo.aws.instanceId}</p>
                  )}
                </>
              ) : (
                <p style={{ color: '#dc3545' }}>❌ AWS info unavailable</p>
              )}
            </div>

            {/* System */}
            {systemInfo?.system && (
              <div style={styles.card}>
                <h4 style={styles.cardTitle}>💻 System Metrics</h4>
                <p><strong>Hostname:</strong> {systemInfo.system.hostname}</p>
                <p><strong>Platform:</strong> {systemInfo.system.platform}</p>
                <p><strong>CPU Cores:</strong> {systemInfo.system.cpuCount}</p>
                <p>
                  <strong>Memory:</strong> {systemInfo.system.freeMemory} /{' '}
                  {systemInfo.system.totalMemory}
                </p>
                <p><strong>Uptime:</strong> {formatUptime(systemInfo.system.uptime)}</p>
                {systemInfo.system.loadAverage && (
                  <p><strong>Load Avg:</strong> {systemInfo.system.loadAverage.map((n) => n.toFixed(2)).join(', ')}</p>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ───────────────── Footer ───────────────── */}
      <footer style={styles.footer}>
        <p style={{ margin: 0, color: '#666' }}>
          DockerHub Auto-Deploy System v1.0.0 | Built with ❤️ |
          {systemInfo?.system?.hostname && ` Running on ${systemInfo.system.hostname}`}
        </p>
        {systemInfo?.lastUpdated && (
          <p style={{ margin: '5px 0 0', fontSize: 12, color: '#999' }}>
            System data last updated: {new Date(systemInfo.lastUpdated).toLocaleString()}
          </p>
        )}
      </footer>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  ✨ Inline style objects                                            */
/* ──────────────────────────────────────────────────────────────────── */
const styles = {
  page: {
    fontFamily: 'Arial, sans-serif',
    maxWidth: 1200,
    margin: '0 auto',
    padding: 20,
    background: '#f8f9fa',
    minHeight: '100vh',
  },
  card: {
    background: 'white',
    padding: 20,
    borderRadius: 8,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  cardTitle: { margin: '0 0 15px', color: '#333' },
  sectionTitle: { color: '#333', marginBottom: 15 },
  grid: { display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' },
  projHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statusChip: {
    color: '#fff',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'capitalize',
  },
  meta: { marginBottom: 15, fontSize: 14, color: '#666' },
  deployBtn: {
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 4,
    width: '100%',
  },
  deployResult: {
    background: '#d4edda',
    color: '#155724',
    padding: 10,
    borderRadius: 4,
    fontSize: 14,
    marginTop: 15,
  },
  statusBar: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap',
    background: '#e9ecef',
    padding: 15,
    borderRadius: 6,
  },
  centerFull: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'Arial, sans-serif',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    width: 40,
    height: 40,
    animation: 'spin 2s linear infinite',
    margin: '0 auto 20px',
  },
  errorBox: {
    background: '#f8d7da',
    color: '#721c24',
    padding: 20,
    borderRadius: 8,
    textAlign: 'center',
  },
  retryBtn: {
    background: '#dc3545',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 4,
    cursor: 'pointer',
  },
  footer: {
    textAlign: 'center',
    marginTop: 40,
    padding: 20,
    background: 'white',
    borderRadius: 8,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
};

export default App;
