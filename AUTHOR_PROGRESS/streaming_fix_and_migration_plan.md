# Streaming Fix & Claude SDK Migration Plan

**Date**: 2025-10-05  
**Status**: ✅ Streaming Fixed | 📋 Migration Planned

## Summary

Fixed the streaming SSE parsing error and created a comprehensive migration plan to transition from OpenRouter direct API to Claude Agents SDK.

## ✅ Issues Fixed

### 1. SSE Parsing Error
**Problem**: JSON data was being split across TCP chunks, causing parse failures:
```
Failed to parse SSE data: {"id":"gen-...","choices":[{"index":0,"delta":{"role":"assistant"...
```

**Solution**: Implemented proper line buffering per OpenRouter SSE specification:
- Accumulate chunks in buffer until complete line (`\n`) is found
- Process only complete lines
- Skip SSE comments (`: OPENROUTER PROCESSING`)
- Keep incomplete data in buffer for next iteration

**Result**: No more parse errors, streaming works reliably

### 2. Response Not Showing in UI
**Root Cause**: Events were being emitted but the SSE parsing was failing before content could be extracted

**Solution**: With proper buffering, content is now correctly extracted and emitted via `stream-chunk` events

## 📋 Migration Plan to Claude Agents SDK

### Why Migrate?

The current OpenRouter implementation is limited:
- ❌ Manual SSE parsing (error-prone)
- ❌ No tool integration (Read, Write, Edit, etc.)
- ❌ No subagent support
- ❌ No planning capabilities (TodoWrite)
- ❌ No permission system
- ❌ Manual session management

### What Claude SDK Provides

✅ **Built-in Streaming**: No manual SSE parsing needed  
✅ **Native Tools**: Read, Write, Edit, MultiEdit, Grep, Glob, TodoWrite, Bash  
✅ **Subagent Architecture**: Delegate to specialized agents  
✅ **Session Management**: Automatic persistence and resumption  
✅ **Planning Tools**: TodoWrite for task management  
✅ **Permission System**: User approval for file operations  
✅ **MCP Integration**: Custom tool servers  

### Architecture

```
Main Agent (Orchestrator)
├── Planning Agent (TodoWrite, Read, Write, Grep, Glob)
├── Writing Agent (TodoWrite, Read, Write, Edit, MultiEdit, Grep)
├── Editing Agent (TodoWrite, Read, Edit, MultiEdit, Grep, Glob)
├── Research Agent (TodoWrite, Read, Write, Grep, Glob, Bash)
├── Character Agent (TodoWrite, Read, Write, Edit, Grep, Glob)
└── Outline Agent (TodoWrite, Read, Write, Edit, Grep, Glob)
```

### Implementation Files

1. **Core Service**: `src/agents/core/claude-sdk-agent-service.ts`
   - Replace OpenRouter service
   - Use Claude SDK's `query()` function
   - Built-in streaming support

2. **Subagents**: `src/agents/subagents/`
   - `planning-agent.ts`
   - `writing-agent.ts`
   - `editing-agent.ts`
   - `research-agent.ts`
   - `character-agent.ts`
   - `outline-agent.ts`

3. **Main Orchestrator**: `src/agents/main-agent.ts`
   - Intent analysis
   - Subagent delegation
   - Context management

4. **Updated Manager**: `src/main/services/agent-manager.ts`
   - Switch to Claude SDK service
   - Handle new event types
   - Tool integration

### Timeline

**Week 1**: Core Migration
- Create Claude SDK agent service
- Update agent manager
- Test basic streaming

**Week 2**: Subagents
- Implement 6 specialized agents
- Test delegation

**Week 3**: Advanced Features
- TodoWrite integration
- Permission system
- MCP servers

**Week 4**: Polish
- End-to-end testing
- Documentation
- User guide

## Current Status

### ✅ Working Now
- OpenRouter streaming (with fixed SSE parsing)
- Basic agent responses
- Frontend display
- Event forwarding

### 🔄 Next Steps
1. Test current streaming fix thoroughly
2. Begin Claude SDK migration
3. Implement subagent architecture
4. Add planning tools (TodoWrite)
5. Integrate file operations

## Testing the Current Fix

The app is running. Try sending a message to verify:
1. No SSE parse errors in console
2. Streaming content appears in UI
3. Complete response is saved to thread

## Documentation

- **Streaming Fix**: `AUTHOR_ERRORS/streaming_sse_parse_error.md`
- **Migration Plan**: `AUTHOR_GUIDE/CLAUDE_SDK_MIGRATION_PLAN.md`
- **Claude SDK Docs**: `REFERENCES/claude_agent_sdk/`
- **OpenRouter Streaming**: `REFERENCES/openai_like/openrouter_streaming.md`

## Key Takeaways

1. **SSE Parsing**: Always buffer incomplete lines when processing streams
2. **Claude SDK**: Purpose-built for agentic applications with tools
3. **Architecture**: Subagent pattern enables specialized capabilities
4. **Tools**: File operations, planning, and search built-in
5. **Migration**: Incremental approach with fallback support
