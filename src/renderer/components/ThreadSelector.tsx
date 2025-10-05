import React, { useState, useEffect, useRef } from 'react';

interface Thread {
  id: string;
  name: string;
  updatedAt: Date;
  messageCount: number;
}

interface ThreadSelectorProps {
  currentThreadId: string | null;
  projectId: string | null;
  onThreadSelect: (threadId: string | null) => void;
  onNewThread: () => void;
}

export const ThreadSelector: React.FC<ThreadSelectorProps> = ({
  currentThreadId,
  projectId,
  onThreadSelect,
  onNewThread,
}) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentThread = threads.find(t => t.id === currentThreadId);

  // Load threads when project changes
  useEffect(() => {
    if (projectId) {
      loadThreads();
    }
  }, [projectId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadThreads = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const result = await (window as any).electronAPI.thread.list(projectId);
      console.log('Thread list result:', result);
      
      // Extract data array from response
      const threadData = result?.data || result || [];
      
      // Sort by most recent
      const sorted = threadData.sort((a: any, b: any) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setThreads(sorted);
    } catch (error) {
      console.error('Failed to load threads:', error);
      setThreads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewThread = async () => {
    setIsOpen(false);
    onNewThread();
    // Reload threads to show the new one
    setTimeout(() => loadThreads(), 100);
  };

  const handleThreadSelect = (threadId: string) => {
    setIsOpen(false);
    onThreadSelect(threadId);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '8px 12px',
          backgroundColor: '#2a2a2a',
          border: '1px solid #3a3a3a',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '13px',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#333';
          e.currentTarget.style.borderColor = '#4a4a4a';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#2a2a2a';
          e.currentTarget.style.borderColor = '#3a3a3a';
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {currentThread ? currentThread.name : 'Select conversation...'}
        </span>
        <span style={{ marginLeft: '8px', color: '#888', fontSize: '12px' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #3a3a3a',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {/* New Thread Button */}
          <div
            onClick={handleNewThread}
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid #3a3a3a',
              cursor: 'pointer',
              color: '#6a6',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span style={{ fontSize: '16px' }}>+</span>
            <span>New Conversation</span>
          </div>

          {/* Thread List */}
          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
              Loading...
            </div>
          ) : threads.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '12px' }}>
              No conversations yet
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => handleThreadSelect(thread.id)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #333',
                  backgroundColor: thread.id === currentThreadId ? '#3a3a3a' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (thread.id !== currentThreadId) {
                    e.currentTarget.style.backgroundColor = '#333';
                  }
                }}
                onMouseLeave={(e) => {
                  if (thread.id !== currentThreadId) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}>
                  <span style={{
                    fontSize: '13px',
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}>
                    {thread.name}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    color: '#888',
                    marginLeft: '8px',
                  }}>
                    {formatTimeAgo(thread.updatedAt)}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
