import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/app-store';
import { Project } from '@shared/types';

export const ProjectDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projects, setProjects, setCurrentProject } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      // Check if electronAPI is available
      if ((window as any).electronAPI?.project?.list) {
        const response = await (window as any).electronAPI.project.list();
        const projectList = response.data || response;
        setProjects(Array.isArray(projectList) ? projectList : []);
      } else {
        console.warn('Electron API not available, using empty project list');
        setProjects([]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openProject = async (project: Project) => {
    try {
      const response = await window.electronAPI.project.open(project.id);
      const openedProject = response.data || response;
      setCurrentProject(openedProject);
      navigate('/editor');
    } catch (error) {
      console.error('Failed to open project:', error);
      alert('Failed to open project. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="project-dashboard">
      <div className="dashboard-header">
        <h1>Welcome to Author</h1>
        <p>Your AI-powered book writing companion</p>
      </div>

      <div className="dashboard-actions">
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateProject(true)}
        >
          Create New Project
        </button>
      </div>

      <div className="recent-projects">
        <h2>Recent Projects</h2>
        {projects.length === 0 ? (
          <div className="empty-state">
            <p>No projects yet. Create your first book project to get started!</p>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project) => (
              <div 
                key={project.id}
                className="project-card"
                onClick={() => openProject(project)}
              >
                <div className="project-header">
                  <h3>{project.name}</h3>
                  <span className="project-date">
                    {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                {project.description && (
                  <p className="project-description">{project.description}</p>
                )}
                <div className="project-stats">
                  <span>📁 {project.path}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateProject && (
        <CreateProjectModal 
          onClose={() => setShowCreateProject(false)}
          onCreated={(project) => {
            setProjects([project, ...projects]);
            setCurrentProject(project);
            setShowCreateProject(false);
            navigate('/editor');
          }}
        />
      )}
    </div>
  );
};

interface CreateProjectModalProps {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [path, setPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectFolder = async () => {
    try {
      const result = await (window as any).electronAPI.dialog.selectFolder();
      if (result && !result.canceled && result.filePaths.length > 0) {
        // Remove any quotes from the path
        const cleanPath = result.filePaths[0].replace(/^["']|["']$/g, '');
        setPath(cleanPath);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !path.trim()) return;

    setIsCreating(true);
    try {
      const response = await window.electronAPI.project.create({
        name: name.trim(),
        description: description.trim() || undefined,
        path: path.trim(),
      });
      
      // Unwrap the IPC response
      const project = response.data || response;
      console.log('Created project:', project);
      onCreated(project);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="btn btn-icon" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-content">
          <div className="form-group">
            <label className="form-label">Project Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Amazing Novel"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-input form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your book..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Project Path</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="Select a folder for your project..."
                required
                readOnly
                style={{ flex: 1 }}
              />
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={selectFolder}
                style={{ whiteSpace: 'nowrap' }}
              >
                📁 Browse
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isCreating || !name.trim() || !path.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
