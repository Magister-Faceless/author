import React from 'react';
import { useAppStore } from '../store/app-store';

export const TitleBar: React.FC = () => {
  const { currentProject } = useAppStore();

  const handleMinimize = () => {
    window.electronAPI?.window.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.window.maximize();
  };

  const handleClose = () => {
    window.electronAPI?.window.close();
  };

  return (
    <div className="title-bar">
      <div className="title-bar-content">
        <div className="title-bar-title">
          Author {currentProject ? `- ${currentProject.name}` : ''}
        </div>
        <div className="title-bar-controls">
          <button 
            className="title-bar-button minimize"
            onClick={handleMinimize}
            title="Minimize"
          >
            ─
          </button>
          <button 
            className="title-bar-button maximize"
            onClick={handleMaximize}
            title="Maximize"
          >
            □
          </button>
          <button 
            className="title-bar-button close"
            onClick={handleClose}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};
