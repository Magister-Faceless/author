# Claude Agent SDK Requirements - Complete Analysis

**Date**: 2025-10-05 15:46  
**Status**: ✅ CLI Installed, ⚠️ API Key Conflict  

---

## What We Discovered

### ✅ You Were Right!

The information you provided was **accurate**. The Claude Agent SDK requires the **Claude Code CLI** to function, not the full desktop app.

### What's Required

1. **Claude Agent SDK** (npm package) - ✅ Already installed
   ```bash
   npm install @anthropic-ai/claude-agent-sdk
   ```

2. **Claude Code CLI** (global executable) - ✅ NOW installed
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
   
   Verified: `claude --version` → `2.0.8 (Claude Code)`

### How It Works

```
Your App
    ↓
Claude Agent SDK (@anthropic-ai/claude-agent-sdk)
    ↓
Spawns Child Process
    ↓
Claude Code CLI (@anthropic-ai/claude-code)
    ↓
Performs file operations, tool usage, etc.
    ↓
Communicates with Anthropic API
```

The SDK is essentially a **wrapper** that spawns the CLI and communicates with it via IPC.

---

## Current Problem: API Key Conflict

### The Issue

- **Claude Code CLI** expects → Anthropic API key
- **We have configured** → OpenRouter API key
- **Conflict**: The CLI will try to use Anthropic's API, not OpenRouter

### Authentication Required

The CLI needs to be authenticated:
```bash
claude auth login
```

This would require an **Anthropic API key**, not our OpenRouter key.

---

## Options Going Forward

### Option 1: Get Anthropic API Key ⚠️

**Pros:**
- ✅ Use the full Claude Agent SDK as designed
- ✅ All features work (subagents, MCP tools, etc.)
- ✅ Our prompts are ready
- ✅ Production-grade agent system

**Cons:**
- ❌ Need Anthropic account and API key
- ❌ Different billing from OpenRouter
- ❌ May have rate limits/costs

**Steps:**
1. Get Anthropic API key from https://console.anthropic.com
2. Authenticate CLI: `claude auth login`
3. Update `.env` with Anthropic key
4. Test with `USE_CLAUDE_SDK=true`

### Option 2: Enhanced OpenRouter Service ✅ **RECOMMENDED**

**Pros:**
- ✅ Use existing OpenRouter setup (already paid for)
- ✅ No additional authentication needed
- ✅ Full control over implementation
- ✅ All our prompts are still valuable
- ✅ Can simulate agent features

**Cons:**
- ❌ Need to implement agent orchestration ourselves
- ❌ No native subagent support
- ❌ More development work

**Steps:**
1. Create `EnhancedOpenRouterAgentService`
2. Implement todo tracking via prompt engineering
3. Implement "subagent" behavior via prompt engineering
4. Use our production prompts
5. Integrate with VirtualFileManager

### Option 3: Hybrid Approach 🤔

**Concept:**
- Use OpenRouter for LLM calls
- Use Claude Code CLI just for file operations
- Best of both worlds?

**Reality:**
- ❌ Complex integration
- ❌ CLI expects to handle LLM calls too
- ❌ Not how the SDK is designed
- ❌ Likely to cause issues

---

## Recommendation

### Go with Option 2: Enhanced OpenRouter Service

**Why:**
1. **You already have OpenRouter working** and paid for
2. **Full control** over the implementation
3. **All our prompt work is still valuable**
4. **Can achieve similar agent behavior** through smart prompting
5. **No additional API costs or authentication**

**What we can implement:**

```typescript
class EnhancedOpenRouterAgentService {
  // Use production prompts
  private systemPrompt = MAIN_AGENT_PROMPT;
  
  // Implement todo tracking
  async sendMessage(prompt: string) {
    // Add instructions for creating todos in prompt
    // Parse responses for todo markers
    // Emit todo events to UI
  }
  
  // Simulate subagents via prompt engineering
  async delegateToSubagent(task: string, agentType: string) {
    // Use specialized prompts (PLANNING_AGENT_PROMPT, etc.)
    // Make separate API call with focused context
    // Return result to main agent
  }
  
  // Integrate with VirtualFileManager
  async createProgressFile(sessionId: string, content: string) {
    // Use existing VirtualFileManager
  }
}
```

**Features we can implement:**
- ✅ Todo list tracking (via prompt markers + parsing)
- ✅ "Subagent" delegation (via multi-call orchestration)
- ✅ Progress files (via VirtualFileManager)
- ✅ Context notes (via VirtualFileManager)
- ✅ Streaming (already works)
- ✅ All our production prompts

**What we won't get:**
- ❌ Native SDK subagent support
- ❌ Built-in file operation tools
- ❌ CLI integration

**But we don't actually need those** for a book writing app because:
- File operations can be handled by our Electron app directly
- Subagent behavior can be simulated with prompt engineering
- We have full control over the UX

---

## Technical Implementation Plan

### Phase 1: Enhanced Service Foundation
```typescript
// src/agents/core/enhanced-openrouter-agent-service.ts
export class EnhancedOpenRouterAgentService extends OpenRouterAgentService {
  constructor(options) {
    super(options);
    this.systemPrompt = MAIN_AGENT_PROMPT; // Use production prompt
  }
  
  async sendMessage(prompt: string) {
    // Enhance prompt with agent instructions
    const enhancedPrompt = this.buildEnhancedPrompt(prompt);
    
    // Call OpenRouter API
    const response = await this.callAPI(enhancedPrompt);
    
    // Parse for agent behaviors
    this.parseAgentBehaviors(response);
    
    return response;
  }
}
```

### Phase 2: Todo Tracking
```typescript
// Parse response for todo markers
private parseAgentBehaviors(response: string) {
  // Look for todo list patterns
  const todoMatch = response.match(/\[\] Task: (.+)/g);
  if (todoMatch) {
    this.emit('todos', this.parseTodos(todoMatch));
  }
}
```

### Phase 3: Subagent Simulation
```typescript
// Delegate to "subagent" via prompt engineering
async delegateToSubagent(task: string, agentType: 'planning' | 'writing' | 'editing') {
  const agentPrompts = {
    planning: PLANNING_AGENT_PROMPT,
    writing: WRITING_AGENT_PROMPT,
    editing: EDITING_AGENT_PROMPT
  };
  
  // Make focused API call
  const result = await this.callAPI(task, {
    systemPrompt: agentPrompts[agentType],
    temperature: 0.7
  });
  
  return result;
}
```

### Phase 4: Integration
```typescript
// Update AgentManager to use enhanced service
constructor() {
  this.agentService = new EnhancedOpenRouterAgentService({
    apiKey: process.env.CLAUDE_API_KEY,
    apiBaseUrl: process.env.CLAUDE_API_BASE_URL,
    model: process.env.CLAUDE_MODEL
  });
}
```

---

## Cost Analysis

### Option 1: Anthropic API
- Direct Anthropic billing
- Claude 3.5 Sonnet: ~$3/$15 per million tokens (input/output)
- Need new account and setup

### Option 2: OpenRouter (Current)
- Already set up and funded
- Same models available
- Existing API key works
- No additional setup

**Winner**: Option 2 (use what you already have)

---

## Decision Matrix

| Criterion | Anthropic SDK | Enhanced OpenRouter |
|-----------|---------------|---------------------|
| **Setup Time** | 1-2 hours (auth + test) | 3-4 hours (implement) |
| **API Costs** | New billing | Existing |
| **Feature Parity** | 100% native | 90% simulated |
| **Control** | Limited | Full |
| **Maintenance** | SDK updates | Our code |
| **Risk** | Low (proven SDK) | Medium (custom) |

**Recommendation**: Enhanced OpenRouter
- Slightly more work upfront
- Full control long-term
- Use existing infrastructure
- All prompts still valuable

---

## Next Steps

### If Going with Enhanced OpenRouter (Recommended):

1. **Create new service**:
   ```bash
   src/agents/core/enhanced-openrouter-agent-service.ts
   ```

2. **Implement core features**:
   - Use MAIN_AGENT_PROMPT
   - Parse todo markers from responses
   - Implement subagent delegation via multi-call
   - Integrate VirtualFileManager

3. **Update AgentManager**:
   - Use EnhancedOpenRouterAgentService
   - Remove USE_CLAUDE_SDK flag

4. **Test thoroughly**:
   - Todo list creation
   - Streaming
   - Progress files
   - Context management

### If Going with Anthropic API:

1. **Get API key** from https://console.anthropic.com
2. **Authenticate CLI**: `claude auth login`
3. **Update .env**:
   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   USE_CLAUDE_SDK=true
   ```
4. **Test** the existing ClaudeAgentService

---

## Conclusion

**The research you provided was correct!** The SDK needs the CLI, not the desktop app. We've now installed it.

**However**, there's an API key mismatch between:
- What we have: OpenRouter key
- What CLI needs: Anthropic key

**Best path forward**: Build Enhanced OpenRouter Service that gives us agent-like behavior without needing the SDK/CLI at all.

All the prompts we created are still valuable - they'll power the enhanced service!

**Your call**: Which option do you prefer?
1. Get Anthropic API key and use native SDK
2. Build enhanced OpenRouter service (my recommendation)
