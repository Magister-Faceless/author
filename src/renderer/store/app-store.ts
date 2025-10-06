import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, FileMetadata, EditorState } from '@shared/types';

// File tree node
export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isExpanded?: boolean;
}

// Editor tab
export interface EditorTab {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  isDirty: boolean;
  isActive: boolean;
}

// Chat thread
export interface ChatThread {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface AppStore {
  // Project & Workspace
  currentProject: Project | undefined;
  projects: Project[];
  
  // File Explorer
  fileTree: FileNode[];
  expandedFolders: Set<string>;
  selectedFile: string | null;
  
  // Multi-tab Editor
  openTabs: EditorTab[];
  activeTabId: string | null;
  
  // Chat
  chatThreads: ChatThread[];
  activeThreadId: string | null;
  
  // Author Mode
  authorMode: 'fiction' | 'non-fiction' | 'academic';
  
  // Layout
  columnWidths: {
    explorer: number;
    editor: number;
    chat: number;
  };
  
  // Legacy (for compatibility)
  activeFile: FileMetadata | undefined;
  sidebarVisible: boolean;
  agentPanelVisible: boolean;
  currentView: 'editor' | 'outline' | 'characters' | 'research' | 'analytics';
  files: FileMetadata[];
  editorState: EditorState;
  isAppReady: boolean;
  
  // Project Actions
  setCurrentProject: (project: Project | undefined) => void;
  setProjects: (projects: Project[]) => void;
  
  // File Explorer Actions
  setFileTree: (tree: FileNode[]) => void;
  toggleFolder: (folderId: string) => void;
  setSelectedFile: (filePath: string | null) => void;
  addFileToTree: (parentPath: string, file: FileNode) => void;
  removeFileFromTree: (filePath: string) => void;
  
  // Editor Tab Actions
  openTab: (file: { path: string; name: string; content: string }) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  markTabDirty: (tabId: string, isDirty: boolean) => void;
  closeAllTabs: () => void;
  
  // Chat Thread Actions
  createThread: (name?: string) => string;
  deleteThread: (threadId: string) => void;
  setActiveThread: (threadId: string) => void;
  addMessageToThread: (threadId: string, message: Omit<ChatMessage, 'id'>) => void;
  updateThreadName: (threadId: string, name: string) => void;
  
  // Author Mode Actions
  setAuthorMode: (mode: 'fiction' | 'non-fiction' | 'academic') => void;
  getAuthorMode: () => 'fiction' | 'non-fiction' | 'academic';
  
  // Layout Actions
  setColumnWidth: (column: 'explorer' | 'editor' | 'chat', width: number) => void;
  
  // Legacy Actions (for compatibility)
  setActiveFile: (file: FileMetadata | undefined) => void;
  setSidebarVisible: (visible: boolean) => void;
  setAgentPanelVisible: (visible: boolean) => void;
  setCurrentView: (view: 'editor' | 'outline' | 'characters' | 'research' | 'analytics') => void;
  setFiles: (files: FileMetadata[]) => void;
  setEditorState: (state: Partial<EditorState>) => void;
  setAppReady: (ready: boolean) => void;
  
  // Computed
  getCurrentProject: () => Project | undefined;
  getActiveFile: () => FileMetadata | undefined;
  getActiveTab: () => EditorTab | undefined;
  getActiveThread: () => ChatThread | undefined;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: undefined,
      projects: [],
      
      // File Explorer
      fileTree: [],
      expandedFolders: new Set<string>(),
      selectedFile: null,
      
      // Multi-tab Editor
      openTabs: [],
      activeTabId: null,
      
      // Chat
      chatThreads: [],
      activeThreadId: null,
      
      // Author Mode
      authorMode: 'fiction', // Default to fiction mode
      
      // Layout
      columnWidths: {
        explorer: 250,
        editor: 0, // Will be calculated
        chat: 350,
      },
      
      // Legacy
      activeFile: undefined,
      sidebarVisible: true,
      agentPanelVisible: true,
      currentView: 'editor',
      files: [],
      isAppReady: false,
      editorState: {
        content: '',
        cursorPosition: 0,
        isDirty: false,
        lastSaved: new Date(),
      },
      
      // Project Actions
      setCurrentProject: (project) => set({ currentProject: project }),
      setProjects: (projects) => set({ projects }),
      
      // File Explorer Actions
      setFileTree: (tree) => set({ fileTree: tree }),
      
      toggleFolder: (folderId) => set((state) => {
        const expanded = new Set(state.expandedFolders);
        if (expanded.has(folderId)) {
          expanded.delete(folderId);
        } else {
          expanded.add(folderId);
        }
        return { expandedFolders: expanded };
      }),
      
      setSelectedFile: (filePath) => set({ selectedFile: filePath }),
      
      addFileToTree: (_parentPath, _file) => set((state) => {
        // Implementation would recursively find parent and add file
        return { fileTree: [...state.fileTree] };
      }),
      
      removeFileFromTree: (_filePath) => set((state) => {
        // Implementation would recursively find and remove file
        return { fileTree: [...state.fileTree] };
      }),
      
      // Editor Tab Actions
      openTab: (file) => set((state) => {
        // Check if tab already exists
        const existingTab = state.openTabs.find(t => t.filePath === file.path);
        if (existingTab) {
          // Just activate it
          return {
            openTabs: state.openTabs.map(t => ({
              ...t,
              isActive: t.id === existingTab.id
            })),
            activeTabId: existingTab.id
          };
        }
        
        // Create new tab
        const newTab: EditorTab = {
          id: `tab-${Date.now()}`,
          filePath: file.path,
          fileName: file.name,
          content: file.content,
          isDirty: false,
          isActive: true
        };
        
        return {
          openTabs: [
            ...state.openTabs.map(t => ({ ...t, isActive: false })),
            newTab
          ],
          activeTabId: newTab.id
        };
      }),
      
      closeTab: (tabId) => set((state) => {
        const tabs = state.openTabs.filter(t => t.id !== tabId);
        let newActiveId = state.activeTabId;
        
        // If closing active tab, activate another
        if (state.activeTabId === tabId && tabs.length > 0) {
          newActiveId = tabs[tabs.length - 1].id;
          tabs[tabs.length - 1].isActive = true;
        }
        
        return {
          openTabs: tabs,
          activeTabId: tabs.length > 0 ? newActiveId : null
        };
      }),
      
      setActiveTab: (tabId) => set((state) => ({
        openTabs: state.openTabs.map(t => ({
          ...t,
          isActive: t.id === tabId
        })),
        activeTabId: tabId
      })),
      
      updateTabContent: (tabId, content) => set((state) => ({
        openTabs: state.openTabs.map(t =>
          t.id === tabId ? { ...t, content } : t
        )
      })),
      
      markTabDirty: (tabId, isDirty) => set((state) => ({
        openTabs: state.openTabs.map(t =>
          t.id === tabId ? { ...t, isDirty } : t
        )
      })),
      
      closeAllTabs: () => set({ openTabs: [], activeTabId: null }),
      
      // Chat Thread Actions
      createThread: (name) => {
        const threadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const thread: ChatThread = {
          id: threadId,
          name: name || `Chat ${get().chatThreads.length + 1}`,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        set((state) => ({
          chatThreads: [...state.chatThreads, thread],
          activeThreadId: threadId
        }));
        
        return threadId;
      },
      
      deleteThread: (threadId) => set((state) => {
        const threads = state.chatThreads.filter(t => t.id !== threadId);
        let newActiveId = state.activeThreadId;
        
        if (state.activeThreadId === threadId && threads.length > 0) {
          newActiveId = threads[0].id;
        }
        
        return {
          chatThreads: threads,
          activeThreadId: threads.length > 0 ? newActiveId : null
        };
      }),
      
      setActiveThread: (threadId) => set({ activeThreadId: threadId }),
      
      addMessageToThread: (threadId, message) => set((state) => ({
        chatThreads: state.chatThreads.map(t =>
          t.id === threadId
            ? {
                ...t,
                messages: [...t.messages, { 
                  ...message, 
                  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
                }],
                updatedAt: new Date()
              }
            : t
        )
      })),
      
      updateThreadName: (threadId, name) => set((state) => ({
        chatThreads: state.chatThreads.map(t =>
          t.id === threadId ? { ...t, name } : t
        )
      })),
      
      // Author Mode Actions
      setAuthorMode: (mode) => set({ authorMode: mode }),
      getAuthorMode: () => get().authorMode,
      
      // Layout Actions
      setColumnWidth: (column, width) => set((state) => ({
        columnWidths: { ...state.columnWidths, [column]: width }
      })),
      
      // Legacy Actions
      setActiveFile: (file) => set({ activeFile: file }),
      setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
      setAgentPanelVisible: (visible) => set({ agentPanelVisible: visible }),
      setCurrentView: (view) => set({ currentView: view }),
      setFiles: (files) => set({ files }),
      setAppReady: (ready) => set({ isAppReady: ready }),
      
      setEditorState: (newState) => set((state) => ({
        editorState: { ...state.editorState, ...newState }
      })),
      
      // Computed
      getCurrentProject: () => get().currentProject,
      getActiveFile: () => get().activeFile,
      getActiveTab: () => get().openTabs.find(t => t.id === get().activeTabId),
      getActiveThread: () => get().chatThreads.find(t => t.id === get().activeThreadId),
    }),
    {
      name: 'author-app-storage',
      partialize: (state) => ({
        columnWidths: state.columnWidths,
        expandedFolders: Array.from(state.expandedFolders),
        authorMode: state.authorMode, // Persist author mode
        chatThreads: state.chatThreads, // Persist chat threads
        activeThreadId: state.activeThreadId, // Persist active thread
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        expandedFolders: new Set(persistedState.expandedFolders || []),
        chatThreads: persistedState.chatThreads || [],
        activeThreadId: persistedState.activeThreadId || null,
      }),
    }
  )
);
