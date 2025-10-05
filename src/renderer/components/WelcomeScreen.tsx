import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/app-store';
import { Project } from '@shared/types';

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentProject } = useAppStore();
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadRecentProjects();
  }, []);

  const loadRecentProjects = async () => {
    try {
      const response = await (window as any).electronAPI.project.list();
      const projects = response.data || response;
      setRecentProjects(Array.isArray(projects) ? projects.slice(0, 5) : []);
    } catch (error) {
      console.error('Failed to load recent projects:', error);
    }
  };

  const handleOpenFolder = async () => {
    try {
      const result = await (window as any).electronAPI.dialog.selectFolder();
      if (result && !result.canceled && result.filePaths.length > 0) {
        const folderPath = result.filePaths[0].replace(/^["']|["']$/g, '');
        const projectName = folderPath.split(/[/\\]/).pop() || 'Untitled';
        
        // Try to find existing project with this path
        const projectsResponse = await (window as any).electronAPI.project.list();
        const allProjects = Array.isArray(projectsResponse.data) ? projectsResponse.data : 
                           Array.isArray(projectsResponse) ? projectsResponse : [];
        const existingProject = allProjects.find((p: any) => p.path === folderPath);
        
        if (existingProject) {
          // Open existing project
          const response = await (window as any).electronAPI.project.open(existingProject.id);
          if (response.success === false) {
            throw new Error(response.error || 'Failed to open project');
          }
          const project = response.data || response;
          setCurrentProject(project);
          navigate('/workspace');
        } else {
          // Create new project
          const response = await (window as any).electronAPI.project.create({
            name: projectName,
            description: '',
            path: folderPath,
          });
          
          if (response.success === false) {
            throw new Error(response.error || 'Failed to create project');
          }
          
          const project = response.data || response;
          setCurrentProject(project);
          navigate('/workspace');
        }
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
      alert(`Failed to open folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleOpenRecent = async (project: Project) => {
    try {
      const response = await (window as any).electronAPI.project.open(project.id);
      const openedProject = response.data || response;
      setCurrentProject(openedProject);
      navigate('/workspace');
    } catch (error) {
      console.error('Failed to open project:', error);
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#1e1e1e',
      color: '#cccccc',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        {/* Logo/Title */}
        <h1 style={{
          fontSize: '48px',
          fontWeight: 300,
          marginBottom: '60px',
          color: '#cccccc'
        }}>
          Author
        </h1>

        {/* Getting Started Section */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 400,
            color: '#888',
            marginBottom: '20px'
          }}>
            Getting started with Author
          </h2>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '300px' }}>
            <button
              onClick={handleOpenFolder}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '4px',
                color: '#cccccc',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
            >
              <span>📁 Open Folder</span>
              <span style={{ color: '#888', fontSize: '12px' }}>Ctrl+O</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '4px',
                color: '#cccccc',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
            >
              <span>✨ Generate a New Project</span>
              <span style={{ color: '#888', fontSize: '12px' }}>Ctrl+N</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Projects Sidebar */}
      {recentProjects.length > 0 && (
        <div style={{
          width: '300px',
          backgroundColor: '#252526',
          borderLeft: '1px solid #3a3a3a',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#888',
            marginBottom: '16px'
          }}>
            Recent Projects
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleOpenRecent(project)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '4px',
                  color: '#cccccc',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a2a2a';
                  e.currentTarget.style.borderColor = '#3a3a3a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                  {project.name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#888',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%'
                }}>
                  {project.path}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={loadRecentProjects}
            style={{
              marginTop: '16px',
              padding: '8px',
              width: '100%',
              backgroundColor: 'transparent',
              border: '1px solid #3a3a3a',
              borderRadius: '4px',
              color: '#888',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Show More...
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(project) => {
            setCurrentProject(project);
            setShowCreateModal(false);
            navigate('/workspace');
          }}
        />
      )}
    </div>
  );
};

// Simple Create Project Modal
interface CreateProjectModalProps {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectFolder = async () => {
    try {
      const result = await (window as any).electronAPI.dialog.selectFolder();
      if (result && !result.canceled && result.filePaths.length > 0) {
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
      const response = await (window as any).electronAPI.project.create({
        name: name.trim(),
        description: '',
        path: path.trim(),
      });
      
      const project = response.data || response;
      onCreated(project);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#2a2a2a',
        border: '1px solid #3a3a3a',
        borderRadius: '8px',
        padding: '24px',
        width: '400px',
        maxWidth: '90%'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>
          Create New Project
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Novel"
              required
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#1e1e1e',
                border: '1px solid #3a3a3a',
                borderRadius: '4px',
                color: '#cccccc',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              Location
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={path}
                readOnly
                placeholder="Select a folder..."
                required
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: '#1e1e1e',
                  border: '1px solid #3a3a3a',
                  borderRadius: '4px',
                  color: '#cccccc',
                  fontSize: '14px'
                }}
              />
              <button
                type="button"
                onClick={selectFolder}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3a3a3a',
                  border: '1px solid #4a4a4a',
                  borderRadius: '4px',
                  color: '#cccccc',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Browse
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid #3a3a3a',
                borderRadius: '4px',
                color: '#cccccc',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim() || !path.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4a9eff',
                border: 'none',
                borderRadius: '4px',
                color: '#ffffff',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isCreating || !name.trim() || !path.trim() ? 0.5 : 1
              }}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
