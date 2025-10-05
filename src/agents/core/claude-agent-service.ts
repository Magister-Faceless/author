/**
 * Claude Agent Service - Production Implementation
 * 
 * CRITICAL PITFALLS AVOIDED:
 * 1. ✅ Uses async generator for MCP tools (not string prompt)
 * 2. ✅ Proper MCP tool naming: mcp__server__tool
 * 3. ✅ includePartialMessages: true for streaming
 * 4. ✅ Captures and tracks session IDs
 * 5. ✅ Non-blocking async processing
 * 6. ✅ All tools in allowedTools list
 * 7. ✅ Uses production-ready prompts
 */

import { EventEmitter } from 'events';
import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import type { 
  Query, 
  SDKMessage, 
  AgentDefinition,
  SDKPartialAssistantMessage,
  SDKUserMessage
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { AgentMessage } from '@shared/types';
import { VirtualFileManager } from '@main/services/virtual-file-manager';

// Import production-ready prompts
import { MAIN_AGENT_PROMPT } from '@agents/prompts/main-agent-prompt';
import { 
  PLANNING_AGENT_PROMPT, 
  WRITING_AGENT_PROMPT, 
  EDITING_AGENT_PROMPT 
} from '@agents/prompts/subagent-prompts';

interface PendingMessage {
  resolve: (result: AgentMessage[]) => void;
  reject: (error: Error) => void;
  prompt: string;
  context?: any;
}

export class ClaudeAgentService extends EventEmitter {
  private currentQuery: Query | null = null;
  private messageQueue: PendingMessage[] = [];
  private isProcessing = false;
  private currentSessionId: string | undefined;
  private virtualFileManager: VirtualFileManager;
  private workingDirectory: string;
  private model: string;
  private subagentModel: string;

  constructor(virtualFileManager: VirtualFileManager, cwd: string) {
    super();
    this.virtualFileManager = virtualFileManager;
    this.workingDirectory = cwd;
    this.model = process.env.CLAUDE_MODEL || 'x-ai/grok-4-fast';
    this.subagentModel = process.env.SUBAGENT_MODEL || 'z-ai/glm-4.6';
    
    console.log(`ClaudeAgentService initialized with model: ${this.model}, subagent: ${this.subagentModel}`);
  }

  /**
   * Send a message to Claude and start processing
   * PUBLIC API - called by AgentManager
   */
  async sendMessage(prompt: string, context?: any): Promise<AgentMessage[]> {
    console.log('ClaudeAgentService.sendMessage called with:', prompt.substring(0, 100));

    // If already processing, queue the message
    if (this.isProcessing) {
      return new Promise((resolve, reject) => {
        this.messageQueue.push({ resolve, reject, prompt, context });
      });
    }

    // Start processing
    return this.processPrompt(prompt, context);
  }

  /**
   * Process a prompt using Claude SDK
   * PITFALL AVOIDANCE: Uses async generator, not string!
   */
  private async processPrompt(prompt: string, context?: any): Promise<AgentMessage[]> {
    this.isProcessing = true;
    const messages: AgentMessage[] = [];

    try {
      // CRITICAL: Create async generator for MCP tools support
      const messageStream = this.createMessageStream(prompt, context);

      // Build options object
      const queryOptions: any = {
        // CRITICAL: Enable streaming chunks
        includePartialMessages: true,  // ✅ Pitfall #3 avoided
        
        // Context
        cwd: this.workingDirectory,
        
        // Limits
        maxTurns: 20,
        
        // Tools - ALL must be listed
        allowedTools: this.getAllowedTools(),  // ✅ Pitfall #7 avoided
        
        // Custom MCP server
        mcpServers: {
          'author-tools': this.createAuthorMCPServer()
        },
        
        // Subagents with production prompts
        agents: this.getAgentDefinitions(),
        
        // System prompt
        systemPrompt: MAIN_AGENT_PROMPT,  // ✅ Production prompt
        
        // Permissions
        permissionMode: 'acceptEdits' as const,
        
        // Model
        model: this.model
      };
      
      // Only add resume if we have a session (avoid type error)
      if (this.currentSessionId) {
        queryOptions.resume = this.currentSessionId;
      }
      
      // Create query with full options
      this.currentQuery = query({
        prompt: messageStream,  // ✅ Async generator, not string!
        options: queryOptions
      });

      // Process streaming messages (non-blocking)
      for await (const sdkMessage of this.currentQuery) {
        // Process asynchronously to avoid blocking
        setImmediate(() => {
          const agentMessage = this.handleSDKMessage(sdkMessage);
          if (agentMessage) {
            messages.push(agentMessage);
          }
        });
      }

      // Process queued messages
      if (this.messageQueue.length > 0) {
        const next = this.messageQueue.shift()!;
        this.processPrompt(next.prompt, next.context)
          .then(result => next.resolve(result))
          .catch(err => next.reject(err));
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in ClaudeAgentService:', errorMessage);
      this.emit('error', { error: errorMessage });
      throw error;
    } finally {
      this.isProcessing = false;
    }

    return messages;
  }

  /**
   * Create async generator for message stream
   * CRITICAL: Required for MCP tools support
   */
  private async *createMessageStream(initialPrompt: string, _context?: any): AsyncGenerator<SDKUserMessage> {
    // Yield initial message
    yield {
      type: 'user' as const,
      message: {
        role: 'user' as const,
        content: initialPrompt
      },
      session_id: this.currentSessionId || '',
      parent_tool_use_id: null
    };
    
    // Generator completes after initial message
    // Future: Could support multi-turn conversations by yielding more messages
  }

  /**
   * Handle SDK messages and emit events
   * Maps SDK messages to AgentManager events
   */
  private handleSDKMessage(message: SDKMessage): AgentMessage | null {
    switch (message.type) {
      case 'system':
        if ((message as any).subtype === 'init') {
          // ✅ Pitfall #5: Capture session ID
          this.currentSessionId = (message as any).session_id;
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
          if ((streamEvent as any).delta.type === 'text_delta') {
            this.emit('stream-chunk', { content: (streamEvent as any).delta.text });
          }
        }
        else if (streamEvent.type === 'message_stop') {
          this.emit('stream-end', { messageId: message.uuid });
        }
        return null;

      case 'assistant':
        // Full assistant message
        const content = this.extractTextContent((message as any).message);
        const agentMessage: AgentMessage = {
          id: message.uuid,
          agentId: (message as any).parent_tool_use_id || 'main',
          type: 'response',
          content: content,
          timestamp: new Date(),
          metadata: {
            sessionId: (message as any).session_id,
            sdkMessageType: message.type
          }
        };
        
        this.emit('message', agentMessage);
        return agentMessage;

      case 'result':
        if ((message as any).subtype === 'success') {
          console.log(`Query completed: ${(message as any).num_turns} turns, $${(message as any).total_cost_usd.toFixed(4)} cost`);
          this.emit('query-complete', {
            sessionId: (message as any).session_id,
            numTurns: (message as any).num_turns,
            cost: (message as any).total_cost_usd
          });
        } else {
          this.emit('error', { 
            error: `Query failed: ${(message as any).subtype}` 
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
   * CRITICAL: ALL tools must be listed here
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
      
      // Subagent delegation
      'Task',
      
      // Custom MCP tools - CRITICAL: Use mcp__server__tool format
      'mcp__author-tools__write_progress_file',    // ✅ Pitfall #2 avoided
      'mcp__author-tools__write_context_note',
      'mcp__author-tools__read_virtual_file',
      'mcp__author-tools__create_session_summary'
    ];
  }

  /**
   * Create custom MCP server for Author-specific tools
   * These integrate with the virtual file system for context persistence
   */
  private createAuthorMCPServer() {
    return createSdkMcpServer({
      name: 'author-tools',
      version: '1.0.0',
      tools: [
        // Progress file tool - document session work
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

        // Context note tool - save important decisions
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

        // Read virtual file tool - access previous session data
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
            } else if (args.type) {
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

        // Session summary tool - create continuity summary
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
   * Uses the detailed prompts we created
   */
  private getAgentDefinitions(): Record<string, AgentDefinition> {
    return {
      'planning-agent': {
        description: 'Expert at creating book outlines, plot structures, and story planning. Use for brainstorming, organizing ideas, and creating comprehensive outlines.',
        prompt: PLANNING_AGENT_PROMPT,  // ✅ Production prompt
        tools: ['Read', 'Write', 'Grep', 'Glob', 'TodoWrite'],
        model: 'inherit' as const  // Use main model
      },

      'writing-agent': {
        description: 'Specialized in writing prose, dialogue, and narrative content. Use for drafting chapters, scenes, and creative writing.',
        prompt: WRITING_AGENT_PROMPT,  // ✅ Production prompt
        tools: ['Read', 'Write', 'Edit', 'MultiEdit', 'Grep'],
        model: 'inherit' as const  // Use main model
      },

      'editing-agent': {
        description: 'Expert editor for refining prose, fixing inconsistencies, and improving clarity. Use for revision, polish, and quality control.',
        prompt: EDITING_AGENT_PROMPT,  // ✅ Production prompt
        tools: ['Read', 'Edit', 'MultiEdit', 'Grep', 'Glob'],
        model: 'inherit' as const  // Use main model
      }
    };
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

  /**
   * Get current session ID
   */
  getSessionId(): string | undefined {
    return this.currentSessionId;
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return true;  // Ready if initialized
  }
}
