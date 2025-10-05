# Claude Agents SDK Migration Plan

**Date**: 2025-10-05  
**Priority**: High  
**Status**: Planning

## Overview

Migrate from the current OpenRouter-based agent service to the **Claude Agents SDK** to enable:
- ✅ Proper agent/subagent architecture
- ✅ Built-in tool integration (Read, Write, Edit, Grep, etc.)
- ✅ Native streaming support
- ✅ Session management
- ✅ Planning capabilities (TodoWrite)
- ✅ Permission system
- ✅ MCP server integration

## Current Architecture Issues

### 1. **Current Implementation** (`openrouter-agent-service.ts`)
- ❌ Manual SSE parsing (error-prone)
- ❌ No tool integration
- ❌ No subagent support
- ❌ Basic conversation history only
- ❌ No planning capabilities
- ❌ Manual streaming implementation

### 2. **What We Need**
According to `MASTER_DEVELOPMENT_PLAN.md`:
- Main orchestrator agent
- 6 specialized subagents (Planning, Writing, Editing, Research, Character, Outline)
- File system tools integration
- Planning tools (TodoWrite)
- Session persistence
- Streaming responses

## Migration Strategy

### Phase 1: Install Claude Agents SDK ✅ (Already Done)
```bash
npm install @anthropic-ai/claude-agent-sdk
```

### Phase 2: Create Claude SDK Agent Service

**File**: `src/agents/core/claude-sdk-agent-service.ts`

**Key Features**:
```typescript
import { query, ClaudeAgentOptions } from '@anthropic-ai/claude-agent-sdk';

export class ClaudeSDKAgentService extends EventEmitter {
  private sessionId: string | null = null;
  private conversationHistory: Message[] = [];

  async sendMessage(userMessage: string, options?: {
    systemPrompt?: string;
    maxTokens?: number;
    allowedTools?: string[];
  }): Promise<string> {
    // Use Claude SDK's built-in streaming
    let fullResponse = '';
    
    for await (const message of query({
      prompt: userMessage,
      options: {
        maxTurns: options?.maxTurns || 10,
        allowedTools: options?.allowedTools || [
          'Read', 'Write', 'Edit', 'MultiEdit', 
          'Grep', 'Glob', 'TodoWrite'
        ],
        systemPrompt: options?.systemPrompt,
        continue: !!this.sessionId
      }
    })) {
      // Handle different message types
      if (message.type === 'text') {
        fullResponse += message.text;
        this.emit('stream-chunk', {
          type: 'assistant',
          content: message.text,
          fullContent: fullResponse,
          timestamp: new Date().toISOString()
        });
      }
      
      if (message.type === 'tool_use') {
        this.emit('tool-use', message);
      }
      
      if (message.type === 'result') {
        this.emit('query-complete', message);
      }
    }
    
    return fullResponse;
  }
}
```

### Phase 3: Implement Subagents

**File**: `src/agents/subagents/planning-agent.ts`

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

export class PlanningAgent {
  async plan(prompt: string, context: any) {
    for await (const message of query({
      prompt: `As a planning agent for book writing: ${prompt}`,
      options: {
        maxTurns: 15,
        allowedTools: ['TodoWrite', 'Read', 'Write', 'Grep', 'Glob'],
        systemPrompt: this.getPlanningSystemPrompt()
      }
    })) {
      // Emit planning events
      if (message.type === 'tool_use' && message.name === 'TodoWrite') {
        this.emit('plan-updated', message.input);
      }
    }
  }

  private getPlanningSystemPrompt(): string {
    return `You are a specialized planning agent for book writing...`;
  }
}
```

### Phase 4: Main Orchestrator Agent

**File**: `src/agents/main-agent.ts`

```typescript
export class MainAgent {
  private subagents = {
    planning: new PlanningAgent(),
    writing: new WritingAgent(),
    editing: new EditingAgent(),
    research: new ResearchAgent(),
    character: new CharacterAgent(),
    outline: new OutlineAgent()
  };

  async processMessage(message: string) {
    // Determine which subagent to use
    const intent = await this.analyzeIntent(message);
    
    switch (intent.type) {
      case 'planning':
        return this.subagents.planning.plan(message, intent.context);
      case 'writing':
        return this.subagents.writing.write(message, intent.context);
      // ... etc
    }
  }
}
```

### Phase 5: Update Agent Manager

**File**: `src/main/services/agent-manager.ts`

Replace `OpenRouterAgentService` with `ClaudeSDKAgentService`:

```typescript
import { ClaudeSDKAgentService } from '../../agents/core/claude-sdk-agent-service';

export class AgentManager {
  private agentService: ClaudeSDKAgentService;
  
  constructor(virtualFileManager, databaseManager) {
    this.agentService = new ClaudeSDKAgentService({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-5-sonnet-20241022',
      fileManager: virtualFileManager
    });
    
    this.setupEventListeners();
  }
}
```

### Phase 6: Tool Integration

The Claude SDK provides built-in tools:
- ✅ **Read**: Read file contents
- ✅ **Write**: Create/overwrite files
- ✅ **Edit**: Make targeted edits
- ✅ **MultiEdit**: Multiple edits in one file
- ✅ **Grep**: Search file contents
- ✅ **Glob**: Find files by pattern
- ✅ **TodoWrite**: Create/update planning todos
- ✅ **Bash**: Execute commands (with permissions)

**Integration with Virtual File Manager**:
```typescript
// The SDK will use our virtual file manager for all file operations
const agentService = new ClaudeSDKAgentService({
  fileSystem: {
    read: (path) => virtualFileManager.readFile(path),
    write: (path, content) => virtualFileManager.writeFile(path, content),
    list: (path) => virtualFileManager.listDirectory(path)
  }
});
```

## Benefits of Migration

### 1. **Streaming** (Built-in)
- ✅ No manual SSE parsing
- ✅ Proper chunk handling
- ✅ Error recovery
- ✅ Cancellation support

### 2. **Tools** (Native Support)
- ✅ File operations work out of the box
- ✅ Planning with TodoWrite
- ✅ Search with Grep/Glob
- ✅ Custom MCP tools

### 3. **Subagents** (Delegation)
- ✅ Specialized agents for different tasks
- ✅ Context passing between agents
- ✅ Parallel execution support

### 4. **Session Management**
- ✅ Automatic session persistence
- ✅ Resume conversations
- ✅ Context window management

### 5. **Permissions**
- ✅ User approval for file operations
- ✅ Bash command confirmation
- ✅ Configurable permission levels

## Implementation Timeline

### Week 1: Core Migration
- [ ] Create `claude-sdk-agent-service.ts`
- [ ] Update `agent-manager.ts` to use new service
- [ ] Test basic streaming functionality
- [ ] Verify file operations work

### Week 2: Subagents
- [ ] Implement Planning Agent
- [ ] Implement Writing Agent
- [ ] Implement Editing Agent
- [ ] Test subagent delegation

### Week 3: Advanced Features
- [ ] Implement Research Agent
- [ ] Implement Character Agent
- [ ] Implement Outline Agent
- [ ] Add TodoWrite integration

### Week 4: Polish & Testing
- [ ] Add permission system
- [ ] Implement MCP server support
- [ ] End-to-end testing
- [ ] Documentation

## Configuration

### Environment Variables
```env
# Claude API (via OpenRouter or direct)
ANTHROPIC_API_KEY=your_key_here
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Or use OpenRouter
OPENROUTER_API_KEY=your_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### Agent Options
```typescript
const options: ClaudeAgentOptions = {
  maxTurns: 10,
  allowedTools: ['Read', 'Write', 'Edit', 'TodoWrite', 'Grep', 'Glob'],
  systemPrompt: 'You are an expert book writing assistant...',
  temperature: 0.7,
  maxTokens: 4096
};
```

## References

- **Claude SDK Docs**: `REFERENCES/claude_agent_sdk/claude_agent_sdk_doc.md`
- **Streaming Guide**: `REFERENCES/claude_agent_sdk/streaming.md`
- **Subagents Guide**: `REFERENCES/claude_agent_sdk/subagents.md`
- **Tools Guide**: `REFERENCES/claude_agent_sdk/custom_tools.md`
- **Planning Tools**: `REFERENCES/claude_agent_sdk/todo.md`
- **Master Plan**: `AUTHOR_GUIDE/MASTER_DEVELOPMENT_PLAN.md`

## Next Steps

1. ✅ Fix current streaming issues (DONE)
2. 🔄 Create Claude SDK agent service (NEXT)
3. ⏳ Implement subagent architecture
4. ⏳ Integrate planning tools
5. ⏳ Add permission system

## Notes

- Keep `openrouter-agent-service.ts` as fallback during migration
- Test thoroughly with mock data before production
- Document all subagent capabilities
- Create user guide for agent selection
