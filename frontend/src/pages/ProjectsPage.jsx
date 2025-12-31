import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { choreographyService } from '../services/choreographyService';
import UserMenu from '../components/UserMenu';
import '../styles/ProjectsPage.scss';

const ProjectsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await choreographyService.listProjects();
      setProjects(data || []);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleNewProject = () => {
    navigate('/upload');
  };

  const handleOpenProject = async (projectId) => {
    try {
      setLoading(true);
      const projectData = await choreographyService.loadProject(projectId);

      // Fetch audio file if URL exists
      let audioFile = null;
      if (projectData.audioFileUrl) {
        try {
          const response = await fetch(projectData.audioFileUrl);
          const blob = await response.blob();
          audioFile = new File([blob], projectData.audioFileName || 'audio.mp3', {
            type: blob.type || 'audio/mpeg',
          });
        } catch (audioError) {
          console.error('Failed to load audio file:', audioError);
          alert('Project loaded, but audio file could not be retrieved.');
        }
      }

      // Navigate to waveform with all project data just like UploadPage does
      navigate('/waveform', {
        state: {
          audioFile: audioFile,
          bpm: projectData.bpm,
          beatTimestamps: projectData.beatTimestamps,
          customGroups: projectData.customGroups,
          // Pass additional data for pre-loading the project
          loadedProject: {
            id: projectData.id,
            name: projectData.name,
            description: projectData.description,
            dancers: projectData.dancers,
            formations: projectData.formations,
          }
        },
      });
    } catch (err) {
      console.error('Error loading project:', err);
      alert('Failed to load project: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    if (!window.confirm(`Are you sure you want to delete "${projectName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await choreographyService.deleteProject(projectId);
      // Reload projects list
      await loadProjects();
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project: ' + (err.message || 'Unknown error'));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="projects-page">
      <header className="projects-header">
        <div className="header-left">
          <div className="user-badge">
            <div className="user-initial">{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
            <span className="user-name">{user?.email?.split('@')[0] || 'User'}</span>
          </div>
          <h1 className="page-title">Home</h1>
        </div>
        <div className="header-actions">
          <UserMenu />
        </div>
      </header>

      <div className="projects-content">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <button className="nav-item active">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
              </svg>
              Home
            </button>
            <button className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
              </svg>
              My Projects
            </button>
            <button className="nav-item disabled">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
              </svg>
              Shared With Me
              <span className="coming-soon">Soon</span>
            </button>
          </nav>

          <div className="sidebar-actions">
            <button className="new-project-button" onClick={handleNewProject}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
              New project
            </button>
            <button className="new-performance-button" onClick={handleNewProject}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd"/>
              </svg>
              New performance
            </button>
          </div>
        </aside>

        <main className="main-content">
          {/* Recent Projects Section */}
          {projects.length > 0 && (
            <section className="projects-section">
              <h2 className="section-title">Recents</h2>
              <div className="projects-grid">
                <button className="project-card new-project-card" onClick={handleNewProject}>
                  <div className="card-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M12 3.75a1 1 0 011 1v6.5h6.5a1 1 0 110 2h-6.5v6.5a1 1 0 11-2 0v-6.5h-6.5a1 1 0 110-2h6.5v-6.5a1 1 0 011-1z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="card-label">New performance</span>
                </button>

                {projects.slice(0, 5).map((project) => (
                  <div key={project.id} className="project-card">
                    <button
                      className="card-preview"
                      onClick={() => handleOpenProject(project.id)}
                    >
                      <div className="preview-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                        </svg>
                      </div>
                    </button>
                    <div className="card-info">
                      <button
                        className="card-title"
                        onClick={() => handleOpenProject(project.id)}
                      >
                        {project.name || 'Untitled Dance'}
                      </button>
                      <div className="card-meta">
                        <span className="card-date">Edited {formatDate(project.updated_at)}</span>
                      </div>
                    </div>
                    <button
                      className="card-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id, project.name || 'Untitled Dance');
                      }}
                      title="Delete project"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M5.5 3a.5.5 0 01.5-.5h4a.5.5 0 01.5.5V4h2.5a.5.5 0 010 1h-.441l-.443 8.002A1 1 0 0111.175 14H4.825a1 1 0 01-.996-.998L3.441 5H3a.5.5 0 010-1h2.5V3zm1 1V3h3v1H6.5zM5.441 5l.429 7.732a.1.1 0 00.1.1h4.46a.1.1 0 00.1-.1L10.959 5H5.441z" clipRule="evenodd"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {!loading && projects.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
              </div>
              <h2>No projects yet</h2>
              <p>Create your first choreography project to get started</p>
              <button className="cta-button" onClick={handleNewProject}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                </svg>
                Create New Project
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading your projects...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={loadProjects}>Try Again</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProjectsPage;
