# Part 3: Migration Implementation Guide

**Document**: Claude SDK Migration Guide - Part 3 of 4  
**Date**: 2025-10-05  
**Project**: Author Desktop Application  

---

## Table of Contents
1. [Migration Strategy](#migration-strategy)
2. [Step 1: Install Dependencies](#step-1-install-dependencies)
3. [Step 2: Create Claude Agent Service](#step-2-create-claude-agent-service)
4. [Step 3: Build Custom MCP Tools](#step-3-build-custom-mcp-tools)
5. [Step 4: Update Agent Manager](#step-4-update-agent-manager)
6. [Step 5: Configure Subagents](#step-5-configure-subagents)
7. [Step 6: Test Integration](#step-6-test-integration)
8. [Step 7: Gradual Rollout](#step-7-gradual-rollout)

---

## Migration Strategy

### Approach: Parallel Implementation

**Why not direct replacement?**
- Maintain working app during migration
- Test Claude SDK integration thoroughly
- Easy rollback if issues arise
- Compare behavior side-by-side

**Strategy:**
1. Keep `OpenRouterAgentService` temporarily
2. Create new `ClaudeAgentService` alongside it
3. Add feature flag to switch between them
4. Test extensively with Claude SDK
5. Remove OpenRouter after validation

---

## Step 1: Install Dependencies

### Install Claude SDK

```bash
cd c:\Users\netfl\OneDrive\Desktop\author
npm install @anthropic-ai/claude-agent-sdk
npm install zod  # Required for tool schemas
```

### Update package.json

Verify installation:
```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.3.0",
    "zod": "^3.22.4"
  }
}
```

### Environment Variables

**Your .env file should have:**
```env
# OpenRouter API Configuration (already set up)
CLAUDE_API_KEY=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
CLAUDE_API_BASE_URL=https://openrouter.ai/api/v1

# Model Configuration
CLAUDE_MODEL=x-ai/grok-4-fast  # Main agent model
SUBAGENT_MODEL=z-ai/glm-4.6    # Subagent model

# Feature flag for gradual rollout
USE_CLAUDE_SDK=false  # Set to true when ready to test
```

**Update .env.example:**
```env
# OpenRouter API Configuration
CLAUDE_API_KEY=your-openrouter-api-key-here
CLAUDE_API_BASE_URL=https://openrouter.ai/api/v1

# Model Configuration
CLAUDE_MODEL=x-ai/grok-4-fast
SUBAGENT_MODEL=z-ai/glm-4.6

# Legacy (keep for now)
OPENROUTER_API_KEY=your-openrouter-key-here

# Feature Flags
USE_CLAUDE_SDK=false
```

---

## Step 2: Create Claude Agent Service

### Create New Service File

**File:** `src/agents/core/claude-agent-service.ts`

```typescript
import { EventEmitter } from 'events';
import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import type { 
  Query, 
  SDKMessage, 
  AgentDefinition,
  SDKPartialAssistantMessage 
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { AgentMessage } from '@shared/types';
import { VirtualFileManager } from '@main/services/virtual-file-manager';
import { MAIN_AGENT_PROMPT } from '@agents/prompts/main-agent-prompt';
import { 
  PLANNING_AGENT_PROMPT, 
  WRITING_AGENT_PROMPT, 
  EDITING_AGENT_PROMPT 
} from '@agents/prompts/subagent-prompts';

interface PendingMessage {
  resolve: (msg: any) => void;
  message: any;
}

export class ClaudeAgentService extends EventEmitter {
  private currentQuery: Query | null = null;
  private messageQueue: PendingMessage[] = [];
  private isProcessing = false;
  private currentSessionId: string | undefined;
  private virtualFileManager: VirtualFileManager;
  private workingDirectory: string;

  constructor(virtualFileManager: VirtualFileManager, cwd: string) {
    super();
    this.virtualFileManager = virtualFileManager;
    this.workingDirectory = cwd;
  }

  /**
   * Send a message to Claude and start processing
   */
  async sendMessage(prompt: string, context?: any): Promise<AgentMessage[]> {
    console.log('ClaudeAgentService.sendMessage called with:', prompt);

    // If already processing, queue the message
    if (this.isProcessing) {
      return new Promise((resolve) => {
        this.messageQueue.push({
          resolve,
          message: { prompt, context }
        });
      });
    }

    // Start new conversation or continue existing
    return this.processPrompt(prompt, context);
  }

  /**
   * Process a prompt using Claude SDK
   */
  private async processPrompt(prompt: string, context?: any): Promise<AgentMessage[]> {
    this.isProcessing = true;
    const messages: AgentMessage[] = [];

    try {
      // Create message generator
      const messageStream = this.createMessageStream(prompt, context);

      // Create query with full options
      this.currentQuery = query({
        prompt: messageStream,
        options: {
          // Session management
          resume: this.currentSessionId,
          
          // Streaming
          includePartialMessages: true,
          
          // Context
          cwd: this.workingDirectory,
          
          // Limits
          maxTurns: 20,
          
          // Tools
          allowedTools: this.getAllowedTools(),
          mcpServers: {
            'author-tools': this.createAuthorMCPServer()
          },
          
          // Subagents
          agents: this.getAgentDefinitions(),
          
          // System prompt
          systemPrompt: this.getSystemPrompt(),
          
          // Permissions
          permissionMode: 'acceptEdits' as const
        }
      });

      // Process streaming messages
      for await (const sdkMessage of this.currentQuery) {
        const agentMessage = this.handleSDKMessage(sdkMessage);
        if (agentMessage) {
          messages.push(agentMessage);
        }
      }

      // Process queued messages
      if (this.messageQueue.length > 0) {
        const next = this.messageQueue.shift()!;
        const result = await this.processPrompt(next.message.prompt, next.message.context);
        next.resolve(result);
      }

    } catch (error) {
      console.error('Error in ClaudeAgentService:', error);
      this.emit('error', { error: error.message });
      throw error;
    } finally {
      this.isProcessing = false;
    }

    return messages;
  }

  /**
   * Create async generator for message stream
   */
  private async *createMessageStream(initialPrompt: string, context?: any) {
    // Send initial message
    yield {
      type: 'user' as const,
      message: {
        role: 'user' as const,
        content: initialPrompt
      }
    };
  }

  /**
   * Handle SDK messages and emit events
   */
  private handleSDKMessage(message: SDKMessage): AgentMessage | null {
    switch (message.type) {
      case 'system':
        if (message.subtype === 'init') {
          // Capture session ID
          this.currentSessionId = message.session_id;
          console.log(`Session started: ${this.currentSessionId}`);
          this.emit('session-started', { sessionId: this.currentSessionId });
        }
        return null;

      case 'stream_event':
        // Handle streaming chunks
        const streamEvent = (message as SDKPartialAssistantMessage).event;
        
        if (streamEvent.type === 'message_start') {
          this.emit('stream-start', { messageId: message.uuid });
        }
        else if (streamEvent.type === 'content_block_delta') {
          if (streamEvent.delta.type === 'text_delta') {
            this.emit('stream-chunk', { content: streamEvent.delta.text });
          }
        }
        else if (streamEvent.type === 'message_stop') {
          this.emit('stream-end', { messageId: message.uuid });
        }
        return null;

      case 'assistant':
        // Full assistant message
        const content = this.extractTextContent(message.message);
        const agentMessage: AgentMessage = {
          id: message.uuid,
          agentId: message.parent_tool_use_id || 'main',
          type: 'response',
          content: content,
          timestamp: new Date(),
          metadata: {
            sessionId: message.session_id,
            sdkMessageType: message.type
          }
        };
        
        this.emit('message', agentMessage);
        return agentMessage;

      case 'result':
        if (message.subtype === 'success') {
          console.log(`Query completed: ${message.num_turns} turns, $${message.total_cost_usd.toFixed(4)} cost`);
          this.emit('query-complete', {
            sessionId: message.session_id,
            numTurns: message.num_turns,
            cost: message.total_cost_usd
          });
        } else {
          this.emit('error', { 
            error: `Query failed: ${message.subtype}` 
          });
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Extract text content from assistant message
   */
  private extractTextContent(message: any): string {
    if (!message.content || !Array.isArray(message.content)) {
      return '';
    }

    return message.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n\n');
  }

  /**
   * Get allowed tools list
   */
  private getAllowedTools(): string[] {
    return [
      // Built-in file operations
      'Read',
      'Write', 
      'Edit',
      'MultiEdit',
      
      // Search tools
      'Grep',
      'Glob',
      
      // Planning tools
      'TodoWrite',
      
      // Custom MCP tools
      'mcp__author-tools__write_progress_file',
      'mcp__author-tools__write_context_note',
      'mcp__author-tools__read_virtual_file',
      'mcp__author-tools__create_session_summary'
    ];
  }

  /**
   * Create custom MCP server for Author-specific tools
   */
  private createAuthorMCPServer() {
    return createSdkMcpServer({
      name: 'author-tools',
      version: '1.0.0',
      tools: [
        tool(
          'write_progress_file',
          'Write a progress file documenting work completed in this session',
          {
            sessionId: z.string().describe('Current session identifier'),
            summary: z.string().describe('Summary of work completed'),
            filesModified: z.array(z.string()).describe('Files created/modified'),
            nextSteps: z.string().optional().describe('Suggested next steps')
          },
          async (args) => {
            const content = `# Session Progress

## Summary
${args.summary}

## Files Modified
${args.filesModified.map(f => `- ${f}`).join('\n')}

## Next Steps
${args.nextSteps || 'TBD'}

---
Generated: ${new Date().toISOString()}
`;

            const file = await this.virtualFileManager.createProgressFile(
              args.sessionId,
              content
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
          'Save important context or notes about the book project',
          {
            topic: z.string().describe('Topic or category'),
            content: z.string().describe('Note content'),
            tags: z.array(z.string()).optional().describe('Tags')
          },
          async (args) => {
            const file = await this.virtualFileManager.createContextNote(
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
          'Read a virtual file from previous sessions',
          {
            fileId: z.string().optional(),
            type: z.enum(['progress', 'context', 'summary', 'todo']).optional()
          },
          async (args) => {
            let file;
            
            if (args.fileId) {
              file = await this.virtualFileManager.readFile(args.fileId);
            } else {
              const files = await this.virtualFileManager.listFiles({ type: args.type });
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
                text: `# ${file.name}\n\n${file.content}`
              }]
            };
          }
        ),

        tool(
          'create_session_summary',
          'Create a summary of the current session for continuity',
          {
            sessionId: z.string().describe('Session ID'),
            keyDecisions: z.array(z.string()).describe('Important decisions made'),
            completedTasks: z.array(z.string()).describe('Tasks completed'),
            pendingTasks: z.array(z.string()).describe('Tasks still pending')
          },
          async (args) => {
            const content = `# Session Summary

## Key Decisions
${args.keyDecisions.map(d => `- ${d}`).join('\n')}

## Completed Tasks
${args.completedTasks.map(t => `- ${t}`).join('\n')}

## Pending Tasks
${args.pendingTasks.map(t => `- ${t}`).join('\n')}
`;

            const file = await this.virtualFileManager.createSessionSummary(
              args.sessionId,
              content
            );

            return {
              content: [{
                type: 'text',
                text: `Session summary created: ${file.name}`
              }]
            };
          }
        )
      ]
    });
  }

  /**
   * Get subagent definitions with production-ready prompts
   */
  private getAgentDefinitions(): Record<string, AgentDefinition> {
    return {
      'planning-agent': {
        description: 'Expert at creating book outlines, plot structures, and story planning. Use for brainstorming, organizing ideas, and creating comprehensive outlines.',
        prompt: PLANNING_AGENT_PROMPT,
        tools: ['Read', 'Write', 'Grep', 'Glob', 'TodoWrite'],
        model: process.env.SUBAGENT_MODEL || 'z-ai/glm-4.6'
      },

      'writing-agent': {
        description: 'Specialized in writing prose, dialogue, and narrative content. Use for drafting chapters, scenes, and creative writing.',
        prompt: WRITING_AGENT_PROMPT,
        tools: ['Read', 'Write', 'Edit', 'MultiEdit', 'Grep'],
        model: process.env.SUBAGENT_MODEL || 'z-ai/glm-4.6'
      },

      'editing-agent': {
        description: 'Expert editor for refining prose, fixing inconsistencies, and improving clarity. Use for revision, polish, and quality control.',
        prompt: EDITING_AGENT_PROMPT,
        tools: ['Read', 'Edit', 'MultiEdit', 'Grep', 'Glob'],
        model: process.env.SUBAGENT_MODEL || 'z-ai/glm-4.6'
      }
    };
  }

  /**
   * Get system prompt for the main agent
   * Uses production-ready prompt with comprehensive tool usage instructions
   */
  private getSystemPrompt(): string {
    return MAIN_AGENT_PROMPT;
  }

  /**
   * Stop current query
   */
  async stop(): Promise<void> {
    if (this.currentQuery) {
      await this.currentQuery.interrupt();
      this.currentQuery = null;
      this.isProcessing = false;
    }
  }
}
```

---

## Step 3: Build Custom MCP Tools

The custom tools are already included in the `ClaudeAgentService` above, but here's how to extend them:

### Adding More Tools

```typescript
// Add to createAuthorMCPServer() method

tool(
  'search_book_content',
  'Search across all book files for specific content',
  {
    query: z.string().describe('Search query'),
    includeTypes: z.array(z.enum(['chapter', 'character', 'outline', 'research'])).optional()
  },
  async (args) => {
    // Implementation using your database
    const results = await searchBookContent(args.query, args.includeTypes);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${results.length} matches:\n\n${results.map(r => `- ${r.file}: ${r.excerpt}`).join('\n')}`
      }]
    };
  }
)
```

---

## Step 4: Update Agent Manager

### Add Feature Flag Logic

**File:** `src/main/services/agent-manager.ts`

```typescript
import { ClaudeAgentService } from '@agents/core/claude-agent-service';
import { OpenRouterAgentService } from '@agents/core/openrouter-agent-service';

export class AgentManager {
  private agentService: ClaudeAgentService | OpenRouterAgentService;
  private useClaudeSDK: boolean;

  constructor(/* ... */) {
    // Check feature flag
    this.useClaudeSDK = process.env.USE_CLAUDE_SDK === 'true';
    
    // Initialize appropriate service
    if (this.useClaudeSDK) {
      console.log('Using Claude SDK Agent Service');
      this.agentService = new ClaudeAgentService(
        virtualFileManager,
        process.cwd()
      );
    } else {
      console.log('Using OpenRouter Agent Service');
      this.agentService = new OpenRouterAgentService(/* ... */);
    }
    
    // Set up event forwarding (same for both)
    this.setupEventForwarding();
  }
  
  private setupEventForwarding() {
    // Same event handling for both services
    this.agentService.on('stream-start', (data) => {
      this.emitToRenderer('agent:stream-start', data);
    });
    
    this.agentService.on('stream-chunk', (data) => {
      this.emitToRenderer('agent:stream-chunk', data);
    });
    
    this.agentService.on('stream-end', (data) => {
      this.emitToRenderer('agent:stream-end', data);
    });
    
    this.agentService.on('message', (data) => {
      this.emitToRenderer('agent:message', data);
    });
    
    this.agentService.on('error', (data) => {
      this.emitToRenderer('agent:error', data);
    });
  }
}
```

---

## Step 5: Configure Subagents

Already included in the service above. To customize:

### Modify Agent Definitions

```typescript
private getAgentDefinitions(): Record<string, AgentDefinition> {
  return {
    'your-custom-agent': {
      description: 'When to use this agent',
      prompt: 'System prompt for the agent',
      tools: ['Read', 'Write'],  // Limited tool access
      model: 'sonnet'  // or 'opus', 'haiku'
    }
  };
}
```

---

## Step 6: Test Integration

### Enable Claude SDK

```env
USE_CLAUDE_SDK=true
ANTHROPIC_API_KEY=sk-ant-your-actual-key
```

### Test Checklist

- [ ] App starts without errors
- [ ] Chat interface loads
- [ ] Message sent successfully
- [ ] Streaming chunks appear in real-time
- [ ] Complete message displayed
- [ ] Session ID captured
- [ ] Progress files created
- [ ] Context notes work
- [ ] Subagents can be invoked
- [ ] Error handling works

---

## Step 7: Gradual Rollout

### Phase 1: Internal Testing
- Keep `USE_CLAUDE_SDK=false` by default
- Test with flag enabled locally
- Validate all features work

### Phase 2: Beta Testing  
- Enable for select users
- Monitor for issues
- Collect feedback

### Phase 3: Full Migration
- Set `USE_CLAUDE_SDK=true` as default
- Remove OpenRouter service
- Clean up deprecated code

---

## Rollback Plan

If issues arise:

1. **Immediate**: Set `USE_CLAUDE_SDK=false`
2. **App restart**: Users revert to OpenRouter
3. **Fix issues**: Debug Claude SDK integration
4. **Re-enable**: Test fix and re-enable

---

## Next Steps

Proceed to **Part 4: Pitfalls, Testing & Validation** for:
- Common mistakes to avoid
- Debugging strategies
- Testing protocols
- Performance optimization
