import React from "react";
import "../styles/ProjectManagement.scss";

const ProjectManagement = ({ onSave, onLoad, projectName, audioFileName }) => {
  return (
    <div className="project-management">
      <section className="control-section">
        <div className="project-header-info">
          <h1 className="project-title">{projectName || 'Untitled Project'}</h1>
          {audioFileName && <span className="audio-name">{audioFileName}</span>}
        </div>
      </section>

      <section className="control-section">
        <h3 className="section-title">Project Management</h3>

        <div className="actions-group">
          <button
            onClick={onLoad}
            className="action-button load-button"
            title="Load existing project"
          >
            Load Project
          </button>

          <button
            onClick={onSave}
            className="action-button save-button"
            title="Save current project"
          >
            Save Project
          </button>
        </div>

        <div className="info-message">
          <p>💾 Save your choreography to the database to preserve all formations, dancers, and paths.</p>
          <p>📂 Load previously saved projects to continue working on them.</p>
        </div>
      </section>
    </div>
  );
};

export default ProjectManagement;
