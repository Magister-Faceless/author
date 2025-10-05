# Frontend-Backend Connection Debug

**Date**: 2025-10-05  
**Issue**: Messages not reaching AI agents  
**Status**: 🔍 **DEBUGGING**

---

## 🔍 What I've Added

### **1. Enhanced Logging in ChatPanel** ✅
**File**: `src/renderer/components/ChatPanel.tsx`

**Added Logs**:
```typescript
// When sending message
console.log('Sending message:', message);
console.log('Calling electronAPI.agent.sendMessage');
console.log('Send message response:', response);

// When receiving message
console.log('Received agent message:', msg);

// When setting up listeners
console.log('Setting up agent event listeners');
```

**What to Check**:
1. Open DevTools Console (F12)
2. Send a message
3. Look for these logs:
   - "Sending message: [your message]"
   - "Calling electronAPI.agent.sendMessage"
   - "Send message response: [response]"
   - "Received agent message: [AI response]"

---

## 🔧 Connection Flow

### **Expected Flow**:
```
1. User types message in ChatPanel
       ↓
2. handleSendMessage() called
       ↓
3. electronAPI.agent.sendMessage(message)
       ↓
4. IPC: AGENT_SEND_MESSAGE
       ↓
5. Main Process: AgentManager.sendMessage()
       ↓
6. AgentManager.executeQuery()
       ↓
7. OpenRouterAgentService.sendMessage()
       ↓
8. fetch() to OpenRouter API
       ↓
9. Response received
       ↓
10. Event emitted: 'agent:message'
       ↓
11. AgentManager.emitToRenderer()
       ↓
12. IPC: mainWindow.webContents.send('agent:message')
       ↓
13. Renderer: electronAPI.on('agent:message')
       ↓
14. ChatPanel: handleAgentMessage()
       ↓
15. addMessageToThread()
       ↓
16. UI updates with AI response
```

---

## 🚨 Potential Issues

### **Issue 1: Event Listeners Not Set Up**
**Symptom**: No "Setting up agent event listeners" log

**Check**:
```typescript
// In ChatPanel, check if this runs
if ((window as any).electronAPI?.on) {
  console.log('Setting up agent event listeners'); // Should see this
}
```

**Fix**: Event listeners are now properly set up in useEffect

---

### **Issue 2: IPC Not Connected**
**Symptom**: "electronAPI is undefined" error

**Check**:
```typescript
// In console
console.log(window.electronAPI);
// Should show object with agent, file, project, etc.
```

**Fix**: Check if preload script is loaded

---

### **Issue 3: Agent Service Not Responding**
**Symptom**: Request sent but no response

**Check Electron Console**:
```
npm run electron:dev
```

Look for:
- "Agent query error: [error]"
- "OpenRouter API error: [error]"
- Network errors

---

### **Issue 4: OpenRouter API Key Missing**
**Symptom**: 401 or 403 error

**Check `.env` file**:
```env
CLAUDE_API_KEY=sk-or-v1-...
CLAUDE_MODEL=x-ai/grok-2-1212
CLAUDE_API_BASE_URL=https://openrouter.ai/api/v1
```

---

## 📊 Debugging Steps

### **Step 1: Check DevTools Console**
```
F12 → Console Tab
Send a message
Look for logs
```

**Expected Logs**:
- ✅ "Sending message: hello"
- ✅ "Calling electronAPI.agent.sendMessage"
- ✅ "Send message response: {...}"
- ✅ "Setting up agent event listeners"
- ✅ "Received agent message: {...}"

**If Missing**:
- ❌ No "Sending message" → Button not working
- ❌ No "Calling electronAPI" → IPC not set up
- ❌ No "Send message response" → Backend not responding
- ❌ No "Received agent message" → Events not working

---

### **Step 2: Check Electron Console**
```
Terminal running electron:dev
Look for errors
```

**Expected Logs**:
- ✅ "Database manager initialized"
- ✅ No errors when sending message
- ✅ OpenRouter API call succeeds

**If Errors**:
- ❌ "Agent error" → Check error message
- ❌ "405 status code" → API endpoint wrong (should be fixed)
- ❌ "401/403" → API key issue
- ❌ "Failed to list files" → Project path issue

---

### **Step 3: Test IPC Manually**
Open DevTools Console and run:
```javascript
// Test if electronAPI exists
console.log(window.electronAPI);

// Test agent.sendMessage
window.electronAPI.agent.sendMessage('test')
  .then(res => console.log('Response:', res))
  .catch(err => console.error('Error:', err));

// Test event listener
window.electronAPI.on('agent:message', (msg) => {
  console.log('Got message:', msg);
});
```

---

## ✅ What Should Work Now

After the fixes:
1. ✅ Event listeners properly set up
2. ✅ Logging added for debugging
3. ✅ Error handling improved
4. ✅ Cleanup on unmount

---

## 🎯 Next Steps

1. **Run the app**:
   ```bash
   npm run dev
   npm run electron:dev
   ```

2. **Open DevTools** (F12)

3. **Send a test message**

4. **Check console logs** in both:
   - Browser DevTools (renderer)
   - Terminal (main process)

5. **Report what you see**:
   - Which logs appear?
   - Any errors?
   - Does "AI is thinking" appear?
   - Does response come back?

---

## 📝 Agent Architecture Status

**Current Status**: ❌ **NOT IMPLEMENTED AS PER GUIDE**

The current implementation uses:
- ✅ OpenRouterAgentService (basic)
- ❌ No specialized agents (Planning, Writing, Editing, Research)
- ❌ No subagent system
- ❌ No tool calling
- ❌ No planning tools integration
- ❌ No file management tools integration

**As per AGENT_SYSTEM_ARCHITECTURE.md**, we should have:
1. Planning Agent
2. Writing Agent
3. Editing Agent
4. Research Agent
5. Subagent delegation
6. Tool system
7. Planning tools
8. File management tools

**This needs to be implemented separately** once basic messaging works.

---

## 🚀 Test It Now

Run the app and check the logs. Report back what you see in:
1. DevTools Console (F12)
2. Electron Terminal

This will help identify exactly where the connection is breaking! 🔍
