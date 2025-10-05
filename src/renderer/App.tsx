import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { WelcomeScreen } from './components/WelcomeScreen';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import { useAppStore } from './store/app-store';

export const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setAppReady } = useAppStore();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing Author app...');
      
      // Check if electronAPI is available
      if (!(window as any).electronAPI) {
        console.warn('Electron API not available - running in fallback mode');
      } else {
        console.log('Electron API is available');
        
        // Get app version
        try {
          const version = await (window as any).electronAPI.app.getVersion();
          console.log(`Author v${version} starting...`);
        } catch (err) {
          console.warn('Could not get app version:', err);
        }
      }

      // Set app as ready
      setAppReady(true);
      setIsLoading(false);
      console.log('App initialization complete');
    } catch (err) {
      console.error('Failed to initialize app:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1e1e1e',
        color: '#cccccc',
        fontSize: '18px'
      }}>
        <div>Initializing Author...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1e1e1e',
        color: '#ff6b6b',
        fontSize: '18px',
        padding: '20px'
      }}>
        <h2>Failed to start Author</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} style={{
          marginTop: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer'
        }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<WelcomeScreen />} />
      <Route path="/workspace" element={<WorkspaceLayout />} />
    </Routes>
  );
};
