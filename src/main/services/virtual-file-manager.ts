import { VirtualFile } from '@shared/types';
import { DatabaseManager } from './database-manager';

export class VirtualFileManager {
  private databaseManager: DatabaseManager | undefined;

  constructor(databaseManager?: DatabaseManager) {
    this.databaseManager = databaseManager;
  }

  setDatabaseManager(databaseManager: DatabaseManager): void {
    this.databaseManager = databaseManager;
  }

  async createFile(fileData: {
    name: string;
    type: 'progress' | 'context' | 'summary' | 'todo';
    content: string;
    metadata?: Record<string, any>;
    sessionId?: string;
  }): Promise<VirtualFile> {
    if (!this.databaseManager) {
      throw new Error('Database manager not initialized');
    }

    return this.databaseManager.createVirtualFile({
      name: fileData.name,
      type: fileData.type,
      content: fileData.content,
      metadata: fileData.metadata || {},
      sessionId: fileData.sessionId || '',
    });
  }

  async readFile(fileId: string): Promise<VirtualFile | null> {
    if (!this.databaseManager) {
      throw new Error('Database manager not initialized');
    }

    return this.databaseManager.getVirtualFile(fileId);
  }

  async updateFile(fileId: string, updates: {
    content?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!this.databaseManager) {
      throw new Error('Database manager not initialized');
    }

    const file = await this.databaseManager.getVirtualFile(fileId);
    if (!file) {
      throw new Error(`Virtual file with ID ${fileId} not found`);
    }

    // Update the file content and metadata
    const updatedContent = updates.content !== undefined ? updates.content : file.content;
    const updatedMetadata = updates.metadata ? { ...file.metadata, ...updates.metadata } : file.metadata;

    // For now, we'll create a new version since we don't have an update method
    // In a full implementation, you'd add an update method to DatabaseManager
    await this.createFile({
      name: file.name,
      type: file.type,
      content: updatedContent,
      metadata: updatedMetadata,
      sessionId: file.sessionId || '',
    });
  }

  async deleteFile(_fileId: string): Promise<void> {
    if (!this.databaseManager) {
      throw new Error('Database manager not initialized');
    }

    // For now, we'll implement this as a placeholder
    // In a full implementation, you'd add a delete method to DatabaseManager
    throw new Error('Delete functionality not yet implemented');
  }

  async listFiles(filter?: {
    type?: 'progress' | 'context' | 'summary' | 'todo';
    sessionId?: string;
  }): Promise<VirtualFile[]> {
    if (!this.databaseManager) {
      throw new Error('Database manager not initialized');
    }

    return this.databaseManager.listVirtualFiles(filter);
  }

  async searchFiles(query: string, type?: string): Promise<VirtualFile[]> {
    const files = await this.listFiles(type ? { type: type as any } : undefined);
    
    // Simple text search in content and name
    const lowerQuery = query.toLowerCase();
    return files.filter(file => 
      file.name.toLowerCase().includes(lowerQuery) ||
      file.content.toLowerCase().includes(lowerQuery)
    );
  }

  // Helper methods for specific file types
  async createProgressFile(sessionId: string, content: string, metadata?: Record<string, any>): Promise<VirtualFile> {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    return this.createFile({
      name: `progress_${sessionId}_${timestamp}.md`,
      type: 'progress',
      content,
      metadata: {
        sessionId,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
      sessionId,
    });
  }

  async createContextNote(topic: string, content: string, metadata?: Record<string, any>): Promise<VirtualFile> {
    const id = this.generateId();
    return this.createFile({
      name: `context_${topic}_${id}.md`,
      type: 'context',
      content,
      metadata: {
        topic,
        createdAt: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  async createSessionSummary(sessionId: string, content: string, metadata?: Record<string, any>): Promise<VirtualFile> {
    const date = new Date().toISOString().slice(0, 10);
    return this.createFile({
      name: `session_summary_${date}_${sessionId}.md`,
      type: 'summary',
      content,
      metadata: {
        sessionId,
        date,
        createdAt: new Date().toISOString(),
        ...metadata,
      },
      sessionId,
    });
  }

  async createEnhancedTodo(title: string, content: string, metadata?: Record<string, any>): Promise<VirtualFile> {
    const id = this.generateId();
    return this.createFile({
      name: `todo_${title.replace(/\s+/g, '_')}_${id}.md`,
      type: 'todo',
      content,
      metadata: {
        title,
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  // Get files by session for context preservation
  async getSessionFiles(sessionId: string): Promise<VirtualFile[]> {
    return this.listFiles({ sessionId });
  }

  // Get recent files for quick access
  async getRecentFiles(limit: number = 10): Promise<VirtualFile[]> {
    const files = await this.listFiles();
    return files
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
