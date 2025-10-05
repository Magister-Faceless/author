// Load environment variables first
import * as dotenv from 'dotenv';
dotenv.config();

import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import * as path from 'path';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { IpcResponse } from '@shared/types';
import { ProjectManager } from './services/project-manager';
import { FileManager } from './services/file-manager';
import { DatabaseManager } from './services/database-manager';
import { AgentManager } from './services/agent-manager';
import { VirtualFileManager } from './services/virtual-file-manager';
import { Logger } from './utils/logger';

class AuthorApplication {
  private mainWindow: BrowserWindow | null = null;
  private projectManager: ProjectManager;
  private fileManager: FileManager;
  private databaseManager: DatabaseManager;
  private agentManager: AgentManager;
  private virtualFileManager: VirtualFileManager;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
    this.databaseManager = new DatabaseManager();
    this.projectManager = new ProjectManager(this.databaseManager);
    this.fileManager = new FileManager();
    this.virtualFileManager = new VirtualFileManager();
    this.agentManager = new AgentManager(this.virtualFileManager, this.databaseManager);

    this.initializeApp();
  }

  private initializeApp(): void {
    // Handle app ready event
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupIpcHandlers();
      this.setupAppEventHandlers();
    });

    // Handle window closed events
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'default',
      show: false, // Don't show until ready
    });

    // Set main window reference for agent manager
    this.agentManager.setMainWindow(this.mainWindow);

    // Load the renderer
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupIpcHandlers(): void {
    // Project Management
    ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, async (_, data) => {
      return this.handleIpcRequest(() => this.projectManager.createProject(data));
    });

    ipcMain.handle(IPC_CHANNELS.PROJECT_OPEN, async (_, projectId) => {
      return this.handleIpcRequest(() => this.projectManager.openProject(projectId));
    });

    ipcMain.handle(IPC_CHANNELS.PROJECT_LIST, async () => {
      return this.handleIpcRequest(() => this.projectManager.listProjects());
    });

    // File Operations
    ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_, filePath) => {
      return this.handleIpcRequest(() => this.fileManager.readFile(filePath));
    });

    ipcMain.handle(IPC_CHANNELS.FILE_WRITE, async (_, filePath, content) => {
      return this.handleIpcRequest(() => this.fileManager.writeFile(filePath, content));
    });

    ipcMain.handle(IPC_CHANNELS.FILE_LIST, async (_, directoryPath) => {
      return this.handleIpcRequest(() => this.fileManager.listFiles(directoryPath));
    });

    // Agent Communication
    ipcMain.handle(IPC_CHANNELS.AGENT_SEND_MESSAGE, async (_, message) => {
      return this.handleIpcRequest(() => this.agentManager.sendMessage(message));
    });

    ipcMain.handle(IPC_CHANNELS.AGENT_LIST_AVAILABLE, async () => {
      return this.handleIpcRequest(() => this.agentManager.listAvailableAgents());
    });

    ipcMain.handle('agent:get-history', async (_, sessionId, limit) => {
      return this.handleIpcRequest(() => this.agentManager.getChatHistory(sessionId, limit));
    });

    ipcMain.handle('agent:list-sessions', async (_, projectId) => {
      return this.handleIpcRequest(() => this.agentManager.listSessions(projectId));
    });

    ipcMain.handle('agent:resume-session', async (_, sessionId) => {
      return this.handleIpcRequest(() => this.agentManager.resumeSession(sessionId));
    });

    ipcMain.handle('agent:interrupt', async () => {
      return this.handleIpcRequest(() => this.agentManager.interrupt());
    });

    ipcMain.handle('agent:set-project', async (_, projectId) => {
      this.agentManager.setCurrentProject(projectId);
      return { success: true };
    });

    // Virtual File System
    ipcMain.handle(IPC_CHANNELS.VIRTUAL_FILE_CREATE, async (_, fileData) => {
      return this.handleIpcRequest(() => this.virtualFileManager.createFile(fileData));
    });

    ipcMain.handle(IPC_CHANNELS.VIRTUAL_FILE_READ, async (_, fileId) => {
      return this.handleIpcRequest(() => this.virtualFileManager.readFile(fileId));
    });

    // Application Info
    ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, async () => {
      return this.handleIpcRequest(() => Promise.resolve(app.getVersion()));
    });

    // Error Reporting
    ipcMain.handle(IPC_CHANNELS.ERROR_REPORT, async (_, error) => {
      this.logger.error('Renderer Error:', error);
      return { success: true };
    });

    // Window Management
    ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, async () => {
      this.mainWindow?.minimize();
      return { success: true };
    });

    ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, async () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
      return { success: true };
    });

    ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, async () => {
      this.mainWindow?.close();
      return { success: true };
    });

    // Dialog handlers
    ipcMain.handle('dialog:select-folder', async () => {
      if (!this.mainWindow) return { canceled: true };
      
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Project Folder'
      });
      
      return result;
    });
  }

  private setupAppEventHandlers(): void {
    // Handle external links
    this.mainWindow?.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Handle certificate errors
    app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
      // In development, ignore certificate errors
      if (process.env.NODE_ENV === 'development') {
        event.preventDefault();
        callback(true);
      } else {
        callback(false);
      }
    });
  }

  private async handleIpcRequest<T>(handler: () => Promise<T>): Promise<IpcResponse> {
    try {
      const data = await handler();
      return {
        id: '', // Will be set by the caller
        success: true,
        data,
      };
    } catch (error) {
      this.logger.error('IPC Handler Error:', error);
      return {
        id: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Initialize the application
new AuthorApplication();
