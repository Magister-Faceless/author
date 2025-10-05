import * as fs from 'fs/promises';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { FileMetadata } from '@shared/types';

export class FileManager {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private fileChangeCallbacks: Map<string, (filePath: string) => void> = new Map();

  async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error: any) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      const directory = path.dirname(filePath);
      await fs.mkdir(directory, { recursive: true });

      // Write file
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    try {
      // Ensure target directory exists
      const directory = path.dirname(newPath);
      await fs.mkdir(directory, { recursive: true });

      await fs.rename(oldPath, newPath);
    } catch (error: any) {
      throw new Error(`Failed to rename file from ${oldPath} to ${newPath}: ${error.message}`);
    }
  }

  async listFiles(directoryPath: string): Promise<FileMetadata[]> {
    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });
      const files: FileMetadata[] = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(directoryPath, entry.name);
          const stats = await fs.stat(filePath);
          const content = await this.readFile(filePath);
          
          files.push({
            id: this.generateFileId(filePath),
            name: entry.name,
            path: filePath,
            type: this.getFileType(entry.name),
            wordCount: this.countWords(content),
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
            projectId: '', // Will be set by caller
          });
        }
      }

      return files.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error: any) {
      throw new Error(`Failed to list files in ${directoryPath}: ${error.message}`);
    }
  }

  async watchFile(filePath: string, callback: (filePath: string) => void): Promise<void> {
    if (this.watchers.has(filePath)) {
      // Already watching this file
      return;
    }

    const watcher = chokidar.watch(filePath, {
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('change', () => {
      callback(filePath);
    });

    watcher.on('error', (error) => {
      console.error(`File watcher error for ${filePath}:`, error);
    });

    this.watchers.set(filePath, watcher);
    this.fileChangeCallbacks.set(filePath, callback);
  }

  async unwatchFile(filePath: string): Promise<void> {
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(filePath);
      this.fileChangeCallbacks.delete(filePath);
    }
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      // Ensure target directory exists
      const directory = path.dirname(targetPath);
      await fs.mkdir(directory, { recursive: true });

      await fs.copyFile(sourcePath, targetPath);
    } catch (error: any) {
      throw new Error(`Failed to copy file from ${sourcePath} to ${targetPath}: ${error.message}`);
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileStats(filePath: string): Promise<{
    size: number;
    createdAt: Date;
    updatedAt: Date;
    isDirectory: boolean;
  }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
      };
    } catch (error: any) {
      throw new Error(`Failed to get file stats for ${filePath}: ${error.message}`);
    }
  }

  async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup.${timestamp}`;
    
    await this.copyFile(filePath, backupPath);
    return backupPath;
  }

  private getFileType(fileName: string): 'chapter' | 'character' | 'outline' | 'research' | 'notes' {
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes('chapter') || lowerName.match(/ch\d+/)) {
      return 'chapter';
    } else if (lowerName.includes('character') || lowerName.includes('char')) {
      return 'character';
    } else if (lowerName.includes('outline') || lowerName.includes('plot')) {
      return 'outline';
    } else if (lowerName.includes('research') || lowerName.includes('ref')) {
      return 'research';
    } else {
      return 'notes';
    }
  }

  private countWords(content: string): number {
    // Simple word count - split by whitespace and filter empty strings
    return content
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  private generateFileId(filePath: string): string {
    // Generate a consistent ID based on file path
    return Buffer.from(filePath).toString('base64').replace(/[/+=]/g, '');
  }

  // Cleanup method to close all watchers
  async cleanup(): Promise<void> {
    const closePromises = Array.from(this.watchers.values()).map(watcher => watcher.close());
    await Promise.all(closePromises);
    this.watchers.clear();
    this.fileChangeCallbacks.clear();
  }
}
