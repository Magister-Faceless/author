# Part 1: Current Architecture & Event Flow Analysis

**Document**: Claude SDK Migration Guide - Part 1 of 4  
**Date**: 2025-10-05  
**Project**: Author Desktop Application  

---

## Table of Contents
1. [Current Technology Stack](#current-technology-stack)
2. [Architecture Overview](#architecture-overview)
3. [Streaming Event Flow](#streaming-event-flow)
4. [IPC Communication Layer](#ipc-communication-layer)
5. [Current Agent Implementation](#current-agent-implementation)
6. [What Works Well](#what-works-well)
7. [What Needs Migration](#what-needs-migration)

---

## Current Technology Stack

### Backend (Electron Main Process)
- **OpenRouter API**: Third-party AI service routing
- **Agent Service**: `OpenRouterAgentService.ts` - handles AI interactions
- **Agent Manager**: `agent-manager.ts` - orchestrates agent lifecycle
- **Virtual File Manager**: Manages agent-created documents
- **Database Manager**: SQLite-based storage for projects/files

### Frontend (Electron Renderer Process)
- **React 18+**: UI framework
- **ChatPanel**: Main chat interface component
- **IPC Client**: Secure communication with main process

### Communication Layer
- **Electron IPC**: Inter-process communication
- **Preload Script**: Security bridge between main and renderer
- **IPC Channels**: Validated channel definitions

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RENDERER PROCESS (Frontend)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ChatPanel.tsx                                        │  │
│  │  - Listens for: agent:stream-start                   │  │
│  │                 agent:stream-chunk                    │  │
│  │                 agent:stream-end                      │  │
│  │                 agent:message                         │  │
│  │  - Sends: agent:send-message                         │  │
│  └───────────────────┬──────────────────────────────────┘  │
│                      │ IPC via electronAPI                   │
└──────────────────────┼───────────────────────────────────────┘
                       │
┌──────────────────────┼───────────────────────────────────────┐
│  PRELOAD.TS         │                                        │
│  - Security validation                                       │
│  - Channel whitelisting (agent:*, file:*, etc.)            │
│  - Event wrapping                                            │
└──────────────────────┼───────────────────────────────────────┘
                       │
┌──────────────────────┼───────────────────────────────────────┐
│                MAIN PROCESS (Backend)                        │
│  ┌──────────────────▼─────────────────────────────────┐    │
│  │  AgentManager.ts                                    │    │
│  │  - IPC handler: 'agent:send-message'               │    │
│  │  - Forwards events to renderer via emitToRenderer  │    │
│  │  - Event forwarding:                                │    │
│  │    * stream-start  → agent:stream-start            │    │
│  │    * stream-chunk  → agent:stream-chunk            │    │
│  │    * stream-end    → agent:stream-end              │    │
│  └─────────────────┬──────────────────────────────────┘    │
│                    │                                         │
│  ┌─────────────────▼──────────────────────────────────┐    │
│  │  OpenRouterAgentService.ts                         │    │
│  │  - Calls OpenRouter API                            │    │
│  │  - Handles streaming responses                     │    │
│  │  - Emits events: stream-start, stream-chunk, etc. │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Streaming Event Flow

### Current Implementation (OpenRouter)

**Step-by-Step Event Flow:**

1. **User sends message** in ChatPanel
   ```typescript
   window.electronAPI.invoke('agent:send-message', { prompt: userInput })
   ```

2. **Main process receives** via IPC handler in `AgentManager`
   ```typescript
   ipcMain.handle('agent:send-message', async (event, data) => {
     return await agentManager.sendMessage(data.prompt, data.context);
   });
   ```

3. **AgentManager calls** OpenRouterAgentService
   ```typescript
   const result = await this.agentService.sendMessage(prompt, context);
   ```

4. **OpenRouterAgentService streams** from OpenRouter API
   ```typescript
   for await (const chunk of stream) {
     const content = chunk.choices[0]?.delta?.content;
     if (content) {
       this.emit('stream-chunk', { content });
     }
   }
   ```

5. **AgentManager forwards** events to renderer
   ```typescript
   this.agentService.on('stream-chunk', (data) => {
     this.emitToRenderer('agent:stream-chunk', data);
   });
   ```

6. **ChatPanel receives** and displays chunks
   ```typescript
   window.electronAPI.on('agent:stream-chunk', (data) => {
     setStreamingContent(prev => prev + data.content);
   });
   ```

### Event Types Currently Used

| Event Name | Direction | Purpose | Data Structure |
|------------|-----------|---------|----------------|
| `agent:stream-start` | Main → Renderer | Streaming begins | `{ messageId: string }` |
| `agent:stream-chunk` | Main → Renderer | Text chunk arrives | `{ content: string }` |
| `agent:stream-end` | Main → Renderer | Streaming completes | `{ messageId: string }` |
| `agent:message` | Main → Renderer | Complete message | `{ id, content, agentId, type, timestamp }` |
| `agent:error` | Main → Renderer | Error occurred | `{ error: string }` |
| `agent:send-message` | Renderer → Main | User sends message | `{ prompt: string, context?: any }` |

---

## IPC Communication Layer

### Security Architecture

**IPC Channels Whitelist** (`src/shared/ipc-channels.ts`)
```typescript
export const IPC_CHANNELS = {
  // Agent Events
  AGENT_STREAM_START: 'agent:stream-start',
  AGENT_STREAM_CHUNK: 'agent:stream-chunk',
  AGENT_STREAM_END: 'agent:stream-end',
  AGENT_MESSAGE: 'agent:message',
  AGENT_ERROR: 'agent:error',
  // ... more channels
};
```

**Preload Security Validation** (`src/main/preload.ts`)
```typescript
on: (channel: string, callback: (data: any) => void) => {
  const validPrefixes = ['agent:', 'file:', 'project:', 'virtual-file:'];
  const isValid = validChannels.includes(channel) || 
                  validPrefixes.some(prefix => channel.startsWith(prefix));
  
  if (isValid) {
    ipcRenderer.on(channel, (_, data) => callback(data));
  } else {
    console.warn('Attempted to listen on invalid channel:', channel);
  }
}
```

### Key Lessons Learned

**Streaming Event Blocking Issue** (Fixed in previous session)
- **Problem**: Streaming events weren't reaching frontend
- **Root Cause**: Preload script's channel validation was too strict
- **Solution**: 
  1. Added streaming channels to `IPC_CHANNELS`
  2. Modified preload validation to use prefix-based whitelisting
  3. Allowed `agent:*` prefix for all agent events

---

## Current Agent Implementation

### OpenRouterAgentService.ts

**Core Structure:**
```typescript
export class OpenRouterAgentService extends EventEmitter {
  async sendMessage(prompt: string, context?: any): Promise<AgentMessage[]> {
    const messageId = Date.now().toString();
    
    // Emit stream start
    this.emit('stream-start', { messageId });
    
    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: true
      })
    });
    
    // Process streaming response
    let fullContent = '';
    for await (const chunk of this.parseSSE(response.body)) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullContent += content;
      this.emit('stream-chunk', { content });
    }
    
    // Emit stream end
    this.emit('stream-end', { messageId });
    
    // Return final message
    return [{
      id: messageId,
      agentId: 'main',
      type: 'response',
      content: fullContent,
      timestamp: new Date(),
      metadata: {}
    }];
  }
}
```

**Event Pattern:**
- Extends Node.js `EventEmitter`
- Emits custom events: `stream-start`, `stream-chunk`, `stream-end`, `error`
- AgentManager subscribes to these events and forwards to renderer

---

## What Works Well

### ✅ Strengths of Current Implementation

1. **Clear separation of concerns**
   - UI logic in renderer process
   - AI logic in main process
   - Security bridge via preload

2. **Type-safe IPC communication**
   - Validated channels
   - Prefix-based whitelisting
   - TypeScript interfaces for data

3. **Real-time streaming**
   - Chunks displayed as they arrive
   - Good user experience
   - Event-driven architecture

4. **Virtual file system**
   - Already implemented for agent context
   - Database-backed storage
   - Session-aware file management

5. **Error handling**
   - Error events propagate to frontend
   - User feedback on failures
   - Logging infrastructure in place

---

## What Needs Migration

### 🔄 Components Requiring Change

1. **OpenRouterAgentService → Claude SDK Agent**
   - Replace OpenRouter API calls with Claude SDK `query()` function
   - Adapt event emission to Claude SDK message stream
   - Maintain same event interface for minimal UI changes

2. **Event Mapping**
   - Map Claude SDK message types to current event types
   - Transform `SDKMessage` to `AgentMessage` format
   - Preserve streaming behavior

3. **Agent Architecture**
   - Move from single agent to multi-agent system
   - Implement subagents for Planning, Writing, Editing
   - Add custom MCP tools for book writing workflow

4. **Session Management**
   - Integrate Claude SDK session handling
   - Track session IDs for conversation continuity
   - Implement session resumption

5. **Tool Integration**
   - Replace manual file operations with Claude SDK tools
   - Add custom MCP server for Author-specific tools
   - Integrate virtual file system with tools

### 🎯 Migration Goals

- **Preserve frontend interface**: Minimal changes to ChatPanel
- **Maintain streaming experience**: Keep real-time chunk display
- **Enhance capabilities**: Add planning, subagents, custom tools
- **Improve context**: Better session and file management
- **Keep security**: Maintain IPC validation and sandboxing

---

## Next Steps

Proceed to **Part 2: Claude SDK Integration Patterns** to learn:
- How the Claude SDK `query()` function works
- Message types and streaming patterns
- Subagent creation and delegation
- Custom MCP tool development
- Session management with the SDK
