import React, { useState, useEffect } from 'react';
import { choreographyService } from '../services/choreographyService';
import '../styles/LoadProjectModal.scss';

const LoadProjectModal = ({ isOpen, onClose, onLoad }) => {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const projectsList = await choreographyService.listProjects();
      setProjects(projectsList);
    } catch (err) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const projectData = await choreographyService.loadProject(selectedProjectId);
      onLoad(projectData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (projectId, e) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await choreographyService.deleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete project');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content load-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Load Choreography Project</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {isLoading && projects.length === 0 && (
            <div className="loading-message">Loading projects...</div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {!isLoading && projects.length === 0 && !error && (
            <div className="empty-message">
              No saved projects found. Create and save a choreography first.
            </div>
          )}

          {projects.length > 0 && (
            <div className="projects-list">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`project-item ${selectedProjectId === project.id ? 'selected' : ''}`}
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <div className="project-info">
                    <h3>{project.name}</h3>
                    {project.description && (
                      <p className="project-description">{project.description}</p>
                    )}
                    <div className="project-meta">
                      {project.bpm && <span className="bpm">{project.bpm} BPM</span>}
                      <span className="date">Updated: {formatDate(project.updated_at)}</span>
                    </div>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDelete(project.id, e)}
                    title="Delete project"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleLoad}
            disabled={!selectedProjectId || isLoading}
          >
            {isLoading ? 'Loading...' : 'Load Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadProjectModal;
