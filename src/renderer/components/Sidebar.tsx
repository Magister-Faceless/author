import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/app-store';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { currentProject, setSidebarVisible } = useAppStore();

  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/editor', label: 'Editor', icon: '✏️' },
    { path: '/outline', label: 'Outline', icon: '📋' },
    { path: '/characters', label: 'Characters', icon: '👥' },
    { path: '/research', label: 'Research', icon: '🔍' },
    { path: '/analytics', label: 'Analytics', icon: '📊' },
  ];

  const toggleSidebar = () => {
    setSidebarVisible(false);
  };

  return (
    <div className="sidebar">
      <div className="nav-header">
        <h1>Author</h1>
        <button 
          className="btn btn-icon"
          onClick={toggleSidebar}
          title="Toggle Sidebar"
        >
          ◀
        </button>
      </div>

      {currentProject && (
        <div className="project-info">
          <div className="project-name">{currentProject.name}</div>
          <div className="project-path">{currentProject.path}</div>
        </div>
      )}

      <nav className="nav-menu">
        {navigationItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="quick-actions">
          <button className="btn btn-primary btn-sm">
            New Project
          </button>
          <button className="btn btn-secondary btn-sm">
            Open Project
          </button>
        </div>
      </div>
    </div>
  );
};
