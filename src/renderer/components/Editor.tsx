import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/app-store';

export const Editor: React.FC = () => {
  const { currentProject, editorState, setEditorState } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadInitialContent();
    }
  }, [currentProject]);

  const loadInitialContent = async () => {
    if (!currentProject) return;
    
    setIsLoading(true);
    try {
      // Try to load the first chapter or create new content
      const firstChapterPath = `${currentProject.path}/chapters/chapter-01.md`;
      const content = await window.electronAPI.file.read(firstChapterPath);
      setEditorState({ content, isDirty: false });
    } catch (error) {
      // File doesn't exist, start with empty content
      setEditorState({ 
        content: '# Chapter 1\n\nStart writing your story here...', 
        isDirty: false 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setEditorState({ 
      content: newContent, 
      isDirty: true 
    });
  };

  const saveContent = async () => {
    if (!currentProject || !editorState.isDirty) return;

    try {
      const filePath = `${currentProject.path}/chapters/chapter-01.md`;
      await window.electronAPI.file.write(filePath, editorState.content);
      setEditorState({ 
        isDirty: false, 
        lastSaved: new Date() 
      });
    } catch (error) {
      console.error('Failed to save content:', error);
      alert('Failed to save file. Please try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveContent();
    }
  };

  if (!currentProject) {
    return (
      <div className="editor-empty">
        <h2>No Project Open</h2>
        <p>Please open or create a project to start writing.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="editor-loading">
        <div className="loading-spinner"></div>
        <p>Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <span className="file-name">chapter-01.md</span>
          {editorState.isDirty && <span className="dirty-indicator">●</span>}
        </div>
        <div className="toolbar-right">
          <span className="word-count">
            {(editorState.content || '').toString().split(/\s+/).filter(word => word.length > 0).length} words
          </span>
          <button 
            className="btn btn-primary btn-sm"
            onClick={saveContent}
            disabled={!editorState.isDirty}
          >
            Save
          </button>
        </div>
      </div>

      <div className="editor-content">
        <textarea
          className="editor-textarea"
          value={editorState.content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Start writing your story..."
          spellCheck={true}
        />
      </div>

      <div className="editor-status">
        <span>
          Last saved: {editorState.lastSaved.toLocaleTimeString()}
        </span>
        <span>
          Cursor: Line {(editorState.content || '').toString().substring(0, editorState.cursorPosition).split('\n').length}
        </span>
      </div>
    </div>
  );
};
