import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';

// Define the API interface
interface ElectronAPI {
  project: {
    create: (data: any) => Promise<any>;
    open: (projectId: string) => Promise<any>;
    save: (projectData: any) => Promise<any>;
    delete: (projectId: string) => Promise<any>;
    list: () => Promise<any>;
    getCurrent: () => Promise<any>;
  };
  file: {
    read: (filePath: string) => Promise<any>;
    write: (filePath: string, content: string) => Promise<any>;
    delete: (filePath: string) => Promise<any>;
    rename: (oldPath: string, newPath: string) => Promise<any>;
    list: (directoryPath: string) => Promise<any>;
    watch: (filePath: string) => Promise<any>;
    unwatch: (filePath: string) => Promise<any>;
  };
  agent: {
    sendMessage: (message: any) => Promise<any>;
    getResponse: (messageId: string) => Promise<any>;
    listAvailable: () => Promise<any>;
    getStatus: (agentId: string) => Promise<any>;
    executeTask: (task: any) => Promise<any>;
  };
  virtualFile: {
    create: (fileData: any) => Promise<any>;
    read: (fileId: string) => Promise<any>;
    update: (fileId: string, content: string) => Promise<any>;
    delete: (fileId: string) => Promise<any>;
    list: (filter?: any) => Promise<any>;
  };
  database: {
    query: (sql: string, params?: any[]) => Promise<any>;
    execute: (sql: string, params?: any[]) => Promise<any>;
    transaction: (operations: any[]) => Promise<any>;
  };
  settings: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<any>;
    reset: () => Promise<any>;
  };
  app: {
    getVersion: () => Promise<any>;
    getPath: (name: string) => Promise<any>;
    quit: () => Promise<any>;
  };
  error: {
    report: (error: any) => Promise<any>;
    getLogs: () => Promise<any>;
  };
  window: {
    minimize: () => Promise<any>;
    maximize: () => Promise<any>;
    close: () => Promise<any>;
    toggleDevTools: () => Promise<any>;
  };
  dialog: {
    selectFolder: () => Promise<any>;
  };
  on: (channel: string, callback: (data: any) => void) => void;
  removeListener: (channel: string, callback: (data: any) => void) => void;
}

// Expose secure API to renderer process
const electronAPI: ElectronAPI = {
  // Project Management
  project: {
    create: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CREATE, data),
    open: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_OPEN, projectId),
    save: (projectData: any) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_SAVE, projectData),
    delete: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_DELETE, projectId),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_LIST),
    getCurrent: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_CURRENT),
  },

  // File Operations
  file: {
    read: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, filePath),
    write: (filePath: string, content: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.FILE_WRITE, filePath, content),
    delete: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_DELETE, filePath),
    rename: (oldPath: string, newPath: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.FILE_RENAME, oldPath, newPath),
    list: (directoryPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_LIST, directoryPath),
    watch: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_WATCH, filePath),
    unwatch: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_UNWATCH, filePath),
  },

  // Agent Communication
  agent: {
    sendMessage: (message: any) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_SEND_MESSAGE, message),
    getResponse: (messageId: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.AGENT_GET_RESPONSE, messageId),
    listAvailable: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_LIST_AVAILABLE),
    getStatus: (agentId: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_GET_STATUS, agentId),
    executeTask: (task: any) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_EXECUTE_TASK, task),
  },

  // Virtual File System
  virtualFile: {
    create: (fileData: any) => ipcRenderer.invoke(IPC_CHANNELS.VIRTUAL_FILE_CREATE, fileData),
    read: (fileId: string) => ipcRenderer.invoke(IPC_CHANNELS.VIRTUAL_FILE_READ, fileId),
    update: (fileId: string, content: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.VIRTUAL_FILE_UPDATE, fileId, content),
    delete: (fileId: string) => ipcRenderer.invoke(IPC_CHANNELS.VIRTUAL_FILE_DELETE, fileId),
    list: (filter?: any) => ipcRenderer.invoke(IPC_CHANNELS.VIRTUAL_FILE_LIST, filter),
  },

  // Database Operations
  database: {
    query: (sql: string, params?: any[]) => ipcRenderer.invoke(IPC_CHANNELS.DB_QUERY, sql, params),
    execute: (sql: string, params?: any[]) => 
      ipcRenderer.invoke(IPC_CHANNELS.DB_EXECUTE, sql, params),
    transaction: (operations: any[]) => 
      ipcRenderer.invoke(IPC_CHANNELS.DB_TRANSACTION, operations),
  },

  // Settings and Configuration
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    set: (key: string, value: any) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
    reset: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESET),
  },

  // Application Info
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
    getPath: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PATH, name),
    quit: () => ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT),
  },

  // Error Handling
  error: {
    report: (error: any) => ipcRenderer.invoke(IPC_CHANNELS.ERROR_REPORT, error),
    getLogs: () => ipcRenderer.invoke(IPC_CHANNELS.ERROR_GET_LOGS),
  },

  // Window Management
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    toggleDevTools: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_TOGGLE_DEVTOOLS),
  },

  // Dialog
  dialog: {
    selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
  },

  // Event Listeners
  on: (channel: string, callback: (data: any) => void) => {
    // Validate channel for security - allow valid prefixes or exact matches
    const validChannels = Object.values(IPC_CHANNELS);
    const validPrefixes = ['agent:', 'file:', 'project:', 'virtual-file:', 'db:', 'settings:', 'app:', 'error:', 'window:', 'dialog:'];
    const isValid = validChannels.includes(channel as any) || 
                    validPrefixes.some(prefix => channel.startsWith(prefix));
    
    if (isValid) {
      ipcRenderer.on(channel, (_, data) => callback(data));
    } else {
      console.warn('Attempted to listen on invalid channel:', channel);
    }
  },

  removeListener: (channel: string, _callback?: any) => {
    // Remove all listeners for the channel (simpler than tracking wrapped functions)
    ipcRenderer.removeAllListeners(channel);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
