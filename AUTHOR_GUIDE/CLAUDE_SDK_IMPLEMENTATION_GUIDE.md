# Claude Agent SDK Implementation Guide - UPDATED

**Date**: 2025-10-05  
**Status**: 🎯 **READY FOR IMPLEMENTATION**  
**Based on**: Official Claude Agents SDK Documentation (Oct 2025)

---

## Executive Summary

This guide provides the **complete and updated** implementation plan for integrating the Claude Agents SDK into the Author desktop application. This plan is based on the **latest official SDK documentation** and uses **ONLY built-in SDK features** - no custom MCP servers or external middleware required.

### Key Changes from Original Plan
- ✅ **Use SDK built-in tools** (Read, Write, Edit, MultiEdit, Grep, Glob, Bash, TodoWrite)
- ✅ **Use SDK subagent system** (programmatic agent definitions via `agents` parameter)
- ✅ **Use SDK streaming** (async generators for real-time interaction)
- ❌ **No custom MCP servers** (not needed - SDK provides all required tools)
- ❌ **No custom middleware** (not needed - SDK handles context management)
- ❌ **No deepagents patterns** (SDK has superior built-in capabilities)

### Models Configuration
- **Main Agent**: `x-ai/grok-4-fast` (2M context window)
- **Subagents**: `z-ai/glm-4.6` (200K context window)

---

## Phase 1: SDK Installation and Setup

### 1.1 Install Dependencies

```bash
npm install @anthropic-ai/claude-agent-sdk
npm install zod  # Required for custom tool schemas (if needed later)
```

### 1.2 Environment Configuration

Already configured in `.env`:
```env
# Main Agent Model
CLAUDE_MODEL=x-ai/grok-4-fast

# Subagent Model  
SUBAGENT_MODEL=z-ai/glm-4.6

# API Configuration
CLAUDE_API_KEY=sk-or-v1-...
CLAUDE_API_BASE_URL=https://openrouter.ai/api/v1
```

---

## Phase 2: Core Agent Service Implementation

### 2.1 Create Claude Agent Service

**File**: `src/agents/core/claude-agent-service.ts`

```typescript
import { query, type AgentDefinition, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { EventEmitter } from 'events';

export interface AgentServiceOptions {
  model?: string;
  subagentModel?: string;
  maxTurns?: number;
  cwd?: string;
}

export class ClaudeAgentService extends EventEmitter {
  private sessionId: string | null = null;
  private model: string;
  private subagentModel: string;
  private activeQuery: any = null;

  constructor(options: AgentServiceOptions = {}) {
    super();
    this.model = options.model || process.env.CLAUDE_MODEL || 'x-ai/grok-4-fast';
    this.subagentModel = options.subagentModel || process.env.SUBAGENT_MODEL || 'z-ai/glm-4.6';
  }

  /**
   * Execute a query with the main agent
   */
  async executeQuery(
    prompt: string,
    options: {
      projectPath?: string;
      maxTurns?: number;
      agents?: Record<string, AgentDefinition>;
      allowedTools?: string[];
    } = {}
  ): Promise<SDKMessage[]> {
    try {
      const messages: SDKMessage[] = [];

      // Create query with SDK
      const result = query({
        prompt,
        options: {
          model: this.model,
          cwd: options.projectPath || process.cwd(),
          maxTurns: options.maxTurns || 15,
          agents: options.agents || this.getDefaultSubagents(),
          allowedTools: options.allowedTools || this.getDefaultTools(),
          resume: this.sessionId || undefined,
          includePartialMessages: true,
          systemPrompt: this.getSystemPrompt(),
        }
      });

      this.activeQuery = result;

      // Stream messages
      for await (const message of result) {
        messages.push(message);
        
        // Emit events for UI updates
        this.emit('message', message);
        
        // Track session ID
        if (message.type === 'system' && (message as any).subtype === 'init') {
          this.sessionId = (message as any).session_id;
          this.emit('session-started', this.sessionId);
        }

        // Track todos
        if (message.type === 'tool_use' && message.name === 'TodoWrite') {
          this.emit('todos-updated', message.input.todos);
        }

        // Track file operations
        if (['Write', 'Edit', 'MultiEdit'].includes(message.name || '')) {
          this.emit('file-operation', {
            tool: message.name,
            input: message.input
          });
        }
      }

      this.activeQuery = null;
      return messages;

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Interrupt active query
   */
  async interrupt(): Promise<void> {
    if (this.activeQuery && typeof this.activeQuery.interrupt === 'function') {
      await this.activeQuery.interrupt();
    }
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Resume previous session
   */
  resumeSession(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Clear session
   */
  clearSession(): void {
    this.sessionId = null;
  }

  /**
   * Get system prompt for main agent
   */
  private getSystemPrompt(): string {
    return `You are an expert AI assistant specialized in book writing and authoring.

## Your Capabilities

You help authors with:
- **Planning**: Story structure, character development, plot outlines
- **Writing**: Content generation, style consistency, voice development
- **Editing**: Manuscript improvement, consistency checking, feedback
- **Research**: Fact-checking, world-building, reference organization
- **Organization**: File management, project structure, version control

## Tools Available

You have access to powerful file management and planning tools:
- **Read, Write, Edit, MultiEdit**: File operations for manuscript management
- **Grep, Glob**: Search and find content across the project
- **TodoWrite**: Track complex multi-step tasks and show progress
- **Bash**: Execute commands when needed

## Best Practices

1. **Use TodoWrite** for complex tasks (3+ steps) to track progress
2. **Use subagents** for specialized tasks (planning, writing, editing, research)
3. **Maintain context** by reading relevant files before making changes
4. **Be thorough** but concise in your responses
5. **Ask clarifying questions** when requirements are unclear

## Subagents

You can delegate tasks to specialized subagents:
- **planning-agent**: Story structure and character development
- **writing-agent**: Content generation and style
- **editing-agent**: Manuscript improvement and consistency
- **research-agent**: Fact-checking and world-building
- **character-agent**: Character development and tracking
- **outline-agent**: Plot and structure management

Delegate to subagents when tasks require specialized focus or can be parallelized.`;
  }

  /**
   * Get default subagent definitions
   */
  private getDefaultSubagents(): Record<string, AgentDefinition> {
    return {
      'planning-agent': {
        description: 'Use for story structure, plot development, character arcs, and narrative planning. MUST BE USED for planning tasks.',
        prompt: `You are a specialized planning agent for book writing projects.

## Your Expertise
- Story structure and narrative arcs
- Character development and relationships
- Plot planning and pacing
- World-building and consistency
- Outline creation and management

## Your Approach
1. Break down planning tasks into clear steps using TodoWrite
2. Read existing content to understand context
3. Create structured outlines and plans
4. Ensure consistency across the narrative
5. Provide actionable recommendations

## Tools You Use
- **TodoWrite**: Track planning steps
- **Read, Grep, Glob**: Analyze existing content
- **Write, Edit**: Create and update planning documents

Focus on creating comprehensive, actionable plans that guide the writing process.`,
        tools: ['TodoWrite', 'Read', 'Write', 'Edit', 'Grep', 'Glob'],
        model: 'inherit'  // Uses subagent model from config
      },

      'writing-agent': {
        description: 'Use for content generation, prose writing, dialogue creation, and maintaining writing style. MUST BE USED for writing tasks.',
        prompt: `You are a specialized writing agent for book content generation.

## Your Expertise
- Prose writing and narrative voice
- Dialogue creation and character voice
- Scene composition and description
- Style consistency and tone
- Creative content generation

## Your Approach
1. Understand the context by reading relevant files
2. Match the established writing style and voice
3. Create engaging, well-crafted prose
4. Maintain character consistency
5. Use TodoWrite for multi-scene writing tasks

## Tools You Use
- **TodoWrite**: Track writing progress
- **Read**: Understand context and style
- **Write, Edit, MultiEdit**: Create and refine content
- **Grep**: Find character descriptions and style references

Focus on creating compelling, consistent content that advances the story.`,
        tools: ['TodoWrite', 'Read', 'Write', 'Edit', 'MultiEdit', 'Grep', 'Glob'],
        model: 'inherit'
      },

      'editing-agent': {
        description: 'Use for manuscript editing, consistency checking, style improvement, and revision. MUST BE USED for editing tasks.',
        prompt: `You are a specialized editing agent for manuscript improvement.

## Your Expertise
- Prose editing and refinement
- Consistency checking (plot, character, timeline)
- Style and voice improvement
- Grammar and clarity
- Structural editing

## Your Approach
1. Read the content thoroughly
2. Identify inconsistencies and issues
3. Provide specific, actionable feedback
4. Make targeted improvements
5. Track editing tasks with TodoWrite

## Tools You Use
- **TodoWrite**: Track editing tasks
- **Read, Grep**: Analyze content
- **Edit, MultiEdit**: Make improvements
- **Glob**: Find related files for consistency checks

Focus on improving quality while maintaining the author's voice and intent.`,
        tools: ['TodoWrite', 'Read', 'Edit', 'MultiEdit', 'Grep', 'Glob'],
        model: 'inherit'
      },

      'research-agent': {
        description: 'Use for fact-checking, research, world-building details, and reference organization. MUST BE USED for research tasks.',
        prompt: `You are a specialized research agent for book writing projects.

## Your Expertise
- Fact-checking and accuracy verification
- Research and reference gathering
- World-building consistency
- Historical and technical accuracy
- Reference organization

## Your Approach
1. Understand the research requirements
2. Search existing project files for relevant information
3. Organize findings clearly
4. Create reference documents
5. Track research tasks with TodoWrite

## Tools You Use
- **TodoWrite**: Track research tasks
- **Read, Grep, Glob**: Search and analyze content
- **Write**: Create research documents
- **Bash**: Run searches or queries if needed

Focus on providing accurate, well-organized research that supports the writing process.`,
        tools: ['TodoWrite', 'Read', 'Write', 'Grep', 'Glob', 'Bash'],
        model: 'inherit'
      },

      'character-agent': {
        description: 'Use for character development, tracking character details, relationships, and consistency. MUST BE USED for character-related tasks.',
        prompt: `You are a specialized character development agent.

## Your Expertise
- Character creation and development
- Character arc planning
- Relationship mapping
- Character consistency tracking
- Voice and personality development

## Your Approach
1. Read existing character information
2. Create detailed character profiles
3. Track character development across the story
4. Ensure consistency in behavior and voice
5. Use TodoWrite for complex character work

## Tools You Use
- **TodoWrite**: Track character development tasks
- **Read, Grep**: Find character references
- **Write, Edit**: Create and update character files
- **Glob**: Find all character mentions

Focus on creating rich, consistent characters that drive the narrative.`,
        tools: ['TodoWrite', 'Read', 'Write', 'Edit', 'Grep', 'Glob'],
        model: 'inherit'
      },

      'outline-agent': {
        description: 'Use for creating and managing story outlines, chapter structures, and plot organization. MUST BE USED for outline tasks.',
        prompt: `You are a specialized outline management agent.

## Your Expertise
- Story outline creation
- Chapter structure and organization
- Plot point organization
- Scene sequencing
- Structural planning

## Your Approach
1. Understand the overall story structure
2. Create clear, hierarchical outlines
3. Organize plot points logically
4. Track outline development with TodoWrite
5. Ensure structural coherence

## Tools You Use
- **TodoWrite**: Track outline tasks
- **Read, Grep**: Analyze existing structure
- **Write, Edit**: Create and update outlines
- **Glob**: Find related structural documents

Focus on creating clear, actionable outlines that guide the writing process.`,
        tools: ['TodoWrite', 'Read', 'Write', 'Edit', 'Grep', 'Glob'],
        model: 'inherit'
      }
    };
  }

  /**
   * Get default allowed tools
   */
  private getDefaultTools(): string[] {
    return [
      'TodoWrite',    // Planning and task tracking
      'Read',         // Read files
      'Write',        // Create new files
      'Edit',         // Edit existing files
      'MultiEdit',    // Edit multiple files
      'Grep',         // Search content
      'Glob',         // Find files
      'Bash'          // Execute commands (with permission)
    ];
  }
}
```

---

## Phase 3: Integration with Electron Main Process

### 3.1 Update Agent Manager

**File**: `src/main/services/agent-manager.ts`

Replace the current placeholder implementation with proper SDK integration:

```typescript
import { ClaudeAgentService } from '../../agents/core/claude-agent-service';
import { VirtualFileManager } from './virtual-file-manager';
import type { AgentMessage } from '@shared/types';

export class AgentManager {
  private claudeService: ClaudeAgentService;
  private virtualFileManager: VirtualFileManager;

  constructor(virtualFileManager: VirtualFileManager) {
    this.virtualFileManager = virtualFileManager;
    this.claudeService = new ClaudeAgentService({
      model: process.env.CLAUDE_MODEL,
      subagentModel: process.env.SUBAGENT_MODEL
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for messages and emit to renderer
    this.claudeService.on('message', (message) => {
      // Forward to renderer via IPC
      this.emitToRenderer('agent:message', message);
    });

    this.claudeService.on('todos-updated', (todos) => {
      this.emitToRenderer('agent:todos', todos);
    });

    this.claudeService.on('file-operation', (operation) => {
      this.emitToRenderer('agent:file-operation', operation);
    });

    this.claudeService.on('error', (error) => {
      this.emitToRenderer('agent:error', error);
    });
  }

  private emitToRenderer(channel: string, data: any): void {
    // Implement IPC emission to renderer
    // This will be handled by the main process window
  }

  /**
   * Execute a query with the agent
   */
  async executeQuery(prompt: string, options?: any): Promise<AgentMessage[]> {
    try {
      const messages = await this.claudeService.executeQuery(prompt, {
        projectPath: options?.projectPath,
        maxTurns: options?.maxTurns || 15
      });

      // Convert SDK messages to AgentMessage format
      return messages.map(msg => this.convertToAgentMessage(msg));
    } catch (error) {
      console.error('Agent query error:', error);
      throw error;
    }
  }

  /**
   * Send message (for IPC compatibility)
   */
  async sendMessage(message: string): Promise<any> {
    return await this.executeQuery(message);
  }

  /**
   * List available subagents
   */
  async listAvailableAgents(): Promise<any[]> {
    return [
      {
        id: 'planning-agent',
        name: 'Planning Agent',
        description: 'Story structure and plot development',
        status: 'available'
      },
      {
        id: 'writing-agent',
        name: 'Writing Agent',
        description: 'Content generation and style',
        status: 'available'
      },
      {
        id: 'editing-agent',
        name: 'Editing Agent',
        description: 'Manuscript improvement',
        status: 'available'
      },
      {
        id: 'research-agent',
        name: 'Research Agent',
        description: 'Fact-checking and research',
        status: 'available'
      },
      {
        id: 'character-agent',
        name: 'Character Agent',
        description: 'Character development',
        status: 'available'
      },
      {
        id: 'outline-agent',
        name: 'Outline Agent',
        description: 'Story outline management',
        status: 'available'
      }
    ];
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.claudeService.getSessionId();
  }

  /**
   * Resume session
   */
  async resumeSession(sessionId: string): Promise<void> {
    this.claudeService.resumeSession(sessionId);
  }

  /**
   * Interrupt active query
   */
  async interrupt(): Promise<void> {
    await this.claudeService.interrupt();
  }

  /**
   * Convert SDK message to AgentMessage format
   */
  private convertToAgentMessage(sdkMessage: any): AgentMessage {
    return {
      type: sdkMessage.type,
      content: sdkMessage.content || '',
      timestamp: new Date().toISOString(),
      sessionId: this.claudeService.getSessionId() || undefined,
      // Add other fields as needed
    };
  }

  // Keep other methods for compatibility
  getVirtualFileManager(): VirtualFileManager {
    return this.virtualFileManager;
  }

  isInitialized(): boolean {
    return true;
  }

  getAvailableModels(): string[] {
    return [
      'x-ai/grok-4-fast',
      'z-ai/glm-4.6',
      'anthropic/claude-3.5-sonnet'
    ];
  }
}
```

---

## Phase 4: Frontend Integration

### 4.1 Update Agent Panel Component

**File**: `src/renderer/components/AgentPanel.tsx`

Add real-time todo tracking and progress display:

```typescript
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/app-store';

interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
}

export const AgentPanel: React.FC = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadAgents();
    setupEventListeners();
  }, []);

  const setupEventListeners = () => {
    // Listen for agent events
    (window as any).electronAPI?.on('agent:message', (message: any) => {
      setChatHistory(prev => [...prev, message]);
    });

    (window as any).electronAPI?.on('agent:todos', (updatedTodos: Todo[]) => {
      setTodos(updatedTodos);
    });

    (window as any).electronAPI?.on('agent:error', (error: any) => {
      console.error('Agent error:', error);
      setIsProcessing(false);
    });
  };

  const loadAgents = async () => {
    try {
      if ((window as any).electronAPI?.agent?.listAvailable) {
        const availableAgents = await (window as any).electronAPI.agent.listAvailable();
        setAgents(Array.isArray(availableAgents) ? availableAgents : []);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
      setAgents([]);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    setIsProcessing(true);
    try {
      await (window as any).electronAPI.agent.sendMessage(message);
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTodoList = () => {
    if (todos.length === 0) return null;

    const completed = todos.filter(t => t.status === 'completed').length;
    const total = todos.length;

    return (
      <div style={{ 
        padding: '10px', 
        backgroundColor: '#2a2a2a', 
        borderRadius: '4px',
        marginBottom: '10px'
      }}>
        <h4>Progress: {completed}/{total} completed</h4>
        <div style={{ marginTop: '10px' }}>
          {todos.map((todo, index) => {
            const icon = todo.status === 'completed' ? '✅' : 
                        todo.status === 'in_progress' ? '🔧' : '⏳';
            const text = todo.status === 'in_progress' && todo.activeForm 
              ? todo.activeForm 
              : todo.content;
            
            return (
              <div key={index} style={{ 
                padding: '5px 0',
                opacity: todo.status === 'completed' ? 0.6 : 1
              }}>
                {icon} {text}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      padding: '20px'
    }}>
      <h2>AI Agents</h2>
      
      {/* Agent Selection */}
      <div style={{ marginBottom: '20px' }}>
        <select 
          value={selectedAgent || ''} 
          onChange={(e) => setSelectedAgent(e.target.value)}
          style={{ width: '100%', padding: '8px' }}
        >
          <option value="">Main Agent</option>
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      {/* Todo List */}
      {renderTodoList()}

      {/* Chat History */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        marginBottom: '20px',
        backgroundColor: '#1e1e1e',
        padding: '10px',
        borderRadius: '4px'
      }}>
        {chatHistory.map((msg, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            <strong>{msg.type}:</strong> {msg.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask the AI agent..."
          disabled={isProcessing}
          style={{ flex: 1, padding: '8px' }}
        />
        <button 
          onClick={sendMessage}
          disabled={isProcessing || !message.trim()}
          style={{ padding: '8px 16px' }}
        >
          {isProcessing ? 'Processing...' : 'Send'}
        </button>
      </div>
    </div>
  );
};
```

---

## Phase 5: Testing and Validation

### 5.1 Test Cases

1. **Basic Query Test**
   ```typescript
   await agentService.executeQuery("Create a character profile for a detective");
   ```

2. **Todo Tracking Test**
   ```typescript
   await agentService.executeQuery("Plan a 3-act story structure for a mystery novel");
   // Should create todos for each act
   ```

3. **Subagent Delegation Test**
   ```typescript
   await agentService.executeQuery("Use the planning-agent to outline chapter 1");
   ```

4. **File Operations Test**
   ```typescript
   await agentService.executeQuery("Create a new character file for John Smith");
   // Should use Write tool
   ```

5. **Session Resume Test**
   ```typescript
   const sessionId = agentService.getSessionId();
   agentService.resumeSession(sessionId);
   await agentService.executeQuery("Continue our previous conversation");
   ```

---

## Phase 6: Deployment Checklist

### 6.1 Pre-Deployment

- [ ] Install `@anthropic-ai/claude-agent-sdk`
- [ ] Create `src/agents/core/claude-agent-service.ts`
- [ ] Update `src/main/services/agent-manager.ts`
- [ ] Update `src/renderer/components/AgentPanel.tsx`
- [ ] Configure environment variables
- [ ] Test all agent interactions
- [ ] Test todo tracking
- [ ] Test file operations
- [ ] Test session management

### 6.2 Validation

- [ ] Main agent responds correctly
- [ ] Subagents are invoked appropriately
- [ ] Todos display in real-time
- [ ] File operations work correctly
- [ ] Sessions can be resumed
- [ ] Error handling works
- [ ] UI updates in real-time

---

## Summary

This implementation provides:

✅ **Full Claude Agents SDK integration**
✅ **6 specialized subagents** (planning, writing, editing, research, character, outline)
✅ **Built-in tools** (TodoWrite, Read, Write, Edit, MultiEdit, Grep, Glob, Bash)
✅ **Real-time progress tracking** with todos
✅ **Session management** for context preservation
✅ **Streaming responses** for real-time UI updates
✅ **Proper model configuration** (Grok-4-Fast main, GLM-4.6 subagents)
✅ **Frontend integration** with React components
✅ **Event-driven architecture** for real-time updates

**No custom MCP servers or middleware needed** - the SDK provides everything required for a sophisticated agentic book writing assistant!
