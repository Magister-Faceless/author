# VS Code-like UI Redesign Plan

**Date**: 2025-10-05  
**Goal**: Transform Author into a VS Code/Windsurf-like experience

---

## 🎯 Target Design

### **Welcome Screen (Image 1)**
- Clean, centered layout
- "Open Folder" button (primary action)
- "Generate a New Project" button
- Recent projects list on the right
- Dark theme, minimalist design

### **Workspace Screen (Image 2)**
- **3-column layout**:
  1. **Left**: File Explorer (folder tree)
  2. **Center**: Multi-tab Editor
  3. **Right**: Chat Panel with threads
- All columns resizable but not closable
- Professional, VS Code-like appearance

---

## 📋 Components to Build

### 1. **WelcomeScreen Component**
**File**: `src/renderer/components/WelcomeScreen.tsx`

**Features**:
- ✅ Large "Open Folder" button
- ✅ "Generate a New Project" button
- ✅ Recent projects list
- ✅ Clean, centered design
- ✅ Keyboard shortcuts display

**Actions**:
- Open folder → Select existing folder → Open workspace
- Generate project → Create new project → Open workspace
- Click recent project → Open workspace

---

### 2. **FileExplorer Component**
**File**: `src/renderer/components/FileExplorer.tsx`

**Features**:
- ✅ Folder tree view
- ✅ File tree view
- ✅ Expand/collapse folders
- ✅ File icons
- ✅ Right-click context menu:
  - New File
  - New Folder
  - Rename
  - Delete
- ✅ Click file → Open in editor
- ✅ Drag file → Open in new tab

**Structure**:
```
📁 project-name
  📁 chapters
    📄 chapter-01.md
    📄 chapter-02.md
  📁 characters
    📄 protagonist.md
  📁 outlines
  📁 research
  📁 notes
```

---

### 3. **MultiTabEditor Component**
**File**: `src/renderer/components/MultiTabEditor.tsx`

**Features**:
- ✅ Tab bar at top
- ✅ Multiple open files
- ✅ Click tab → Switch to file
- ✅ Close button on each tab
- ✅ Unsaved indicator (dot)
- ✅ Active tab highlight
- ✅ Editor area below tabs
- ✅ Auto-save on change
- ✅ Word count display
- ✅ Line/column indicator

**Tab Structure**:
```
[chapter-01.md ●] [chapter-02.md] [protagonist.md ×]
─────────────────────────────────────────────────────
Editor content here...
```

---

### 4. **ChatPanel Component** (Enhanced)
**File**: `src/renderer/components/ChatPanel.tsx`

**Features**:
- ✅ Chat threads list (top)
- ✅ Active chat area (middle)
- ✅ Input area (bottom)
- ✅ New thread button
- ✅ Thread history
- ✅ Thread switching
- ✅ Agent selection
- ✅ Message streaming

**Structure**:
```
┌─────────────────────┐
│ Threads             │
│ ● Chapter 1 Help    │
│   Character Dev     │
│   Plot Ideas        │
├─────────────────────┤
│ Chat Messages       │
│ User: Help me...    │
│ AI: Sure! Here's... │
├─────────────────────┤
│ [Input] [Send]      │
└─────────────────────┘
```

---

### 5. **WorkspaceLayout Component**
**File**: `src/renderer/components/WorkspaceLayout.tsx`

**Features**:
- ✅ 3-column resizable layout
- ✅ Drag handles between columns
- ✅ Min/max widths
- ✅ Persistent column sizes
- ✅ Smooth resizing

**Layout**:
```
┌──────┬─────────────────┬──────────┐
│ File │   Editor Tabs   │  Chat    │
│ Tree │ ─────────────── │ Threads  │
│      │                 │          │
│ 📁   │  Editor Area    │ Messages │
│ 📄   │                 │          │
│      │                 │ [Input]  │
└──────┴─────────────────┴──────────┘
 200px      Flexible        350px
```

---

## 🔧 Implementation Steps

### **Phase 1: Welcome Screen** ✅
1. Create WelcomeScreen component
2. Add "Open Folder" functionality
3. Add "Generate Project" functionality
4. Display recent projects
5. Route to workspace on selection

### **Phase 2: File Explorer** ✅
1. Create FileExplorer component
2. Implement folder tree
3. Add file operations (create, delete, rename)
4. Add context menu
5. Integrate with file system

### **Phase 3: Multi-Tab Editor** ✅
1. Create MultiTabEditor component
2. Implement tab management
3. Add file content loading
4. Add save functionality
5. Add tab switching

### **Phase 4: Enhanced Chat Panel** ✅
1. Update ChatPanel component
2. Add thread management
3. Add thread history
4. Add thread switching
5. Integrate with agent service

### **Phase 5: Workspace Layout** ✅
1. Create WorkspaceLayout component
2. Implement 3-column design
3. Add resize handles
4. Add min/max constraints
5. Persist column sizes

### **Phase 6: Integration** ✅
1. Update routing
2. Connect all components
3. Add state management
4. Test all features
5. Polish UI/UX

---

## 📊 State Management

### **App Store Updates**:
```typescript
interface AppStore {
  // Workspace
  currentWorkspace: string | null;
  
  // File Explorer
  fileTree: FileNode[];
  expandedFolders: Set<string>;
  
  // Editor
  openTabs: EditorTab[];
  activeTabId: string | null;
  
  // Chat
  chatThreads: ChatThread[];
  activeThreadId: string | null;
  
  // Layout
  columnWidths: {
    explorer: number;
    editor: number;
    chat: number;
  };
}
```

---

## 🎨 Styling

### **Theme**:
- Background: `#1e1e1e`
- Sidebar: `#252526`
- Editor: `#1e1e1e`
- Text: `#cccccc`
- Accent: `#4a9eff`
- Border: `#3a3a3a`

### **Typography**:
- Font: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`
- Code: `'Consolas', 'Courier New', monospace`

---

## ✅ Success Criteria

- [ ] Welcome screen matches Image 1
- [ ] Workspace matches Image 2
- [ ] All columns resizable
- [ ] File operations work
- [ ] Multi-tab editor works
- [ ] Chat threads work
- [ ] Professional appearance
- [ ] Smooth performance

---

This will transform Author into a true VS Code-like book writing IDE! 🚀
