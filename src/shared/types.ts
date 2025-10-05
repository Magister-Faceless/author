// Core application types and interfaces

export interface Project {
  id: string;
  name: string;
  description?: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  genre?: string;
  targetWordCount?: number;
  dailyWordGoal?: number;
  autoSave: boolean;
  backupEnabled: boolean;
  aiAssistanceLevel: 'minimal' | 'moderate' | 'extensive';
}

export interface FileMetadata {
  id: string;
  name: string;
  path: string;
  type: 'chapter' | 'character' | 'outline' | 'research' | 'notes';
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  traits: string[];
  backstory?: string;
  goals?: string[];
  conflicts?: string[];
  relationships: CharacterRelationship[];
  projectId: string;
}

export interface CharacterRelationship {
  characterId: string;
  type: 'family' | 'friend' | 'enemy' | 'romantic' | 'professional' | 'other';
  description: string;
  strength: number; // 1-10 scale
}

export interface WritingSession {
  id: string;
  projectId: string;
  startTime: Date;
  endTime?: Date;
  wordsWritten: number;
  filesModified: string[];
  notes?: string;
}

export interface AgentTask {
  id: string;
  type: 'planning' | 'writing' | 'editing' | 'research';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  description: string;
  context?: Record<string, any>;
  result?: string;
  createdAt: Date;
  completedAt?: Date;
  agentId: string;
}

export interface VirtualFile {
  id: string;
  name: string;
  type: 'progress' | 'context' | 'summary' | 'todo';
  content: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  sessionId?: string;
}

// IPC Communication Types
export interface IpcRequest {
  id: string;
  channel: string;
  data: any;
}

export interface IpcResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

// Agent Communication Types
export interface AgentMessage {
  id: string;
  agentId: string;
  type: 'request' | 'response' | 'notification';
  content: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface AgentCapabilities {
  planning: boolean;
  writing: boolean;
  editing: boolean;
  research: boolean;
  fileManagement: boolean;
}

// UI State Types
export interface AppState {
  currentProject?: Project;
  activeFile?: FileMetadata;
  sidebarVisible: boolean;
  agentPanelVisible: boolean;
  currentView: 'editor' | 'outline' | 'characters' | 'research' | 'analytics';
}

export interface EditorState {
  content: string;
  cursorPosition: number;
  selection?: {
    start: number;
    end: number;
  };
  isDirty: boolean;
  lastSaved: Date;
}

// Error Types
export class AuthorError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AuthorError';
  }
}

export interface ErrorInfo {
  message: string;
  code: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: Date;
}
