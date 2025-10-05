# Claude SDK Subprocess Error - 2025-10-05 15:31

## Error
```
Error: Claude Code process exited with code 1
```

## Root Cause

The `@anthropic-ai/claude-agent-sdk` package is **NOT** a standalone API client. It's designed to work with the **Claude Code desktop application** by spawning it as a subprocess.

From the SDK documentation (line 110):
```
pathToClaudeCodeExecutable | string | Auto-detected | Path to Claude Code executable
```

The SDK:
1. Tries to auto-detect where Claude Code is installed
2. Spawns Claude Code as a child process
3. Communicates with it via IPC

## Why This Doesn't Work For Us

1. **Claude Code desktop app is not installed** on the system
2. **We're building our own desktop app** - we don't want to depend on another app
3. **OpenRouter API** is what we actually want to use
4. **The SDK is not designed** for direct API usage

## Evidence

Looking at the error stack trace:
```javascript
at ProcessTransport.getProcessExitError (webpack://author/./node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs?:6552:14)
at ChildProcess.exitHandler (webpack://author/./node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs?:6689:28)
```

The SDK is using:
- `ProcessTransport` - spawning a process
- `ChildProcess.exitHandler` - handling child process exits

This confirms it's spawning an external executable.

## Solutions

### ❌ Option 1: Install Claude Code
- Requires users to install Anthropic's Claude Code app
- Defeats the purpose of building our own app
- Not viable

### ✅ Option 2: Use OpenRouter Direct API
- Keep using OpenRouter API
- Implement our own agent orchestration
- Use the production prompts we created
- No external dependencies

### ✅ Option 3: Enhanced OpenRouter Service
- Enhance `OpenRouterAgentService` with agent features
- Implement todo tracking manually
- Implement subagent simulation
- Use our production prompts

## Recommended Path Forward

**Create an enhanced OpenRouter service that mimics the SDK behavior but uses direct API calls:**

1. Keep `OpenRouterAgentService` as the base
2. Add agent orchestration logic:
   - Todo list tracking
   - Subagent delegation (via prompt engineering)
   - Progress file management
   - Context management
3. Use our production prompts
4. Implement custom tools via prompt instructions

This gives us:
- ✅ Full control
- ✅ No external app dependencies
- ✅ Works with OpenRouter
- ✅ Agent-like behavior through prompts
- ✅ All the prompts we created are still useful

## Next Steps

1. Create `EnhancedOpenRouterAgentService`
2. Port the good ideas from ClaudeAgentService
3. Implement todo tracking in UI
4. Implement "subagent" behavior via prompt engineering
5. Keep all the production prompts

## Files to Modify

- Create: `src/agents/core/enhanced-openrouter-agent-service.ts`
- Update: `src/main/services/agent-manager.ts` to use enhanced service
- Keep: All prompt files (still valuable!)
- Keep: VirtualFileManager integration

## Lesson Learned

Always verify what a package actually does before deep integration. The Claude Agent SDK is:
- ❌ NOT a standalone API client
- ❌ NOT for building your own apps
- ✅ FOR integrating with Claude Code desktop app
- ✅ FOR extending Claude Code functionality

For our use case (building our own app), we need direct API integration with smart prompt engineering.
