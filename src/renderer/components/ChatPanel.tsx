import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/app-store';
import { ThreadSelector } from './ThreadSelector';

export const ChatPanel: React.FC = () => {
  const {
    chatThreads,
    activeThreadId,
    currentProject,
    createThread,
    setActiveThread,
    addMessageToThread,
    getActiveThread
  } = useAppStore();

  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [justFinishedStreaming, setJustFinishedStreaming] = useState(false);
  const [toolCalls, setToolCalls] = useState<Array<{id: string, tool: string, args: any, status: string, result?: string}>>([]);

  const activeThread = getActiveThread();

  // Load threads from backend when project changes
  useEffect(() => {
    const loadThreadsFromBackend = async () => {
      if (currentProject?.id) {
        try {
          const result = await (window as any).electronAPI.thread.list(currentProject.id);
          const backendThreads = result?.data || result || [];
          
          console.log('Loaded threads from backend:', backendThreads);
          
          // Update local store with backend threads
          // Note: This is a simple sync - in production, you'd want more sophisticated merging
          if (backendThreads.length > 0) {
            // TODO: Sync with local threads instead of just logging
            console.log('Found', backendThreads.length, 'threads in backend');
          }
        } catch (error) {
          console.error('Failed to load threads from backend:', error);
        }
      }
    };
    
    loadThreadsFromBackend();
  }, [currentProject?.id]);

  useEffect(() => {
    console.log('ChatPanel mounted');
    console.log('electronAPI available:', !!(window as any).electronAPI);
    console.log('electronAPI.agent available:', !!(window as any).electronAPI?.agent);
    console.log('electronAPI.on available:', !!(window as any).electronAPI?.on);
    
    // Create default thread if none exists
    if (chatThreads.length === 0) {
      createThread('General Chat');
    }
  }, []);

  // Handle adding pending message to thread (avoids setState during render)
  useEffect(() => {
    if (pendingMessage && activeThreadId) {
      addMessageToThread(activeThreadId, {
        type: 'assistant',
        content: pendingMessage,
        timestamp: new Date().toISOString()
      });
      setPendingMessage(null);
      // Reset the flag after a short delay to allow duplicate message events to be ignored
      setTimeout(() => setJustFinishedStreaming(false), 100);
    }
  }, [pendingMessage, activeThreadId]);

  useEffect(() => {
    // Set up event listeners for agent responses
    const handleStreamStart = () => {
      console.log('Stream started');
      setIsStreaming(true);
      setStreamingContent('');
      setToolCalls([]); // Reset tool calls for new message
    };

    const handleStreamChunk = (chunk: any) => {
      console.log('Received stream chunk:', chunk);
      // Accumulate streaming content
      setStreamingContent(prev => prev + (chunk.content || chunk.fullContent || ''));
    };

    const handleToolCall = (toolCall: any) => {
      console.log('Tool call:', toolCall);
      setToolCalls(prev => [...prev, {
        id: toolCall.id,
        tool: toolCall.tool,
        args: toolCall.args,
        status: toolCall.status || 'pending'
      }]);
    };

    const handleToolResult = (toolResult: any) => {
      console.log('Tool result:', toolResult);
      setToolCalls(prev => prev.map(tc => 
        tc.id === toolResult.id 
          ? { ...tc, status: toolResult.status || 'completed', result: toolResult.result }
          : tc
      ));
    };

    const handleStreamEnd = (data: any) => {
      console.log('Stream ended:', data);
      setIsStreaming(false);
      setJustFinishedStreaming(true);
      
      // Save the pending message to be added in useEffect
      setStreamingContent(currentContent => {
        if (currentContent && activeThreadId) {
          setPendingMessage(currentContent);
        }
        return '';
      });
      
      setIsProcessing(false);
    };

    const handleAgentMessage = (msg: any) => {
      console.log('Received agent message:', msg);
      // This is the fallback for non-streaming responses
      // Don't add if we just finished streaming (avoids duplicates)
      if (!isStreaming && !justFinishedStreaming && activeThreadId) {
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
      (window as any).electronAPI.on('agent:tool-call', handleToolCall);
      (window as any).electronAPI.on('agent:tool-result', handleToolResult);
      (window as any).electronAPI.on('agent:stream-end', handleStreamEnd);
      (window as any).electronAPI.on('agent:message', handleAgentMessage);
      (window as any).electronAPI.on('agent:error', handleAgentError);
      
      // Cleanup
      return () => {
        if ((window as any).electronAPI?.removeListener) {
          (window as any).electronAPI.removeListener('agent:stream-start', handleStreamStart);
          (window as any).electronAPI.removeListener('agent:stream-chunk', handleStreamChunk);
          (window as any).electronAPI.removeListener('agent:tool-call', handleToolCall);
          (window as any).electronAPI.removeListener('agent:tool-result', handleToolResult);
          (window as any).electronAPI.removeListener('agent:stream-end', handleStreamEnd);
          (window as any).electronAPI.removeListener('agent:message', handleAgentMessage);
          (window as any).electronAPI.removeListener('agent:error', handleAgentError);
        }
      };
    }
    return undefined;
  }, [activeThreadId, isStreaming]);

  const handleSendMessage = async () => {
    if (!message.trim() || !activeThreadId) {
      console.log('Cannot send: message empty or no active thread');
      return;
    }

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

  const handleNewThread = async () => {
    try {
      if (!currentProject?.id) {
        console.error('No project selected');
        // Fallback to local-only thread
        createThread(`Chat ${chatThreads.length + 1}`);
        return;
      }

      // Create thread in backend
      const thread = await (window as any).electronAPI.thread.create(
        currentProject.id,
        `Chat ${new Date().toLocaleTimeString()}`
      );

      // Create in local store
      createThread(thread.name);
      setActiveThread(thread.id);
      
      console.log('New thread created:', thread);
    } catch (error) {
      console.error('Failed to create thread:', error);
      // Fallback to local-only thread
      createThread(`Chat ${chatThreads.length + 1}`);
    }
  };

  const handleThreadSelect = async (threadId: string | null) => {
    if (!threadId) return;
    
    try {
      // Load thread messages from backend
      const result = await (window as any).electronAPI.thread.getMessages(threadId);
      const messages = result?.data || result || [];
      
      console.log('Loaded thread messages:', messages);
      
      // Update store with the thread ID
      setActiveThread(threadId);
      
      // Clear current messages and add loaded ones
      const activeThread = getActiveThread();
      if (activeThread) {
        // Clear existing messages
        activeThread.messages = [];
        
        // Add loaded messages
        messages.forEach((msg: any) => {
          addMessageToThread(threadId, {
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp
          });
        });
      }
    } catch (error) {
      console.error('Failed to load thread:', error);
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
      {/* Thread Selector - Matches screenshot header height */}
      <div style={{
        padding: '4px 16px',
        borderBottom: '1px solid #3a3a3a',
        backgroundColor: '#252526',
        height: '40px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <ThreadSelector
          currentThreadId={activeThreadId}
          projectId={currentProject?.id || null}
          onThreadSelect={handleThreadSelect}
          onNewThread={handleNewThread}
        />
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
            {isStreaming && (streamingContent || toolCalls.length > 0) && (
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

                {/* Tool Calls - Modern UI */}
                {toolCalls.length > 0 && (
                  <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {toolCalls.map((tc) => (
                      <div
                        key={tc.id}
                        style={{
                          padding: '12px 14px',
                          background: tc.status === 'completed' 
                            ? 'linear-gradient(135deg, #1a2f1a 0%, #1a3a2a 100%)' 
                            : 'linear-gradient(135deg, #2a1f1a 0%, #3a2a1a 100%)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          border: `1px solid ${tc.status === 'completed' ? '#3a6a4a' : '#6a4a3a'}`,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          marginBottom: '8px'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            fontWeight: 600,
                            color: tc.status === 'completed' ? '#6fa76f' : '#d4a574',
                            fontSize: '13px'
                          }}>
                            <span style={{ 
                              fontSize: '16px',
                              animation: tc.status === 'pending' ? 'pulse 2s infinite' : 'none'
                            }}>
                              {tc.status === 'pending' ? '⚡' : '✓'}
                            </span>
                            <span>{tc.tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          </div>
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: tc.status === 'completed' ? '#2a5a3a' : '#5a4a2a',
                            color: tc.status === 'completed' ? '#8fc88f' : '#e6c48f',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                            letterSpacing: '0.5px'
                          }}>
                            {tc.status}
                          </span>
                        </div>
                        {tc.args && Object.keys(tc.args).length > 0 && (
                          <div style={{ 
                            padding: '8px 10px',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontFamily: 'Consolas, monospace',
                            color: '#aaa',
                            marginBottom: tc.result ? '8px' : '0',
                            maxHeight: '120px',
                            overflow: 'auto'
                          }}>
                            {Object.entries(tc.args).map(([key, value]) => (
                              <div key={key} style={{ marginBottom: '4px' }}>
                                <span style={{ color: '#7a9ac7' }}>{key}</span>
                                <span style={{ color: '#888' }}>: </span>
                                <span style={{ color: '#c7a97a' }}>
                                  {typeof value === 'string' && value.length > 80 
                                    ? `"${value.substring(0, 80)}..."` 
                                    : JSON.stringify(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {tc.result && (
                          <div style={{ 
                            padding: '8px 10px',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: '#8fc88f',
                            borderLeft: '3px solid #6fa76f',
                            fontFamily: 'Consolas, monospace'
                          }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#6fa76f' }}>Result:</div>
                            {tc.result.substring(0, 150)}{tc.result.length > 150 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Streaming text */}
                {streamingContent && (
                  <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                    {streamingContent}
                  </div>
                )}
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
