import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/app-store';

export const MultiTabEditor: React.FC = () => {
  const {
    openTabs,
    setActiveTab,
    closeTab,
    updateTabContent,
    markTabDirty,
    getActiveTab
  } = useAppStore();

  const activeTab = getActiveTab();
  const [localContent, setLocalContent] = useState('');

  useEffect(() => {
    if (activeTab) {
      setLocalContent(activeTab.content);
    }
  }, [activeTab?.id]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    
    if (activeTab) {
      updateTabContent(activeTab.id, newContent);
      markTabDirty(activeTab.id, true);
    }
  };

  const handleSave = async () => {
    if (!activeTab) return;

    try {
      await (window as any).electronAPI.file.write(activeTab.filePath, activeTab.content);
      markTabDirty(activeTab.id, false);
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file');
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = openTabs.find(t => t.id === tabId);
    
    if (tab?.isDirty) {
      if (!confirm(`${tab.fileName} has unsaved changes. Close anyway?`)) {
        return;
      }
    }
    
    closeTab(tabId);
  };

  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getLineCount = (text: string): number => {
    return text.split('\n').length;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#1e1e1e',
      color: '#cccccc',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        backgroundColor: '#252526',
        borderBottom: '1px solid #3a3a3a',
        overflowX: 'auto',
        flexShrink: 0
      }}>
        {openTabs.length === 0 ? (
          <div style={{
            padding: '8px 16px',
            fontSize: '13px',
            color: '#888'
          }}>
            No files open
          </div>
        ) : (
          openTabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                backgroundColor: tab.isActive ? '#1e1e1e' : 'transparent',
                borderRight: '1px solid #3a3a3a',
                borderTop: tab.isActive ? '2px solid #4a9eff' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                transition: 'background-color 0.1s'
              }}
              onMouseEnter={(e) => {
                if (!tab.isActive) e.currentTarget.style.backgroundColor = '#2a2a2a';
              }}
              onMouseLeave={(e) => {
                if (!tab.isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ marginRight: '8px' }}>
                {tab.isDirty ? '● ' : ''}{tab.fileName}
              </span>
              <button
                onClick={(e) => handleCloseTab(e, tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '0 4px',
                  fontSize: '16px',
                  lineHeight: 1
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#cccccc'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Editor Area */}
      {activeTab ? (
        <>
          {/* Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px',
            backgroundColor: '#252526',
            borderBottom: '1px solid #3a3a3a',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', gap: '16px', color: '#888' }}>
              <span>{activeTab.fileName}</span>
              {activeTab.isDirty && <span style={{ color: '#f48771' }}>● Unsaved</span>}
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span>{getWordCount(activeTab.content)} words</span>
              <span>{getLineCount(activeTab.content)} lines</span>
              <button
                onClick={handleSave}
                disabled={!activeTab.isDirty}
                style={{
                  padding: '4px 12px',
                  backgroundColor: activeTab.isDirty ? '#4a9eff' : '#3a3a3a',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#ffffff',
                  cursor: activeTab.isDirty ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  opacity: activeTab.isDirty ? 1 : 0.5
                }}
              >
                Save
              </button>
            </div>
          </div>

          {/* Text Editor */}
          <textarea
            value={localContent}
            onChange={handleContentChange}
            spellCheck={true}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: '#1e1e1e',
              color: '#cccccc',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: "'Consolas', 'Courier New', monospace",
              fontSize: '14px',
              lineHeight: '1.6'
            }}
            placeholder="Start writing..."
          />
        </>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
          fontSize: '14px'
        }}>
          <div style={{ marginBottom: '16px', fontSize: '48px' }}>📝</div>
          <div>No file selected</div>
          <div style={{ fontSize: '12px', marginTop: '8px' }}>
            Open a file from the explorer to start editing
          </div>
        </div>
      )}
    </div>
  );
};
