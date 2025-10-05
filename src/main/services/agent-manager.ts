import { OpenRouterAgentService } from '../../agents/core/openrouter-agent-service';
import { DatabaseManager, ChatMessage } from './database-manager';
import { VirtualFileManager } from './virtual-file-manager';
import type { AgentMessage } from '@shared/types';
import { BrowserWindow } from 'electron';

/**
 * AgentManager - Integrates AI agents with the Author application
 * Handles agent queries, event forwarding, and chat history management
 */
export class AgentManager {
  private agentService: OpenRouterAgentService;
  private databaseManager: DatabaseManager;
  private virtualFileManager: VirtualFileManager;
  private mainWindow: BrowserWindow | null = null;
  private currentProjectId: string | null = null;
  private currentSessionId: string | null = null;

  constructor(
    virtualFileManager: VirtualFileManager,
    databaseManager: DatabaseManager
  ) {
    this.virtualFileManager = virtualFileManager;
    this.databaseManager = databaseManager;
    
    // Initialize OpenRouter agent service
    const serviceOptions: any = {};
    if (process.env.CLAUDE_MODEL) serviceOptions.model = process.env.CLAUDE_MODEL;
    if (process.env.CLAUDE_API_KEY) serviceOptions.apiKey = process.env.CLAUDE_API_KEY;
    if (process.env.CLAUDE_API_BASE_URL) serviceOptions.apiBaseUrl = process.env.CLAUDE_API_BASE_URL;
    
    this.agentService = new OpenRouterAgentService(serviceOptions);

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set the main window for IPC communication
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Set the current project ID
   */
  setCurrentProject(projectId: string): void {
    this.currentProjectId = projectId;
  }
  /**
   * Set up event listeners for Claude service
   */
  private setupEventListeners(): void {
    // Listen for streaming chunks
    this.agentService.on('stream-start', (data: any) => {
      this.emitToRenderer('agent:stream-start', data);
    });

    this.agentService.on('stream-chunk', (chunk: any) => {
      this.emitToRenderer('agent:stream-chunk', chunk);
    });

    this.agentService.on('stream-end', (data: any) => {
      this.emitToRenderer('agent:stream-end', data);
    });

    // Listen for messages
    this.agentService.on('message', async (message: AgentMessage) => {
      // Save to database
      if (this.currentSessionId && this.currentProjectId) {
        try {
          await this.databaseManager.saveChatMessage({
            sessionId: this.currentSessionId,
            projectId: this.currentProjectId,
            type: 'assistant',
            content: JSON.stringify(message),
          });
        } catch (error) {
          console.error('Failed to save chat message:', error);
        }
      }
      
      // Forward to renderer
      this.emitToRenderer('agent:message', message);
    });

    this.agentService.on('todos', (todos: any) => {
      this.emitToRenderer('agent:todos', todos);
    });

    this.agentService.on('file-operation', (operation: any) => {
      this.emitToRenderer('agent:file-operation', operation);
    });

    this.agentService.on('agent-delegated', (data: any) => {
      this.emitToRenderer('agent:delegated', data);
    });

    this.agentService.on('session-started', (sessionId: string) => {
      this.currentSessionId = sessionId;
      this.emitToRenderer('agent:session-started', sessionId);
    });

    this.agentService.on('query-complete', (data: any) => {
      this.emitToRenderer('agent:query-complete', data);
    });

    this.agentService.on('error', (error: any) => {
      this.emitToRenderer('agent:error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    });
  }

  /**
   * Emit event to renderer process
   */
  private emitToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * Execute a query with the agent
   */
  async executeQuery(prompt: string, _options?: any): Promise<AgentMessage[]> {
    try {
      console.log('AgentManager.executeQuery called with prompt:', prompt);
      
      // Create session if needed
      if (!this.currentSessionId && this.currentProjectId) {
        console.log('Creating new session for project:', this.currentProjectId);
        const session = await this.databaseManager.createSession(this.currentProjectId);
        this.currentSessionId = session.id;
        console.log('Created session:', this.currentSessionId);
      }

      // Save user message
      if (this.currentSessionId && this.currentProjectId) {
        console.log('Saving user message to database');
        await this.databaseManager.saveChatMessage({
          sessionId: this.currentSessionId,
          projectId: this.currentProjectId,
          type: 'user',
          content: prompt,
        });
      }

      // Send message to agent
      console.log('Calling agentService.sendMessage');
      const response = await this.agentService.sendMessage(prompt, {
        maxTokens: 4096
      });
      console.log('Got response from agentService:', response);

      // Return as AgentMessage array
      const result = [this.convertToAgentMessage({ content: response })];
      console.log('Returning result:', result);
      return result;
    } catch (error) {
      console.error('Agent query error:', error);
      throw error;
    }
  }

  /**
   * Send message (for IPC compatibility)
   */
  async sendMessage(message: string): Promise<any> {
    console.log('AgentManager.sendMessage called with:', message);
    const result = await this.executeQuery(message);
    console.log('AgentManager.sendMessage result:', result);
    return result;
  }

  /**
   * List available subagents
   */
  async listAvailableAgents(): Promise<any[]> {
    return [
      {
        id: 'planning-agent',
        name: 'Planning Agent',
        description: 'Story structure and plot development',
        status: 'available',
        tools: ['TodoWrite', 'Read', 'Write', 'Edit', 'Grep', 'Glob']
      },
      {
        id: 'writing-agent',
        name: 'Writing Agent',
        description: 'Content generation and style',
        status: 'available',
        tools: ['TodoWrite', 'Read', 'Write', 'Edit', 'MultiEdit', 'Grep']
      },
      {
        id: 'editing-agent',
        name: 'Editing Agent',
        description: 'Manuscript improvement',
        status: 'available',
        tools: ['TodoWrite', 'Read', 'Edit', 'MultiEdit', 'Grep', 'Glob']
      },
      {
        id: 'research-agent',
        name: 'Research Agent',
        description: 'Fact-checking and research',
        status: 'available',
        tools: ['TodoWrite', 'Read', 'Write', 'Grep', 'Glob', 'Bash']
      },
      {
        id: 'character-agent',
        name: 'Character Agent',
        description: 'Character development',
        status: 'available',
        tools: ['TodoWrite', 'Read', 'Write', 'Edit', 'Grep', 'Glob']
      },
      {
        id: 'outline-agent',
        name: 'Outline Agent',
        description: 'Story outline management',
        status: 'available',
        tools: ['TodoWrite', 'Read', 'Write', 'Edit', 'Grep', 'Glob']
      }
    ];
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Resume a previous session
   */
  async resumeSession(sessionId: string): Promise<void> {
    this.currentSessionId = sessionId;
    // Resume not implemented for OpenRouter service
  }

  /**
   * Interrupt active query
   */
  async interrupt(): Promise<void> {
    // Not implemented for OpenRouter service
    console.log('Interrupt not supported');
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(sessionId: string, limit?: number): Promise<ChatMessage[]> {
    return await this.databaseManager.getChatHistory(sessionId, limit);
  }

  /**
   * List sessions for a project
   */
  async listSessions(projectId: string): Promise<any[]> {
    return await this.databaseManager.listSessions(projectId);
  }

  /**
   * Get response by message ID (legacy compatibility)
   */
  async getResponse(_messageId: string): Promise<AgentMessage | null> {
    // Not implemented - legacy method
    return null;
  }

  /**
   * Convert SDK message to AgentMessage format
   */
  private convertToAgentMessage(sdkMessage: any): AgentMessage {
    return {
      id: Date.now().toString(),
      agentId: 'main',
      type: 'response',
      content: sdkMessage.content || JSON.stringify(sdkMessage),
      timestamp: new Date(),
      metadata: {
        sessionId: this.currentSessionId,
        sdkMessageType: sdkMessage.type
      }
    };
  }

  /**
   * Get virtual file manager
   */
  getVirtualFileManager(): VirtualFileManager {
    return this.virtualFileManager;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.agentService.isReady();
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [
      'x-ai/grok-4-fast',
      'z-ai/glm-4.6',
      'anthropic/claude-3.5-sonnet'
    ];
  }
}
