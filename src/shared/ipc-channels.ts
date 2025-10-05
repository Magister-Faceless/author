// IPC channel constants for secure communication between main and renderer processes

export const IPC_CHANNELS = {
  // Project Management
  PROJECT_CREATE: 'project:create',
  PROJECT_OPEN: 'project:open',
  PROJECT_SAVE: 'project:save',
  PROJECT_DELETE: 'project:delete',
  PROJECT_LIST: 'project:list',
  PROJECT_GET_CURRENT: 'project:get-current',

  // File Operations
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_DELETE: 'file:delete',
  FILE_RENAME: 'file:rename',
  FILE_WATCH: 'file:watch',
  FILE_UNWATCH: 'file:unwatch',
  FILE_LIST: 'file:list',

  // Agent Communication
  AGENT_SEND_MESSAGE: 'agent:send-message',
  AGENT_GET_RESPONSE: 'agent:get-response',
  AGENT_LIST_AVAILABLE: 'agent:list-available',
  AGENT_GET_STATUS: 'agent:get-status',
  AGENT_EXECUTE_TASK: 'agent:execute-task',
  
  // Agent Events (Streaming)
  AGENT_STREAM_START: 'agent:stream-start',
  AGENT_STREAM_CHUNK: 'agent:stream-chunk',
  AGENT_STREAM_END: 'agent:stream-end',
  AGENT_MESSAGE: 'agent:message',
  AGENT_ERROR: 'agent:error',
  AGENT_TODOS: 'agent:todos',
  AGENT_FILE_OPERATION: 'agent:file-operation',
  AGENT_DELEGATED: 'agent:delegated',
  AGENT_SESSION_STARTED: 'agent:session-started',
  AGENT_QUERY_COMPLETE: 'agent:query-complete',

  // Virtual File System
  VIRTUAL_FILE_CREATE: 'virtual-file:create',
  VIRTUAL_FILE_READ: 'virtual-file:read',
  VIRTUAL_FILE_UPDATE: 'virtual-file:update',
  VIRTUAL_FILE_DELETE: 'virtual-file:delete',
  VIRTUAL_FILE_LIST: 'virtual-file:list',

  // Database Operations
  DB_QUERY: 'db:query',
  DB_EXECUTE: 'db:execute',
  DB_TRANSACTION: 'db:transaction',

  // Settings and Configuration
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_RESET: 'settings:reset',

  // Application Lifecycle
  APP_READY: 'app:ready',
  APP_QUIT: 'app:quit',
  APP_GET_VERSION: 'app:get-version',
  APP_GET_PATH: 'app:get-path',

  // Error Handling
  ERROR_REPORT: 'error:report',
  ERROR_GET_LOGS: 'error:get-logs',

  // Backup and Sync
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_LIST: 'backup:list',

  // Analytics and Metrics
  ANALYTICS_TRACK_EVENT: 'analytics:track-event',
  ANALYTICS_GET_STATS: 'analytics:get-stats',

  // Window Management
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_TOGGLE_DEVTOOLS: 'window:toggle-devtools',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
