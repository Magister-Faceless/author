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
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#1e1e1e',
        userSelect: (isResizingExplorer || isResizingChat) ? 'none' : 'auto'
      }}
    >
      {/* Buffer Area (spacing from top) */}
      <div style={{ height: '12px', flexShrink: 0 }} />
      
      {/* Main Content Area with Cards */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          padding: '0 12px 12px 12px',
          gap: '12px',
          overflow: 'hidden'
        }}
      >
        {/* File Explorer Card */}
        <div
          style={{
            width: `${explorerWidth}px`,
            position: 'relative',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: '#252526',
              border: '1px solid #3c3c3c',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <FileExplorer />
          </div>
          
          {/* Resize Handle */}
          <div
            onMouseDown={() => setIsResizingExplorer(true)}
            style={{
              position: 'absolute',
              right: -6,
              top: 0,
              bottom: 0,
              width: '12px',
              cursor: 'col-resize',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              const indicator = e.currentTarget.querySelector('.resize-indicator') as HTMLElement;
              if (indicator && !isResizingExplorer) {
                indicator.style.backgroundColor = '#4a9eff';
              }
            }}
            onMouseLeave={(e) => {
              const indicator = e.currentTarget.querySelector('.resize-indicator') as HTMLElement;
              if (indicator && !isResizingExplorer) {
                indicator.style.backgroundColor = '#3a3a3a';
              }
            }}
          >
            <div
              className="resize-indicator"
              style={{
                width: '3px',
                height: '40px',
                backgroundColor: isResizingExplorer ? '#4a9eff' : '#3a3a3a',
                borderRadius: '2px',
                transition: 'background-color 0.2s'
              }}
            />
          </div>
        </div>

        {/* Editor Card (flexible) */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: '#252526',
              border: '1px solid #3c3c3c',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <MultiTabEditor />
          </div>
        </div>

        {/* Chat Panel Card */}
        <div
          style={{
            width: `${chatWidth}px`,
            position: 'relative',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: '#252526',
              border: '1px solid #3c3c3c',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <ChatPanel />
          </div>
          
          {/* Resize Handle */}
          <div
            onMouseDown={() => setIsResizingChat(true)}
            style={{
              position: 'absolute',
              left: -6,
              top: 0,
              bottom: 0,
              width: '12px',
              cursor: 'col-resize',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              const indicator = e.currentTarget.querySelector('.resize-indicator') as HTMLElement;
              if (indicator && !isResizingChat) {
                indicator.style.backgroundColor = '#4a9eff';
              }
            }}
            onMouseLeave={(e) => {
              const indicator = e.currentTarget.querySelector('.resize-indicator') as HTMLElement;
              if (indicator && !isResizingChat) {
                indicator.style.backgroundColor = '#3a3a3a';
              }
            }}
          >
            <div
              className="resize-indicator"
              style={{
                width: '3px',
                height: '40px',
                backgroundColor: isResizingChat ? '#4a9eff' : '#3a3a3a',
                borderRadius: '2px',
                transition: 'background-color 0.2s'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
