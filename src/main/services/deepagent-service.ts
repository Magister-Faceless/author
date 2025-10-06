/**
 * DeepAgent Service
 * WebSocket client for communicating with Python backend
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface DeepAgentMessage {
  type: string;
  content?: string;
  fullContent?: string;
  data?: any;
  error?: string;
  role?: string;
  // Tool-related fields
  tool?: string;
  args?: any;
  id?: string;
  status?: 'pending' | 'completed' | 'error';
  result?: string;
}

export class DeepAgentService extends EventEmitter {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private isConnected = false;
  private isInitialized = false;
  private projectPath: string | null = null;

  constructor(wsUrl: string) {
    super();
    this.wsUrl = wsUrl;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.on('open', () => {
          console.log('✅ Connected to Python backend WebSocket');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message: DeepAgentMessage = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('WebSocket connection closed');
          this.isConnected = false;
          this.isInitialized = false;
          this.emit('disconnected');
          this.attemptReconnect();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Initialize agent with project path and optionalauthor mode
   */
  async initialize(projectPath: string, authorMode: string = 'fiction'): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to backend');
    }

    this.projectPath = projectPath;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Initialization timeout'));
      }, 10000);

      const initHandler = (message: DeepAgentMessage) => {
        if (message.type === 'initialized') {
          clearTimeout(timeout);
          this.isInitialized = true;
          console.log('✅ Agent initialized for project:', projectPath);
          console.log('   Author mode:', authorMode);
          this.removeListener('message-raw', initHandler);
          resolve();
        } else if (message.type === 'error') {
          clearTimeout(timeout);
          this.removeListener('message-raw', initHandler);
          reject(new Error(message.error || 'Initialization failed'));
        }
      };

      this.on('message-raw', initHandler);

      this.send({
        type: 'init',
        project_path: projectPath,
        author_mode: authorMode,
      });
    });
  }

  /**
   * Send a message to the agent
   */
  async sendMessage(prompt: string, threadId?: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to backend');
    }

    if (!this.isInitialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    this.send({
      type: 'message',
      content: prompt,
      thread_id: threadId,
    });
  }

  /**
   * Change project path
   */
  async changeProject(projectPath: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to backend');
    }

    this.projectPath = projectPath;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Project change timeout'));
      }, 10000);

      const changeHandler = (message: DeepAgentMessage) => {
        if (message.type === 'project_changed') {
          clearTimeout(timeout);
          console.log('✅ Project changed to:', projectPath);
          this.removeListener('message-raw', changeHandler);
          resolve();
        } else if (message.type === 'error') {
          clearTimeout(timeout);
          this.removeListener('message-raw', changeHandler);
          reject(new Error(message.error || 'Project change failed'));
        }
      };

      this.on('message-raw', changeHandler);

      this.send({
        type: 'change_project',
        project_path: projectPath,
      });
    });
  }

  /**
   * Change author mode (Fiction, Non-Fiction, Academic)
   */
  async changeMode(mode: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to backend');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Mode change timeout'));
      }, 10000);

      const modeHandler = (message: DeepAgentMessage) => {
        if (message.type === 'mode_changed') {
          clearTimeout(timeout);
          console.log('✅ Author mode changed to:', mode);
          this.removeListener('message-raw', modeHandler);
          resolve();
        } else if (message.type === 'error') {
          clearTimeout(timeout);
          this.removeListener('message-raw', modeHandler);
          reject(new Error(message.error || 'Mode change failed'));
        }
      };

      this.on('message-raw', modeHandler);

      this.send({
        type: 'change_mode',
        mode: mode,
      });
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: DeepAgentMessage): void {
    // Emit raw message for internal handlers
    this.emit('message-raw', message);

    // Handle specific message types
    switch (message.type) {
      case 'stream-start':
        this.emit('stream-start', {});
        break;

      case 'stream-chunk':
        this.emit('stream-chunk', { 
          content: message.content || '',
          fullContent: message.fullContent || ''
        });
        break;

      case 'tool-call':
        this.emit('tool-call', {
          tool: message.tool,
          args: message.args,
          id: message.id,
          status: message.status
        });
        break;

      case 'tool-result':
        this.emit('tool-result', {
          id: message.id,
          result: message.result,
          status: message.status
        });
        break;

      case 'todos':
        this.emit('todos', message.data || []);
        break;

      case 'files':
        this.emit('files', message.data || []);
        break;

      case 'complete':
        this.emit('stream-end', { fullContent: message.fullContent || '' });
        this.emit('query-complete', {});
        break;

      case 'error':
        this.emit('error', new Error(message.error || 'Unknown error'));
        break;

      case 'message':
        this.emit('message', {
          id: Date.now().toString(),
          agentId: 'deepagent',
          type: 'response',
          content: message.content || '',
          timestamp: new Date(),
          metadata: {
            role: message.role || 'assistant'
          }
        });
        break;
    }
  }

  /**
   * Send data through WebSocket
   */
  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      throw new Error('WebSocket is not open');
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect()
        .then(() => {
          if (this.projectPath) {
            return this.initialize(this.projectPath);
          }
          return Promise.resolve();
        })
        .catch((error) => {
          console.error('Reconnection failed:', error);
        });
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.isInitialized = false;
    }
  }

  /**
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected && this.isInitialized;
  }

  /**
   * Get current project path
   */
  getCurrentProject(): string | null {
    return this.projectPath;
  }
  
  /**
   * Stop the agent (for cleanup)
   */
  async stop(): Promise<void> {
    this.disconnect();
  }
}
