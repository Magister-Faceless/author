# Part 2: Claude SDK Integration Patterns

**Document**: Claude SDK Migration Guide - Part 2 of 4  
**Date**: 2025-10-05  
**Project**: Author Desktop Application  

---

## Table of Contents
1. [Claude SDK Core Concepts](#claude-sdk-core-concepts)
2. [The query() Function](#the-query-function)
3. [Message Types & Streaming](#message-types--streaming)
4. [Subagent Architecture](#subagent-architecture)
5. [Custom MCP Tools](#custom-mcp-tools)
6. [Session Management](#session-management)
7. [Integration Patterns for Electron](#integration-patterns-for-electron)

---

## Claude SDK Core Concepts

### Philosophy

The Claude Agent SDK provides **agentic AI capabilities** where Claude can:
- **Use tools** to interact with the file system, run commands, search code
- **Delegate to subagents** for specialized tasks
- **Maintain context** across multi-turn conversations
- **Plan and execute** complex workflows autonomously

### Key Components

```
┌──────────────────────────────────────────────────────┐
│                 Your Application                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  query() - Main SDK Entry Point                │  │
│  │  - Takes prompt (string or AsyncIterable)      │  │
│  │  - Returns AsyncGenerator<SDKMessage>          │  │
│  └───────────────┬────────────────────────────────┘  │
│                  │                                     │
│  ┌───────────────▼────────────────────────────────┐  │
│  │  Claude Agent Runtime                          │  │
│  │  - Processes messages                          │  │
│  │  - Executes tools                              │  │
│  │  - Manages subagents                           │  │
│  └───────────────┬────────────────────────────────┘  │
│                  │                                     │
│  ┌───────────────▼────────────────────────────────┐  │
│  │  Built-in Tools                                │  │
│  │  - Read, Write, Edit (file operations)        │  │
│  │  - Bash (command execution)                    │  │
│  │  - Grep, Glob (search)                         │  │
│  │  - Task (subagent delegation)                  │  │
│  │  - TodoWrite (planning)                        │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  Custom MCP Tools (Your Tools)                 │  │
│  │  - ProgressFileWrite                           │  │
│  │  - ContextNoteWrite                            │  │
│  │  - VirtualFileRead                             │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## The query() Function

### Basic Usage Pattern

**Single Message Mode:**
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// Simple one-shot query
for await (const message of query({
  prompt: "Analyze this codebase for issues",
  options: {
    maxTurns: 5,
    allowedTools: ['Read', 'Grep', 'Glob']
  }
})) {
  console.log(message);
}
```

**Streaming Input Mode** (Recommended for Author):
```typescript
// Async generator for continuous conversation
async function* messageStream() {
  yield {
    type: 'user' as const,
    message: {
      role: 'user' as const,
      content: "Help me write a fantasy novel"
    }
  };
  
  // Later messages can be yielded dynamically
  yield {
    type: 'user' as const,
    message: {
      role: 'user' as const,
      content: "Create a character named Aria"
    }
  };
}

const q = query({
  prompt: messageStream(),
  options: {
    maxTurns: 20,
    allowedTools: ['Read', 'Write', 'Edit'],
    agents: { /* subagent definitions */ }
  }
});

for await (const message of q) {
  // Process streaming messages
}
```

### Key Options for Author App

```typescript
interface QueryOptions {
  // Session Management
  resume?: string;              // Resume previous session by ID
  forkSession?: boolean;        // Fork session into new branch
  
  // Permission Control
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  canUseTool?: (toolName, input) => Promise<PermissionResult>;
  
  // Tools
  allowedTools?: string[];      // Whitelist of tool names
  disallowedTools?: string[];   // Blacklist of tool names
  mcpServers?: Record<string, McpServerConfig>;  // Custom MCP tools
  
  // Agents
  agents?: Record<string, AgentDefinition>;  // Subagent definitions
  
  // Context
  cwd?: string;                 // Working directory
  additionalDirectories?: string[];  // Extra accessible paths
  systemPrompt?: string | { type: 'preset'; preset: 'claude_code' };
  
  // Behavior
  maxTurns?: number;            // Max conversation turns
  maxThinkingTokens?: number;   // Max tokens for thinking
  includePartialMessages?: boolean;  // Stream partial chunks
}
```

---

## Message Types & Streaming

### Understanding SDKMessage Types

The SDK streams different message types through the async generator:

```typescript
type SDKMessage = 
  | SDKSystemMessage         // Session initialization
  | SDKUserMessage           // User input (replay)
  | SDKAssistantMessage      // Claude's response
  | SDKPartialAssistantMessage  // Streaming chunks (if includePartialMessages: true)
  | SDKResultMessage         // Final result summary
  | SDKCompactBoundaryMessage;  // Context compaction marker
```

### Processing Messages for Author UI

**Mapping to Current Event System:**

```typescript
for await (const message of query({ /*...*/ })) {
  switch (message.type) {
    case 'system':
      if (message.subtype === 'init') {
        // Capture session ID
        const sessionId = message.session_id;
        console.log('Session started:', sessionId);
      }
      break;
    
    case 'assistant':
      // Full assistant message
      const content = extractTextContent(message.message);
      emitToRenderer('agent:message', {
        id: message.uuid,
        agentId: 'main',
        type: 'response',
        content: content,
        timestamp: new Date()
      });
      break;
    
    case 'stream_event':
      // Partial streaming chunk (requires includePartialMessages: true)
      if (message.event.type === 'content_block_delta') {
        const delta = message.event.delta;
        if (delta.type === 'text_delta') {
          emitToRenderer('agent:stream-chunk', {
            content: delta.text
          });
        }
      }
      break;
    
    case 'result':
      if (message.subtype === 'success') {
        emitToRenderer('agent:stream-end', {
          messageId: message.uuid,
          totalCost: message.total_cost_usd,
          numTurns: message.num_turns
        });
      } else {
        emitToRenderer('agent:error', {
          error: 'Query failed or hit max turns'
        });
      }
      break;
  }
}
```

### Streaming Partial Messages

**Enable chunk-by-chunk streaming:**
```typescript
const q = query({
  prompt: messageStream(),
  options: {
    includePartialMessages: true  // IMPORTANT: Enables real-time chunks
  }
});

for await (const message of q) {
  if (message.type === 'stream_event') {
    const event = message.event;
    
    // Handle different streaming events
    if (event.type === 'message_start') {
      emitToRenderer('agent:stream-start', { messageId: message.uuid });
    }
    else if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        emitToRenderer('agent:stream-chunk', { content: event.delta.text });
      }
    }
    else if (event.type === 'message_stop') {
      emitToRenderer('agent:stream-end', { messageId: message.uuid });
    }
  }
}
```

---

## Subagent Architecture

### Defining Subagents Programmatically

**For Author app, create specialized writing agents:**

```typescript
const writingAgents = {
  'planning-agent': {
    description: 'Expert at creating book outlines, plot structures, and story planning. Use for brainstorming, organizing ideas, and creating comprehensive outlines.',
    prompt: `You are a master story planner and outlining expert. 
    
Your expertise includes:
- Creating detailed chapter outlines
- Developing plot arcs and story structures
- Character arc planning
- Pacing and tension management
- World-building organization

When creating plans:
1. Use clear hierarchical structures
2. Include chapter summaries and key scenes
3. Note character development points
4. Mark plot twists and revelations
5. Suggest pacing adjustments`,
    tools: ['Read', 'Write', 'Grep', 'Glob'],
    model: 'sonnet' as const
  },
  
  'writing-agent': {
    description: 'Specialized in writing prose, dialogue, and descriptive scenes. Use for drafting chapters, scenes, and narrative content.',
    prompt: `You are an expert fiction writer with mastery of:
- Vivid descriptive prose
- Natural dialogue
- Character voice consistency
- Scene construction
- Show-don't-tell techniques

When writing:
1. Match the established tone and style
2. Maintain character voice consistency
3. Use sensory details effectively
4. Vary sentence structure for rhythm
5. Balance dialogue, action, and description`,
    tools: ['Read', 'Write', 'Edit', 'MultiEdit', 'Grep'],
    model: 'opus' as const  // Higher quality for creative writing
  },
  
  'editing-agent': {
    description: 'Expert editor for refining prose, fixing inconsistencies, and improving clarity. Use for revision, polish, and quality control.',
    prompt: `You are a professional editor specializing in:
- Prose refinement and polish
- Grammar and style consistency
- Plot hole identification
- Character consistency checking
- Pacing improvements

When editing:
1. Preserve the author's voice
2. Suggest specific improvements with examples
3. Identify continuity issues
4. Check character behavior consistency
5. Improve clarity without over-editing`,
    tools: ['Read', 'Edit', 'MultiEdit', 'Grep', 'Glob'],
    model: 'sonnet' as const
  }
};

// Use in query
const result = query({
  prompt: "Help me write Chapter 3 of my fantasy novel",
  options: {
    agents: writingAgents,
    maxTurns: 15
  }
});
```

### How Subagents Work

1. **Automatic Delegation**: Claude decides when to use subagents based on task and description
2. **Tool Restrictions**: Each subagent can have limited tool access
3. **Model Override**: Different subagents can use different Claude models
4. **Isolated Context**: Subagent work doesn't pollute main conversation

**Explicit Delegation:**
```typescript
// User can request specific subagent
const prompt = "Use the planning-agent to create an outline for Act 2";
```

---

## Custom MCP Tools

### Creating Author-Specific Tools

**Tool Definition Pattern:**
```typescript
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const authorTools = createSdkMcpServer({
  name: 'author-tools',
  version: '1.0.0',
  tools: [
    tool(
      'write_progress_file',
      'Write a progress file documenting work completed in this session',
      {
        sessionId: z.string().describe('Current session identifier'),
        summary: z.string().describe('Summary of work completed'),
        filesModified: z.array(z.string()).describe('List of files created/modified'),
        nextSteps: z.string().optional().describe('Suggested next steps')
      },
      async (args) => {
        // Use VirtualFileManager
        const file = await virtualFileManager.createProgressFile(
          args.sessionId,
          `# Session Progress\n\n${args.summary}\n\n## Files Modified\n${args.filesModified.map(f => `- ${f}`).join('\n')}\n\n## Next Steps\n${args.nextSteps || 'TBD'}`
        );
        
        return {
          content: [{
            type: 'text',
            text: `Progress file created: ${file.name} (ID: ${file.id})`
          }]
        };
      }
    ),
    
    tool(
      'write_context_note',
      'Save important context or notes for future reference',
      {
        topic: z.string().describe('Topic or category for this note'),
        content: z.string().describe('Note content'),
        tags: z.array(z.string()).optional().describe('Tags for organization')
      },
      async (args) => {
        const file = await virtualFileManager.createContextNote(
          args.topic,
          args.content,
          { tags: args.tags || [] }
        );
        
        return {
          content: [{
            type: 'text',
            text: `Context note saved: ${file.name}`
          }]
        };
      }
    ),
    
    tool(
      'read_virtual_file',
      'Read a virtual file created in previous sessions',
      {
        fileId: z.string().optional(),
        fileName: z.string().optional(),
        type: z.enum(['progress', 'context', 'summary', 'todo']).optional()
      },
      async (args) => {
        let file;
        
        if (args.fileId) {
          file = await virtualFileManager.readFile(args.fileId);
        } else if (args.fileName) {
          const files = await virtualFileManager.searchFiles(args.fileName, args.type);
          file = files[0];
        }
        
        if (!file) {
          return {
            content: [{ type: 'text', text: 'File not found' }]
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `# ${file.name}\n\n${file.content}\n\n---\nMetadata: ${JSON.stringify(file.metadata, null, 2)}`
          }]
        };
      }
    )
  ]
});
```

### Using Custom Tools

**CRITICAL: Custom MCP tools require streaming input mode!**

```typescript
async function* messageStream() {
  yield {
    type: 'user' as const,
    message: { role: 'user' as const, content: userPrompt }
  };
}

const result = query({
  prompt: messageStream(),  // MUST be async generator, not string!
  options: {
    mcpServers: {
      'author-tools': authorTools  // Register custom MCP server
    },
    allowedTools: [
      'Read', 'Write', 'Edit',
      'mcp__author-tools__write_progress_file',
      'mcp__author-tools__write_context_note',
      'mcp__author-tools__read_virtual_file'
    ]
  }
});
```

**Tool Naming Convention:**
- Pattern: `mcp__{server-name}__{tool-name}`
- Example: `mcp__author-tools__write_progress_file`

---

## Session Management

### Capturing Session ID

```typescript
let currentSessionId: string | undefined;

for await (const message of query({/*...*/})) {
  if (message.type === 'system' && message.subtype === 'init') {
    currentSessionId = message.session_id;
    // Save to database or state for later resumption
    await saveSessionId(currentSessionId);
  }
}
```

### Resuming Sessions

```typescript
// Continue previous conversation
const resumedQuery = query({
  prompt: "Continue where we left off",
  options: {
    resume: savedSessionId,
    maxTurns: 10
  }
});
```

### Forking Sessions

```typescript
// Create new branch from saved state
const forkedQuery = query({
  prompt: "Try a different approach",
  options: {
    resume: savedSessionId,
    forkSession: true  // Creates new session ID
  }
});
```

---

## Integration Patterns for Electron

### Recommended Architecture

```typescript
// src/agents/core/claude-agent-service.ts
export class ClaudeAgentService extends EventEmitter {
  private currentQuery: Query | null = null;
  private messageGenerator: AsyncGenerator<SDKUserMessage> | null = null;
  
  async startConversation(initialPrompt: string) {
    this.messageGenerator = this.createMessageStream();
    
    this.currentQuery = query({
      prompt: this.messageGenerator,
      options: {
        includePartialMessages: true,
        maxTurns: 20,
        agents: this.getAgentDefinitions(),
        mcpServers: { 'author-tools': this.createAuthorTools() },
        allowedTools: this.getAllowedTools()
      }
    });
    
    // Start processing
    this.processMessages();
    
    // Send initial prompt
    this.sendPrompt(initialPrompt);
  }
  
  private async *createMessageStream() {
    while (true) {
      const message = await this.waitForNextMessage();
      yield message;
    }
  }
  
  private async processMessages() {
    for await (const message of this.currentQuery!) {
      this.handleSDKMessage(message);
    }
  }
  
  private handleSDKMessage(message: SDKMessage) {
    // Map to current event system
    // Emit events that AgentManager can forward
  }
}
```

---

## Next Steps

Proceed to **Part 3: Migration Implementation Guide** for:
- Step-by-step migration process
- Code transformation examples
- Testing each migration stage
- Rollback strategies
