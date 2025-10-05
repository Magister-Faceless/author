# Part 4: Pitfalls, Testing & Validation

**Document**: Claude SDK Migration Guide - Part 4 of 4  
**Date**: 2025-10-05  
**Project**: Author Desktop Application  

---

## Table of Contents
1. [Critical Pitfalls to Avoid](#critical-pitfalls-to-avoid)
2. [Lessons from Previous Streaming Fix](#lessons-from-previous-streaming-fix)
3. [Testing Strategy](#testing-strategy)
4. [Debugging Guide](#debugging-guide)
5. [Performance Optimization](#performance-optimization)
6. [Validation Checklist](#validation-checklist)
7. [Production Readiness](#production-readiness)

---

## Critical Pitfalls to Avoid

### 🚨 Pitfall #1: Using String Prompt with MCP Tools

**Problem:**
```typescript
// ❌ WRONG - This will NOT work with custom MCP tools
const result = query({
  prompt: "Help me write a chapter",  // String prompt
  options: {
    mcpServers: { 'author-tools': customTools }  // MCP tools ignored!
  }
});
```

**Solution:**
```typescript
// ✅ CORRECT - Use async generator for MCP tools
async function* messageStream() {
  yield {
    type: 'user' as const,
    message: { role: 'user' as const, content: "Help me write a chapter" }
  };
}

const result = query({
  prompt: messageStream(),  // Must be async generator!
  options: {
    mcpServers: { 'author-tools': customTools }
  }
});
```

**Why:** Custom MCP tools require streaming input mode. String prompts use single-message mode which doesn't support MCP servers.

---

### 🚨 Pitfall #2: Incorrect Tool Naming

**Problem:**
```typescript
// ❌ WRONG - Incorrect tool name format
allowedTools: [
  'write_progress_file',  // Missing MCP prefix!
  'author-tools__write_progress_file',  // Wrong separator!
]
```

**Solution:**
```typescript
// ✅ CORRECT - Proper MCP tool naming
allowedTools: [
  'mcp__author-tools__write_progress_file',  // Pattern: mcp__{server}__{tool}
  'mcp__author-tools__write_context_note',
  'Read',  // Built-in tools don't need prefix
  'Write'
]
```

**Format:** `mcp__{server-name}__{tool-name}`

---

### 🚨 Pitfall #3: Not Enabling Partial Messages

**Problem:**
```typescript
// ❌ WRONG - Won't get streaming chunks
const result = query({
  prompt: messageStream(),
  options: {
    // Missing includePartialMessages!
  }
});

// You'll only get complete messages, not real-time chunks
```

**Solution:**
```typescript
// ✅ CORRECT - Enable streaming chunks
const result = query({
  prompt: messageStream(),
  options: {
    includePartialMessages: true  // Essential for real-time streaming!
  }
});
```

---

### 🚨 Pitfall #4: Blocking the Event Loop

**Problem:**
```typescript
// ❌ WRONG - Blocking synchronous processing
for await (const message of query({/*...*/})) {
  // Synchronous heavy processing blocks other messages
  processMessageBlocking(message);
}
```

**Solution:**
```typescript
// ✅ CORRECT - Async processing
for await (const message of query({/*...*/})) {
  // Process asynchronously
  setImmediate(() => this.handleSDKMessage(message));
  // Or emit events for async handling
  this.emit('sdk-message', message);
}
```

---

### 🚨 Pitfall #5: Not Handling Session IDs

**Problem:**
```typescript
// ❌ WRONG - Lost session continuity
for await (const message of query({/*...*/})) {
  // Never capturing session ID!
}

// Later query has no context
query({ prompt: "Continue", options: {} });
```

**Solution:**
```typescript
// ✅ CORRECT - Track session for continuity
let sessionId: string | undefined;

for await (const message of query({/*...*/})) {
  if (message.type === 'system' && message.subtype === 'init') {
    sessionId = message.session_id;
    await saveSessionId(sessionId);  // Persist it!
  }
}

// Resume conversation
query({ prompt: "Continue", options: { resume: sessionId } });
```

---

### 🚨 Pitfall #6: IPC Channel Validation Issues

**Problem:**
```typescript
// In preload.ts - overly strict validation
on: (channel: string, callback) => {
  if (channel === 'agent:stream-chunk') {  // Only exact match!
    ipcRenderer.on(channel, callback);
  }
}
```

**Solution:**
```typescript
// ✅ CORRECT - Prefix-based validation
on: (channel: string, callback) => {
  const validPrefixes = ['agent:', 'file:', 'virtual-file:'];
  const isValid = validPrefixes.some(prefix => channel.startsWith(prefix));
  
  if (isValid) {
    ipcRenderer.on(channel, (_, data) => callback(data));
  }
}
```

**Lesson:** Use prefix whitelisting, not exhaustive enumeration.

---

### 🚨 Pitfall #7: Tool Permission Issues

**Problem:**
```typescript
// ❌ WRONG - Tools not allowed
const result = query({
  prompt: messageStream(),
  options: {
    agents: { 'writing-agent': {...} },
    // No allowedTools specified - defaults to NONE!
  }
});
```

**Solution:**
```typescript
// ✅ CORRECT - Explicitly allow tools
const result = query({
  prompt: messageStream(),
  options: {
    agents: { 'writing-agent': {...} },
    allowedTools: [
      'Read', 'Write', 'Edit', 'MultiEdit',
      'Grep', 'Glob', 'TodoWrite',
      'mcp__author-tools__write_progress_file'
    ]
  }
});
```

---

### 🚨 Pitfall #8: Async Generator Completion

**Problem:**
```typescript
// ❌ WRONG - Generator never completes
async function* messageStream() {
  while (true) {  // Infinite loop!
    const msg = await waitForMessage();
    yield msg;
  }
}
```

**Solution:**
```typescript
// ✅ CORRECT - Proper generator lifecycle
async function* messageStream() {
  // Yield initial message
  yield initialMessage;
  
  // Generator completes naturally
  // or conditionally based on state
}

// OR use interrupt() for manual control
await queryInstance.interrupt();
```

---

## Lessons from Previous Streaming Fix

### Root Cause Analysis

**Original Issue:** Streaming events not reaching frontend

**Investigation Path:**
1. ✅ Backend emitting events correctly (verified in AgentManager)
2. ✅ AgentService streaming working (verified in OpenRouterAgentService)
3. ❌ Frontend not receiving events (ChatPanel listeners inactive)
4. 🎯 **Root cause:** Preload script blocking channels

**Fix Applied:**
1. Added streaming channels to `IPC_CHANNELS` constant
2. Modified preload validation to use prefix whitelisting
3. Simplified `removeListener` to use `removeAllListeners`

### Key Takeaway

**Always validate the full communication path:**
```
Backend Event Emission
    ↓
IPC Send
    ↓
Preload Validation ← COMMON FAILURE POINT
    ↓
Renderer Reception
    ↓
UI Update
```

---

## Testing Strategy

### Unit Tests

**Test Claude Agent Service:**

```typescript
// tests/unit/claude-agent-service.test.ts
import { ClaudeAgentService } from '@agents/core/claude-agent-service';

describe('ClaudeAgentService', () => {
  let service: ClaudeAgentService;
  
  beforeEach(() => {
    service = new ClaudeAgentService(mockVirtualFileManager, '/test/cwd');
  });
  
  it('should emit stream-start on message begin', async () => {
    const streamStartSpy = jest.fn();
    service.on('stream-start', streamStartSpy);
    
    await service.sendMessage('Test prompt');
    
    expect(streamStartSpy).toHaveBeenCalled();
  });
  
  it('should emit stream-chunk for each content delta', async () => {
    const chunkSpy = jest.fn();
    service.on('stream-chunk', chunkSpy);
    
    await service.sendMessage('Test prompt');
    
    expect(chunkSpy).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.any(String) })
    );
  });
  
  it('should capture session ID from init message', async () => {
    let capturedSessionId: string | undefined;
    
    service.on('session-started', ({ sessionId }) => {
      capturedSessionId = sessionId;
    });
    
    await service.sendMessage('Test prompt');
    
    expect(capturedSessionId).toBeDefined();
  });
});
```

### Integration Tests

**Test End-to-End Flow:**

```typescript
// tests/integration/agent-streaming.test.ts
import { AgentManager } from '@main/services/agent-manager';

describe('Agent Streaming Integration', () => {
  it('should stream message from backend to frontend', async () => {
    const agentManager = new AgentManager(/* mocks */);
    const chunks: string[] = [];
    
    // Mock IPC emitToRenderer
    agentManager.emitToRenderer = (channel, data) => {
      if (channel === 'agent:stream-chunk') {
        chunks.push(data.content);
      }
    };
    
    await agentManager.sendMessage('Write a paragraph');
    
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toContain('paragraph');
  });
});
```

### Manual Testing Checklist

**Basic Functionality:**
- [ ] Send message and receive response
- [ ] Streaming chunks appear in real-time
- [ ] Complete message displayed correctly
- [ ] Error handling shows user-friendly messages

**Advanced Features:**
- [ ] Progress files created automatically
- [ ] Context notes saved and retrievable
- [ ] Session resumption works
- [ ] Subagents can be invoked explicitly
- [ ] Custom MCP tools execute successfully

**Edge Cases:**
- [ ] Empty message handling
- [ ] Very long messages (>10k characters)
- [ ] Rapid consecutive messages
- [ ] Network interruption recovery
- [ ] Invalid session ID handling

---

## Debugging Guide

### Enable Debug Logging

**In Claude Agent Service:**

```typescript
private handleSDKMessage(message: SDKMessage): AgentMessage | null {
  console.log('[SDK Message]', message.type, message);  // Add logging
  
  switch (message.type) {
    // ... handle messages
  }
}
```

**In Main Process:**

```typescript
// Set environment variable
DEBUG=claude:*

// Or in code
if (process.env.DEBUG) {
  console.log('Detailed debug info:', data);
}
```

### Common Issues & Solutions

**Issue: No streaming chunks appearing**

```typescript
// Check 1: Is includePartialMessages enabled?
options: {
  includePartialMessages: true  // Must be true!
}

// Check 2: Are you handling stream_event messages?
if (message.type === 'stream_event') {
  console.log('Stream event:', message.event.type);
}

// Check 3: Is preload allowing the channel?
// Verify in preload.ts that 'agent:stream-chunk' is whitelisted
```

**Issue: Tools not executing**

```typescript
// Check 1: Are tools in allowedTools list?
console.log('Allowed tools:', options.allowedTools);

// Check 2: Is tool name correct (with mcp__ prefix)?
'mcp__author-tools__write_progress_file'  // Check format

// Check 3: Is MCP server registered?
console.log('MCP servers:', Object.keys(options.mcpServers));
```

**Issue: Session not resuming**

```typescript
// Check 1: Did you capture session ID?
if (message.type === 'system' && message.subtype === 'init') {
  console.log('Session ID:', message.session_id);  // Must be saved!
}

// Check 2: Is resume option set correctly?
options: {
  resume: savedSessionId  // Must be valid session ID
}
```

### Network Debugging

**Monitor API Calls:**

```typescript
// Wrap query() to log network activity
const originalQuery = query;
query = (...args) => {
  console.log('Query started:', args);
  const result = originalQuery(...args);
  
  return {
    async *[Symbol.asyncIterator]() {
      for await (const msg of result) {
        console.log('Message received:', msg.type);
        yield msg;
      }
    }
  };
};
```

---

## Performance Optimization

### Message Processing

**Batch Small Chunks:**

```typescript
private chunkBuffer: string = '';
private chunkTimeout: NodeJS.Timeout | null = null;

private handleStreamChunk(chunk: string) {
  this.chunkBuffer += chunk;
  
  // Debounce chunk emission
  if (this.chunkTimeout) {
    clearTimeout(this.chunkTimeout);
  }
  
  this.chunkTimeout = setTimeout(() => {
    this.emit('stream-chunk', { content: this.chunkBuffer });
    this.chunkBuffer = '';
  }, 50);  // Emit every 50ms max
}
```

### Memory Management

**Limit Message History:**

```typescript
private messageHistory: AgentMessage[] = [];
private readonly MAX_HISTORY = 100;

private addToHistory(message: AgentMessage) {
  this.messageHistory.push(message);
  
  if (this.messageHistory.length > this.MAX_HISTORY) {
    this.messageHistory.shift();  // Remove oldest
  }
}
```

### Virtual File Cleanup

**Automatic Cleanup:**

```typescript
async cleanupOldVirtualFiles(daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const files = await this.virtualFileManager.listFiles();
  const oldFiles = files.filter(f => f.createdAt < cutoffDate);
  
  for (const file of oldFiles) {
    await this.virtualFileManager.deleteFile(file.id);
  }
  
  console.log(`Cleaned up ${oldFiles.length} old virtual files`);
}
```

---

## Validation Checklist

### Pre-Migration

- [ ] All dependencies installed (`@anthropic-ai/claude-agent-sdk`, `zod`)
- [ ] API key configured in environment
- [ ] Feature flag set up
- [ ] Backup created of current working code

### Post-Implementation

- [ ] Service compiles without errors
- [ ] All event types emitted correctly
- [ ] IPC channels validated in preload
- [ ] Frontend receives all events
- [ ] Streaming displays in real-time

### Feature Validation

**Core Features:**
- [ ] Basic chat works
- [ ] Streaming is smooth
- [ ] Errors display properly
- [ ] Session continuity maintained

**Advanced Features:**
- [ ] Progress files created
- [ ] Context notes saved
- [ ] Virtual files readable
- [ ] Subagents invocable
- [ ] Custom tools execute

### Performance Validation

- [ ] First message response < 3 seconds
- [ ] Streaming latency < 100ms
- [ ] Memory usage stable
- [ ] No memory leaks over extended use
- [ ] CPU usage reasonable

---

## Production Readiness

### Security Checklist

- [ ] API keys stored securely (not hardcoded)
- [ ] IPC channels validated strictly
- [ ] Tool permissions configured properly
- [ ] File access restricted to project directories
- [ ] Error messages don't leak sensitive data

### Monitoring

**Add Metrics:**

```typescript
class MetricsCollector {
  private metrics = {
    messagesProcessed: 0,
    streamingChunks: 0,
    errors: 0,
    averageResponseTime: 0
  };
  
  recordMessage(startTime: number) {
    this.metrics.messagesProcessed++;
    const duration = Date.now() - startTime;
    
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.messagesProcessed - 1) + duration) 
      / this.metrics.messagesProcessed;
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
}
```

### Error Reporting

**Integrate Error Tracking:**

```typescript
private handleError(error: Error, context: any) {
  console.error('Claude SDK Error:', error, context);
  
  // Send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    errorTracker.captureException(error, { context });
  }
  
  // Emit user-friendly error
  this.emit('error', {
    message: 'An error occurred processing your message',
    recoverable: true
  });
}
```

### Deployment

**Steps for Production:**

1. **Test thoroughly** with `USE_CLAUDE_SDK=true`
2. **Monitor metrics** during beta period
3. **Gradually roll out** to users
4. **Keep rollback plan** ready
5. **Monitor error rates** closely
6. **Remove old code** after validation period

---

## Migration Complete!

You now have:
- ✅ Comprehensive understanding of current architecture
- ✅ Deep knowledge of Claude SDK patterns
- ✅ Complete implementation guide
- ✅ Testing and validation strategies
- ✅ Production readiness checklist

### Next Actions

1. Install dependencies
2. Create `ClaudeAgentService`
3. Add feature flag to `AgentManager`
4. Test with `USE_CLAUDE_SDK=true`
5. Validate all features work
6. Deploy gradually to production

**Good luck with your migration!** 🚀
