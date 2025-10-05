# Claude Agent SDK Implementation Plan

## Executive Summary

Our current implementation has fundamental gaps in Claude Agent SDK integration. This document provides a complete implementation plan to properly leverage the SDK's streaming architecture, built-in tools, custom MCP servers, and subagent system.

## Critical Issues Identified

### 1. **Mock Implementation vs Real SDK**
- **Current**: Mock agent system with placeholder responses
- **Required**: Actual Claude Agent SDK with `query()` function
- **Fix**: Complete rewrite of agent system using proper SDK integration

### 2. **Missing Streaming Architecture**
- **Current**: Simple request/response pattern
- **Required**: Streaming input mode with async generators
- **Fix**: Implement proper streaming for real-time agent interaction

### 3. **No Custom MCP Tools**
- **Current**: Virtual file system with mock operations
- **Required**: Custom MCP server with book-writing tools
- **Fix**: Create `createSdkMcpServer` with specialized tools

### 4. **Incorrect Subagent System**
- **Current**: Separate agent classes and mock coordination
- **Required**: SDK `agents` parameter for subagent definitions
- **Fix**: Reimplement using proper SDK subagent system

## Implementation Roadmap

### Phase 1: Core SDK Integration (Week 1-2)

#### 1.1 Install and Configure Claude Agent SDK
```bash
npm install @anthropic-ai/claude-agent-sdk
npm install zod  # Required for tool schemas
```

#### 1.2 Create Core Agent Service
```typescript
// src/main/services/claude-agent-service.ts
import { query, createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

export class ClaudeAgentService {
  private sessionId: string | null = null;
  private mcpServer: any = null;

  constructor() {
    this.initializeMcpServer();
  }

  // Streaming input generator for real-time interaction
  async* createMessageStream(initialMessage: string, context?: any) {
    yield {
      type: 'user' as const,
      message: {
        role: 'user' as const,
        content: initialMessage
      }
    };

    // Additional messages can be yielded based on user interaction
    // This enables real-time conversation flow
  }

  // Main query method using proper SDK
  async executeQuery(prompt: string, options?: any) {
    const messageStream = this.createMessageStream(prompt, options?.context);
    
    const result = query({
      prompt: messageStream,
      options: {
        mcpServers: {
          'author-tools': this.mcpServer
        },
        agents: this.getSubagentDefinitions(),
        allowedTools: this.getAllowedTools(),
        permissionMode: 'default',
        canUseTool: this.handlePermissions.bind(this),
        maxTurns: options?.maxTurns || 10,
        resume: this.sessionId || undefined
      }
    });

    // Process streaming responses
    const messages = [];
    for await (const message of result) {
      messages.push(message);
      
      // Handle different message types
      if (message.type === 'system' && message.subtype === 'init') {
        this.sessionId = message.session_id;
      }
      
      // Emit real-time updates to UI
      this.emitMessageUpdate(message);
    }

    return messages;
  }
}
```

#### 1.3 Create Custom MCP Server for Book Writing
```typescript
// src/main/services/book-writing-tools.ts
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Character development tool
const characterDevelopmentTool = tool(
  'CharacterDevelopment',
  'Create and manage character profiles, arcs, and consistency',
  {
    action: z.enum(['create', 'update', 'analyze']),
    characterName: z.string().describe('Name of the character'),
    characterData: z.object({
      background: z.string().optional(),
      personality: z.string().optional(),
      goals: z.array(z.string()).optional(),
      relationships: z.record(z.string()).optional(),
      arc: z.string().optional()
    }).optional(),
    analysisType: z.enum(['consistency', 'development', 'relationships']).optional()
  },
  async (args) => {
    // Implementation for character development
    const { action, characterName, characterData, analysisType } = args;
    
    switch (action) {
      case 'create':
        return {
          content: [{
            type: 'text',
            text: `Created character profile for ${characterName}`
          }]
        };
      case 'update':
        return {
          content: [{
            type: 'text', 
            text: `Updated character ${characterName} with new information`
          }]
        };
      case 'analyze':
        return {
          content: [{
            type: 'text',
            text: `Character analysis for ${characterName}: ${analysisType} check completed`
          }]
        };
    }
  }
);

// Story structure tool
const storyStructureTool = tool(
  'StoryStructure',
  'Analyze and develop story structure, plot points, and pacing',
  {
    action: z.enum(['analyze', 'create_outline', 'check_pacing']),
    structure: z.enum(['three_act', 'heros_journey', 'freytag', 'custom']).optional(),
    content: z.string().optional().describe('Story content to analyze'),
    outline: z.object({
      acts: z.array(z.object({
        name: z.string(),
        description: z.string(),
        scenes: z.array(z.string()).optional()
      })).optional()
    }).optional()
  },
  async (args) => {
    const { action, structure, content, outline } = args;
    
    // Implementation for story structure analysis
    return {
      content: [{
        type: 'text',
        text: `Story structure ${action} completed using ${structure || 'default'} framework`
      }]
    };
  }
);

// Manuscript management tool
const manuscriptManagementTool = tool(
  'ManuscriptManagement',
  'Manage manuscript files, chapters, and writing progress',
  {
    action: z.enum(['create_chapter', 'update_content', 'track_progress', 'export']),
    chapterTitle: z.string().optional(),
    content: z.string().optional(),
    wordCount: z.number().optional(),
    exportFormat: z.enum(['pdf', 'docx', 'epub', 'txt']).optional(),
    metadata: z.record(z.any()).optional()
  },
  async (args) => {
    const { action, chapterTitle, content, wordCount, exportFormat } = args;
    
    // Implementation for manuscript management
    return {
      content: [{
        type: 'text',
        text: `Manuscript ${action} completed successfully`
      }]
    };
  }
);

// Create the MCP server
export const bookWritingMcpServer = createSdkMcpServer({
  name: 'author-book-writing-tools',
  version: '1.0.0',
  tools: [
    characterDevelopmentTool,
    storyStructureTool,
    manuscriptManagementTool
  ]
});
```

### Phase 2: Subagent System Implementation (Week 2-3)

#### 2.1 Define Subagents Using SDK Pattern
```typescript
// src/main/services/subagent-definitions.ts
export const authorSubagents = {
  'planning-agent': {
    description: 'Specialized in story structure, character arcs, and plot development. Use for planning and outlining tasks.',
    prompt: `You are a specialized planning agent for book writing projects.

## Your Expertise
- Story structure analysis (three-act, hero's journey, etc.)
- Character arc development and consistency
- Plot planning and timeline management
- Scene organization and pacing

## Available Tools
- CharacterDevelopment: For character profiles and arcs
- StoryStructure: For plot analysis and outlining
- TodoWrite: For task management
- Read/Edit/Write: For file operations

## Approach
1. Always start complex planning with TodoWrite to organize tasks
2. Use CharacterDevelopment for character-related planning
3. Use StoryStructure for plot and pacing analysis
4. Create detailed, actionable plans with specific milestones

Focus on creating comprehensive, well-structured plans that guide the writing process.`,
    tools: ['TodoWrite', 'CharacterDevelopment', 'StoryStructure', 'Read', 'Edit', 'Write'],
    model: 'sonnet'
  },

  'writing-agent': {
    description: 'Specialized in content generation, style consistency, and prose improvement. Use for actual writing tasks.',
    prompt: `You are a specialized writing agent focused on content creation and style.

## Your Expertise  
- Content generation and scene writing
- Style consistency and voice maintenance
- Dialogue enhancement and character voice
- Prose improvement and flow optimization

## Available Tools
- ManuscriptManagement: For chapter and content management
- CharacterDevelopment: For character voice consistency
- Read/Edit/Write: For file operations
- TodoWrite: For tracking writing tasks

## Approach
1. Maintain consistent style and voice throughout
2. Use CharacterDevelopment to ensure character voice consistency
3. Focus on engaging, well-paced prose
4. Track progress with TodoWrite for complex writing tasks

Create compelling, well-written content that matches the established style and advances the story.`,
    tools: ['ManuscriptManagement', 'CharacterDevelopment', 'Read', 'Edit', 'Write', 'TodoWrite'],
    model: 'sonnet'
  },

  'editing-agent': {
    description: 'Specialized in editing, proofreading, and consistency checking. Use for revision and improvement tasks.',
    prompt: `You are a specialized editing agent for comprehensive manuscript improvement.

## Your Expertise
- Developmental editing and structural improvements
- Copy editing for grammar, style, and clarity
- Consistency checking across characters and plot
- Pacing analysis and flow optimization

## Available Tools
- CharacterDevelopment: For consistency checking
- StoryStructure: For structural analysis
- Read/Edit/Write: For file operations
- TodoWrite: For organizing editing tasks

## Approach
1. Start with structural and developmental issues
2. Check character and plot consistency
3. Focus on clarity, flow, and readability
4. Provide specific, actionable feedback

Provide thorough, constructive editing that improves both content and craft.`,
    tools: ['CharacterDevelopment', 'StoryStructure', 'Read', 'Edit', 'Write', 'TodoWrite'],
    model: 'sonnet'
  },

  'research-agent': {
    description: 'Specialized in research, fact-checking, and reference management. Use for accuracy and research tasks.',
    prompt: `You are a specialized research agent for book writing projects.

## Your Expertise
- Fact-checking and accuracy verification
- Background research and source management
- Historical and technical accuracy
- Reference organization and citation

## Available Tools
- Read/Write: For research documentation
- TodoWrite: For organizing research tasks
- Web search and reference tools (when available)

## Approach
1. Verify facts and accuracy thoroughly
2. Organize research findings clearly
3. Provide credible sources and references
4. Flag potential accuracy issues

Ensure accuracy and provide well-researched, reliable information.`,
    tools: ['Read', 'Write', 'TodoWrite'],
    model: 'sonnet'
  }
};
```

### Phase 3: Streaming and Real-time Features (Week 3-4)

#### 3.1 Implement Proper Streaming Architecture
```typescript
// src/main/services/streaming-agent-manager.ts
export class StreamingAgentManager {
  private activeStreams: Map<string, AsyncGenerator> = new Map();
  private claudeService: ClaudeAgentService;

  constructor(claudeService: ClaudeAgentService) {
    this.claudeService = claudeService;
  }

  // Start a streaming conversation
  async startStream(conversationId: string, initialPrompt: string, options?: any) {
    const stream = this.claudeService.executeQuery(initialPrompt, {
      ...options,
      streamId: conversationId
    });

    this.activeStreams.set(conversationId, stream);
    
    // Process messages and emit to UI
    for await (const message of stream) {
      this.emitToRenderer('agent-message', {
        conversationId,
        message
      });

      // Handle todo updates
      if (message.type === 'tool_use' && message.name === 'TodoWrite') {
        this.emitToRenderer('todo-update', {
          conversationId,
          todos: message.input.todos
        });
      }

      // Handle file operations
      if (message.type === 'tool_use' && ['Read', 'Edit', 'Write'].includes(message.name)) {
        this.emitToRenderer('file-operation', {
          conversationId,
          operation: message.name,
          details: message.input
        });
      }
    }
  }

  // Send additional message to existing stream
  async sendMessage(conversationId: string, message: string) {
    // Implementation for sending additional messages to active stream
    // This requires maintaining the async generator state
  }

  // Handle interruptions
  async interruptStream(conversationId: string) {
    const stream = this.activeStreams.get(conversationId);
    if (stream && typeof stream.return === 'function') {
      await stream.return();
      this.activeStreams.delete(conversationId);
    }
  }
}
```

### Phase 4: Integration with Built-in Tools (Week 4)

#### 4.1 Leverage Built-in TodoWrite System
```typescript
// Integration with built-in TodoWrite
export class TodoIntegrationService {
  // Monitor todo updates from built-in TodoWrite tool
  handleTodoUpdate(message: any) {
    if (message.type === 'tool_use' && message.name === 'TodoWrite') {
      const todos = message.input.todos;
      
      // Update UI with todo status
      this.emitTodoUpdate(todos);
      
      // Store in local database for persistence
      this.storeTodos(todos);
      
      // Track progress for analytics
      this.trackProgress(todos);
    }
  }

  // Create enhanced todos that work with built-in system
  async createEnhancedTodos(tasks: any[]) {
    // Convert our enhanced todo format to built-in format
    const standardTodos = tasks.map(task => ({
      content: task.content,
      status: task.status,
      activeForm: task.status === 'in_progress' ? `Working on: ${task.content}` : task.content
    }));

    // The agent will use built-in TodoWrite automatically
    return standardTodos;
  }
}
```

### Phase 5: Permission and Security (Week 5)

#### 5.1 Implement Permission System
```typescript
// src/main/services/permission-manager.ts
export class PermissionManager {
  // Handle tool permission requests
  async canUseTool(toolName: string, input: any): Promise<any> {
    // Implement permission logic based on tool and context
    
    // Auto-approve safe operations
    if (['Read', 'TodoWrite', 'CharacterDevelopment', 'StoryStructure'].includes(toolName)) {
      return { behavior: 'allow', updatedInput: input };
    }

    // Require approval for file modifications
    if (['Edit', 'Write', 'ManuscriptManagement'].includes(toolName)) {
      const approved = await this.requestUserApproval(toolName, input);
      return approved 
        ? { behavior: 'allow', updatedInput: input }
        : { behavior: 'deny', message: 'User denied permission' };
    }

    // Block dangerous operations
    if (toolName === 'Bash' && input.command?.includes('rm')) {
      return { behavior: 'deny', message: 'Dangerous command blocked' };
    }

    return { behavior: 'allow', updatedInput: input };
  }

  private async requestUserApproval(toolName: string, input: any): Promise<boolean> {
    // Emit permission request to UI and wait for response
    return new Promise((resolve) => {
      this.emitPermissionRequest(toolName, input, resolve);
    });
  }
}
```

## Updated File Structure

```
src/
├── main/
│   ├── services/
│   │   ├── claude-agent-service.ts          # Core SDK integration
│   │   ├── book-writing-tools.ts            # Custom MCP server
│   │   ├── subagent-definitions.ts          # SDK subagent configs
│   │   ├── streaming-agent-manager.ts       # Streaming architecture
│   │   ├── todo-integration-service.ts      # Built-in todo integration
│   │   ├── permission-manager.ts            # Permission system
│   │   └── session-manager.ts               # Session management
│   └── main.ts
├── renderer/
│   ├── components/
│   │   ├── AgentChat.tsx                    # Streaming chat interface
│   │   ├── TodoTracker.tsx                  # Real-time todo display
│   │   └── PermissionDialog.tsx             # Permission requests
│   └── store/
│       └── agent-store.ts                   # Agent state management
└── shared/
    ├── types/
    │   ├── agent-types.ts                   # SDK-compatible types
    │   └── tool-types.ts                    # Custom tool types
    └── constants/
        └── agent-constants.ts               # Agent configurations
```

## Implementation Priority

### Week 1: Critical Foundation
1. ✅ Install Claude Agent SDK
2. ✅ Create basic `ClaudeAgentService` with `query()` 
3. ✅ Implement streaming input with async generators
4. ✅ Create basic custom MCP server

### Week 2: Core Features  
1. ✅ Implement subagent system using `agents` parameter
2. ✅ Create book-writing specific tools
3. ✅ Integrate built-in `TodoWrite` tool
4. ✅ Add permission system with `canUseTool`

### Week 3: Advanced Features
1. ✅ Implement session management and resumption
2. ✅ Add real-time streaming to UI
3. ✅ Create todo tracking integration
4. ✅ Add file operation monitoring

### Week 4: Polish and Testing
1. ✅ Comprehensive testing of all SDK features
2. ✅ Performance optimization
3. ✅ Error handling and recovery
4. ✅ Documentation and examples

This implementation plan ensures we properly leverage all Claude Agent SDK features while building the sophisticated book writing assistant we envisioned.
