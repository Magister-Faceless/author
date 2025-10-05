# Claude SDK + OpenRouter Incompatibility Issue

**Date**: 2025-10-05  
**Error**: `Claude Code process exited with code 1`

---

## 🔴 Problem

The `@anthropic-ai/claude-agent-sdk` is designed to work with Anthropic's official API and spawns a "Claude Code process" internally. This doesn't work with OpenRouter or alternative models like Grok-4-Fast and GLM-4.6.

**Error Details**:
```
Error: Claude Code process exited with code 1
    at ProcessTransport.getProcessExitError
    at ChildProcess.exitHandler
```

---

## 🔍 Root Cause

The Claude Agents SDK uses:
1. **Process-based architecture** - Spawns a separate Claude Code process
2. **Anthropic API only** - Hardcoded to use Anthropic's endpoints
3. **Official models only** - Expects Claude 3.5 Sonnet, etc.

Our setup uses:
- ❌ OpenRouter API (not Anthropic)
- ❌ Grok-4-Fast (not Claude)
- ❌ GLM-4.6 (not Claude)

**Incompatibility**: The SDK cannot be used with OpenRouter or non-Claude models.

---

## ✅ Solution Options

### **Option 1: Use Anthropic SDK Directly** (Recommended)
Replace Claude Agents SDK with the standard Anthropic SDK and implement our own agent orchestration.

**Pros**:
- ✅ Works with OpenRouter
- ✅ Works with any model
- ✅ Full control over agent behavior
- ✅ Simpler, more maintainable

**Cons**:
- ❌ Need to implement our own tool calling
- ❌ Need to implement our own subagent system
- ❌ More code to write

### **Option 2: Use Anthropic API + Claude Models**
Switch to using Anthropic's official API with Claude 3.5 Sonnet.

**Pros**:
- ✅ Claude Agents SDK works perfectly
- ✅ Built-in tools and subagents
- ✅ Less code

**Cons**:
- ❌ Requires Anthropic API key
- ❌ More expensive than OpenRouter
- ❌ Can't use Grok or other models

### **Option 3: Hybrid Approach**
Use Anthropic SDK for API calls but implement our own agent orchestration inspired by the Claude Agents SDK patterns.

**Pros**:
- ✅ Works with OpenRouter
- ✅ Works with any model
- ✅ Can implement similar patterns to Claude Agents SDK
- ✅ Flexible

**Cons**:
- ❌ More implementation work
- ❌ Need to maintain our own agent system

---

## 🎯 Recommended Implementation

**Use Option 1: Anthropic SDK with Custom Agent System**

This gives us:
- Full compatibility with OpenRouter
- Support for any model (Grok, GLM, Claude, etc.)
- Complete control over agent behavior
- Simpler architecture

---

## 📝 Implementation Plan

1. Replace `@anthropic-ai/claude-agent-sdk` with `@anthropic-ai/sdk`
2. Create custom agent orchestration system
3. Implement tool calling manually
4. Implement subagent delegation logic
5. Keep the same event-driven architecture

This will work with OpenRouter and any models while maintaining the same functionality.
