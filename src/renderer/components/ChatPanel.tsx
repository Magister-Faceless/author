import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/app-store';

export const ChatPanel: React.FC = () => {
  const {
    chatThreads,
    activeThreadId,
    createThread,
    deleteThread,
    setActiveThread,
    addMessageToThread,
    getActiveThread
  } = useAppStore();

  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  const activeThread = getActiveThread();

  useEffect(() => {
    console.log('ChatPanel mounted');
    console.log('electronAPI available:', !!(window as any).electronAPI);
    console.log('electronAPI.agent available:', !!(window as any).electronAPI?.agent);
    console.log('electronAPI.on available:', !!(window as any).electronAPI?.on);
    
    loadAgents();
    // Create default thread if none exists
    if (chatThreads.length === 0) {
      createThread('General Chat');
    }
  }, []);

  useEffect(() => {
    // Set up event listeners for agent responses
    const handleStreamStart = () => {
      console.log('Stream started');
      setIsStreaming(true);
      setStreamingContent('');
    };

    const handleStreamChunk = (chunk: any) => {
      console.log('Received stream chunk:', chunk);
      setStreamingContent(chunk.fullContent || '');
    };

    const handleStreamEnd = (data: any) => {
      console.log('Stream ended:', data);
      setIsStreaming(false);
      
      // Add the complete message to the thread
      if (activeThreadId && data.fullContent) {
        addMessageToThread(activeThreadId, {
          type: 'assistant',
          content: data.fullContent,
          timestamp: new Date().toISOString()
        });
      }
      
      setStreamingContent('');
      setIsProcessing(false);
    };

    const handleAgentMessage = (msg: any) => {
      console.log('Received agent message:', msg);
      // This is the fallback for non-streaming responses
      if (!isStreaming && activeThreadId) {
        addMessageToThread(activeThreadId, {
          type: 'assistant',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg),
          timestamp: new Date().toISOString()
        });
        setIsProcessing(false);
      }
    };

    const handleAgentError = (error: any) => {
      console.error('Agent error:', error);
      if (activeThreadId) {
        addMessageToThread(activeThreadId, {
          type: 'assistant',
          content: `Error: ${error.message || 'Unknown error occurred'}`,
          timestamp: new Date().toISOString()
        });
      }
      setIsStreaming(false);
      setStreamingContent('');
      setIsProcessing(false);
    };

    // Listen for agent events
    if ((window as any).electronAPI?.on) {
      console.log('Setting up agent event listeners');
      (window as any).electronAPI.on('agent:stream-start', handleStreamStart);
      (window as any).electronAPI.on('agent:stream-chunk', handleStreamChunk);
      (window as any).electronAPI.on('agent:stream-end', handleStreamEnd);
      (window as any).electronAPI.on('agent:message', handleAgentMessage);
      (window as any).electronAPI.on('agent:error', handleAgentError);
      
      // Cleanup
      return () => {
        if ((window as any).electronAPI?.removeListener) {
          (window as any).electronAPI.removeListener('agent:stream-start', handleStreamStart);
          (window as any).electronAPI.removeListener('agent:stream-chunk', handleStreamChunk);
          (window as any).electronAPI.removeListener('agent:stream-end', handleStreamEnd);
          (window as any).electronAPI.removeListener('agent:message', handleAgentMessage);
          (window as any).electronAPI.removeListener('agent:error', handleAgentError);
        }
      };
    }
    
    return undefined;
  }, [activeThreadId, isStreaming]);

  const loadAgents = async () => {
    try {
      if ((window as any).electronAPI?.agent?.listAvailable) {
        const availableAgents = await (window as any).electronAPI.agent.listAvailable();
        const agentList = Array.isArray(availableAgents.data || availableAgents) 
          ? (availableAgents.data || availableAgents) 
          : [];
        setAgents(agentList);
        if (agentList.length > 0) {
          setSelectedAgent(agentList[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !activeThreadId) {
      console.log('Cannot send: message empty or no active thread');
      return;
    }

    console.log('Sending message:', message);

    const userMessage = {
      type: 'user' as const,
      content: message,
      timestamp: new Date().toISOString()
    };

    addMessageToThread(activeThreadId, userMessage);
    setIsProcessing(true);
    const currentMessage = message;
    setMessage('');

    try {
      console.log('Calling electronAPI.agent.sendMessage');
      const response = await (window as any).electronAPI.agent.sendMessage(currentMessage);
      console.log('Send message response:', response);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsProcessing(false);
      if (activeThreadId) {
        addMessageToThread(activeThreadId, {
          type: 'assistant',
          content: `Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  const handleNewThread = () => {
    const name = prompt('Thread name:') || `Chat ${chatThreads.length + 1}`;
    createThread(name);
  };

  const handleDeleteThread = (threadId: string) => {
    if (confirm('Delete this thread?')) {
      deleteThread(threadId);
    }
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
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #3a3a3a'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
          🤖 AI Assistant
        </h3>
        <button
          onClick={handleNewThread}
          style={{
            padding: '4px 8px',
            backgroundColor: '#4a9eff',
            border: 'none',
            borderRadius: '4px',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          + New
        </button>
      </div>

      {/* Thread List */}
      <div style={{
        maxHeight: '150px',
        overflowY: 'auto',
        borderBottom: '1px solid #3a3a3a',
        backgroundColor: '#252526'
      }}>
        {chatThreads.map(thread => (
          <div
            key={thread.id}
            onClick={() => setActiveThread(thread.id)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 16px',
              backgroundColor: thread.id === activeThreadId ? '#2a2a2a' : 'transparent',
              borderLeft: thread.id === activeThreadId ? '3px solid #4a9eff' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '13px'
            }}
            onMouseEnter={(e) => {
              if (thread.id !== activeThreadId) e.currentTarget.style.backgroundColor = '#2a2a2a';
            }}
            onMouseLeave={(e) => {
              if (thread.id !== activeThreadId) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span>{thread.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteThread(thread.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Agent Selection */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #3a3a3a' }}>
        <select
          value={selectedAgent || ''}
          onChange={(e) => setSelectedAgent(e.target.value)}
          style={{
            width: '100%',
            padding: '6px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #3a3a3a',
            borderRadius: '4px',
            color: '#cccccc',
            fontSize: '12px'
          }}
        >
          <option value="">Select agent...</option>
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px'
      }}>
        {!activeThread || activeThread.messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#888',
            fontSize: '13px',
            marginTop: '40px'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
            <div>No messages yet</div>
            <div style={{ fontSize: '11px', marginTop: '8px' }}>
              Start a conversation with your AI assistant
            </div>
          </div>
        ) : (
          <>
            {activeThread.messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: msg.type === 'user' ? '#1a3a5a' : '#2a2a2a',
                  borderRadius: '6px',
                  borderLeft: `3px solid ${msg.type === 'user' ? '#4a9eff' : '#6a6'}`
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#888'
                }}>
                  <span style={{
                    fontWeight: 'bold',
                    color: msg.type === 'user' ? '#4a9eff' : '#6a6'
                  }}>
                    {msg.type === 'user' ? 'You' : 'AI'}
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {/* Show streaming content */}
            {isStreaming && streamingContent && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '6px',
                  borderLeft: '3px solid #6a6'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#888'
                }}>
                  <span style={{
                    fontWeight: 'bold',
                    color: '#6a6'
                  }}>
                    AI (streaming...)
                  </span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                  {streamingContent}
                </div>
              </div>
            )}
          </>
        )}
        {isProcessing && !isStreaming && (
          <div style={{
            padding: '12px',
            backgroundColor: '#2a2a2a',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#888'
          }}>
            AI is thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #3a3a3a',
        backgroundColor: '#252526'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask anything... (Ctrl+Enter to send)"
            disabled={isProcessing}
            rows={3}
            style={{
              flex: 1,
              padding: '8px',
              backgroundColor: '#1e1e1e',
              border: '1px solid #3a3a3a',
              borderRadius: '4px',
              color: '#cccccc',
              fontSize: '13px',
              resize: 'none',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isProcessing}
            style={{
              padding: '8px 16px',
              backgroundColor: isProcessing || !message.trim() ? '#3a3a3a' : '#4a9eff',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              cursor: isProcessing || !message.trim() ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 'bold'
            }}
          >
            {isProcessing ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};
