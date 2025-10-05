import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatPanel } from './ChatPanel';
import { TitleBar } from './TitleBar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [agentPanelWidth, setAgentPanelWidth] = useState(350);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingAgent, setIsResizingAgent] = useState(false);

  const handleSidebarResize = (e: React.MouseEvent) => {
    if (!isResizingSidebar) return;
    const newWidth = e.clientX;
    if (newWidth >= 200 && newWidth <= 500) {
      setSidebarWidth(newWidth);
    }
  };

  const handleAgentResize = (e: React.MouseEvent) => {
    if (!isResizingAgent) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 300 && newWidth <= 600) {
      setAgentPanelWidth(newWidth);
    }
  };

  const stopResize = () => {
    setIsResizingSidebar(false);
    setIsResizingAgent(false);
  };

  React.useEffect(() => {
    const cleanup = () => {
      document.removeEventListener('mouseup', stopResize);
    };
    
    if (isResizingSidebar || isResizingAgent) {
      document.addEventListener('mouseup', stopResize);
      return cleanup;
    }
    
    return undefined;
  }, [isResizingSidebar, isResizingAgent]);

  return (
    <div 
      className="layout"
      onMouseMove={(e) => {
        handleSidebarResize(e);
        handleAgentResize(e);
      }}
      style={{ userSelect: (isResizingSidebar || isResizingAgent) ? 'none' : 'auto' }}
    >
      <TitleBar />
      <div className="main-layout" style={{ display: 'flex', height: 'calc(100vh - 32px)' }}>
        {/* Sidebar - Always visible, resizable */}
        <div style={{ width: `${sidebarWidth}px`, position: 'relative', flexShrink: 0 }}>
          <Sidebar />
          <div
            onMouseDown={() => setIsResizingSidebar(true)}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              cursor: 'col-resize',
              backgroundColor: isResizingSidebar ? '#4a9eff' : 'transparent',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isResizingSidebar) {
                e.currentTarget.style.backgroundColor = '#3a3a3a';
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizingSidebar) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          />
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <main className="editor-area" style={{ flex: 1, overflow: 'auto' }}>
            {children}
          </main>
        </div>

        {/* Agent Panel - Always visible, resizable */}
        <div style={{ width: `${agentPanelWidth}px`, position: 'relative', flexShrink: 0 }}>
          <div
            onMouseDown={() => setIsResizingAgent(true)}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              cursor: 'col-resize',
              backgroundColor: isResizingAgent ? '#4a9eff' : 'transparent',
              transition: 'background-color 0.2s',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              if (!isResizingAgent) {
                e.currentTarget.style.backgroundColor = '#3a3a3a';
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizingAgent) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          />
          <ChatPanel />
        </div>
      </div>
    </div>
  );
};
