import * as fs from 'fs/promises';
import { Project, ProjectSettings } from '@shared/types';
import { DatabaseManager } from './database-manager';

export class ProjectManager {
  private databaseManager: DatabaseManager;

  constructor(databaseManager: DatabaseManager) {
    this.databaseManager = databaseManager;
  }

  async createProject(data: {
    name: string;
    description?: string;
    path: string;
    settings?: Partial<ProjectSettings>;
  }): Promise<Project> {
    // Just validate the path exists - don't check for .author folder
    try {
      const stats = await fs.stat(data.path);
      if (!stats.isDirectory()) {
        throw new Error('Project path must be a directory');
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Directory doesn't exist, create it
        await fs.mkdir(data.path, { recursive: true });
      } else {
        throw error;
      }
    }

    // Default settings
    const defaultSettings: ProjectSettings = {
      autoSave: true,
      backupEnabled: true,
      aiAssistanceLevel: 'moderate',
      ...data.settings,
    };

    // Create project in database
    const project = await this.databaseManager.createProject({
      name: data.name,
      description: data.description || '',
      path: data.path,
      settings: defaultSettings,
    });

    // Don't create any folders or files - let AI agents do it as needed
    return project;
  }

  async openProject(projectId: string): Promise<Project> {
    const project = await this.databaseManager.getProject(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    // Verify project path still exists
    try {
      await fs.access(project.path);
    } catch (error) {
      throw new Error(`Project directory not found: ${project.path}`);
    }

    return project;
  }

  async listProjects(): Promise<Project[]> {
    return this.databaseManager.listProjects();
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    await this.databaseManager.updateProject(projectId, updates);
  }

  async deleteProject(projectId: string): Promise<void> {
    const project = await this.databaseManager.getProject(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    // Delete from database
    await this.databaseManager.deleteProject(projectId);

    // Optionally delete project files (ask user first in UI)
    // await this.deleteProjectFiles(project.path);
  }

}
