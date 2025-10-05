import React, { useState, useEffect } from 'react';
import { FileExplorer } from './FileExplorer';
import { MultiTabEditor } from './MultiTabEditor';
import { ChatPanel } from './ChatPanel';
import { useAppStore } from '../store/app-store';

export const WorkspaceLayout: React.FC = () => {
  const { columnWidths, setColumnWidth } = useAppStore();
  
  const [explorerWidth, setExplorerWidth] = useState(columnWidths.explorer);
  const [chatWidth, setChatWidth] = useState(columnWidths.chat);
  const [isResizingExplorer, setIsResizingExplorer] = useState(false);
  const [isResizingChat, setIsResizingChat] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingExplorer) {
        const newWidth = e.clientX;
        if (newWidth >= 200 && newWidth <= 500) {
          setExplorerWidth(newWidth);
          setColumnWidth('explorer', newWidth);
        }
      }
      
      if (isResizingChat) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 300 && newWidth <= 600) {
          setChatWidth(newWidth);
          setColumnWidth('chat', newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingExplorer(false);
      setIsResizingChat(false);
    };

    if (isResizingExplorer || isResizingChat) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    
    return undefined;
  }, [isResizingExplorer, isResizingChat]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        userSelect: (isResizingExplorer || isResizingChat) ? 'none' : 'auto'
      }}
    >
      {/* File Explorer Column */}
      <div
        style={{
          width: `${explorerWidth}px`,
          position: 'relative',
          flexShrink: 0,
          overflow: 'hidden'
        }}
      >
        <FileExplorer />
        
        {/* Resize Handle */}
        <div
          onMouseDown={() => setIsResizingExplorer(true)}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            cursor: 'col-resize',
            backgroundColor: isResizingExplorer ? '#4a9eff' : 'transparent',
            transition: 'background-color 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            if (!isResizingExplorer) {
              e.currentTarget.style.backgroundColor = '#3a3a3a';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizingExplorer) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        />
      </div>

      {/* Editor Column (flexible) */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          minWidth: 0
        }}
      >
        <MultiTabEditor />
      </div>

      {/* Chat Panel Column */}
      <div
        style={{
          width: `${chatWidth}px`,
          position: 'relative',
          flexShrink: 0,
          overflow: 'hidden'
        }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={() => setIsResizingChat(true)}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            cursor: 'col-resize',
            backgroundColor: isResizingChat ? '#4a9eff' : 'transparent',
            transition: 'background-color 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            if (!isResizingChat) {
              e.currentTarget.style.backgroundColor = '#3a3a3a';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizingChat) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        />
        
        <ChatPanel />
      </div>
    </div>
  );
};
