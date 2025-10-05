import { Project, VirtualFile } from '@shared/types';

export interface ChatMessage {
  id: string;
  sessionId: string;
  projectId: string;
  type: 'user' | 'assistant' | 'system' | 'tool_use' | 'tool_result';
  content: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  timestamp: Date;
}

export interface Session {
  id: string;
  projectId: string;
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  lastActivity: Date;
}

export class DatabaseManager {
  private mockProjects: Project[] = [];
  private mockVirtualFiles: VirtualFile[] = [];
  private mockChatMessages: ChatMessage[] = [];
  private mockSessions: Session[] = [];

  constructor() {
    console.log('Database manager initialized in fallback mode (no better-sqlite3)');
  }

  // Project operations
  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const id = this.generateId();
    const now = new Date();
    
    const project: Project = {
      id,
      ...projectData,
      createdAt: now,
      updatedAt: now,
    };

    this.mockProjects.push(project);
    console.log('Created mock project:', project.name);
    return project;
  }

  async getProject(id: string): Promise<Project | null> {
    return this.mockProjects.find(p => p.id === id) || null;
  }

  async listProjects(): Promise<Project[]> {
    return [...this.mockProjects];
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> {
    const projectIndex = this.mockProjects.findIndex(p => p.id === id);
    if (projectIndex >= 0) {
      this.mockProjects[projectIndex] = {
        ...this.mockProjects[projectIndex],
        ...updates,
        updatedAt: new Date()
      };
    }
  }

  async deleteProject(id: string): Promise<void> {
    this.mockProjects = this.mockProjects.filter(p => p.id !== id);
  }

  // Virtual file operations
  async createVirtualFile(fileData: Omit<VirtualFile, 'id' | 'createdAt' | 'updatedAt'>): Promise<VirtualFile> {
    const id = this.generateId();
    const now = new Date();
    
    const file: VirtualFile = {
      id,
      ...fileData,
      createdAt: now,
      updatedAt: now,
    };

    this.mockVirtualFiles.push(file);
    return file;
  }

  async getVirtualFile(id: string): Promise<VirtualFile | null> {
    return this.mockVirtualFiles.find(f => f.id === id) || null;
  }

  async listVirtualFiles(filter?: { type?: string; sessionId?: string }): Promise<VirtualFile[]> {
    let files = [...this.mockVirtualFiles];
    
    if (filter?.type) {
      files = files.filter(f => f.type === filter.type);
    }
    
    if (filter?.sessionId) {
      files = files.filter(f => f.sessionId === filter.sessionId);
    }
    
    return files;
  }

  // Chat message operations
  async saveChatMessage(messageData: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: this.generateId(),
      ...messageData,
      timestamp: new Date(),
    };

    this.mockChatMessages.push(message);
    
    // Update session last activity
    const session = this.mockSessions.find(s => s.id === messageData.sessionId);
    if (session) {
      session.lastActivity = new Date();
      session.messageCount++;
    }

    return message;
  }

  async getChatHistory(sessionId: string, limit?: number): Promise<ChatMessage[]> {
    let messages = this.mockChatMessages
      .filter(m => m.sessionId === sessionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    if (limit) {
      messages = messages.slice(-limit);
    }
    
    return messages;
  }

  async deleteChatHistory(sessionId: string): Promise<void> {
    this.mockChatMessages = this.mockChatMessages.filter(m => m.sessionId !== sessionId);
  }

  // Session operations
  async createSession(projectId: string): Promise<Session> {
    const session: Session = {
      id: this.generateId(),
      projectId,
      startTime: new Date(),
      messageCount: 0,
      lastActivity: new Date(),
    };

    this.mockSessions.push(session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.mockSessions.find(s => s.id === sessionId) || null;
  }

  async listSessions(projectId: string): Promise<Session[]> {
    return this.mockSessions
      .filter(s => s.projectId === projectId)
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.mockSessions.find(s => s.id === sessionId);
    if (session) {
      session.endTime = new Date();
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.mockSessions = this.mockSessions.filter(s => s.id !== sessionId);
    await this.deleteChatHistory(sessionId);
  }

  // Utility method for generating IDs
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
