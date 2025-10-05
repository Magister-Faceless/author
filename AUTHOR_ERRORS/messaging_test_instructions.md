# Messaging Test Instructions

**Date**: 2025-10-05  
**Status**: 🔍 **READY TO TEST WITH FULL LOGGING**

---

## ✅ Logging Added

I've added comprehensive logging to track the entire message flow:

### **Frontend (Browser DevTools - F12)**:
```
✅ "ChatPanel mounted"
✅ "electronAPI available: true/false"
✅ "electronAPI.agent available: true/false"
✅ "electronAPI.on available: true/false"
✅ "Setting up agent event listeners"
✅ "Sending message: [your message]"
✅ "Calling electronAPI.agent.sendMessage"
✅ "Send message response: [response]"
✅ "Received agent message: [AI response]"
```

### **Backend (Electron Terminal)**:
```
✅ "AgentManager.sendMessage called with: [message]"
✅ "AgentManager.executeQuery called with prompt: [message]"
✅ "Creating new session for project: [id]"
✅ "Created session: [sessionId]"
✅ "Saving user message to database"
✅ "Calling agentService.sendMessage"
✅ "Got response from agentService: [response]"
✅ "Returning result: [result]"
✅ "AgentManager.sendMessage result: [result]"
```

---

## 🚀 Test Steps

### **1. Start the App**:
```bash
# Terminal 1
npm run dev

# Terminal 2 (after webpack compiles)
npm run electron:dev
```

### **2. Open DevTools**:
- Press **F12** in the app window
- Go to **Console** tab
- Keep it open

### **3. Open a Project**:
- Click "Open Folder" or select recent project
- Navigate to workspace

### **4. Send a Test Message**:
- Type: "Hello, can you help me?"
- Click Send or press Enter

### **5. Watch BOTH Consoles**:

**Browser Console (F12)** should show:
```
ChatPanel mounted
electronAPI available: true
electronAPI.agent available: true
electronAPI.on available: true
Setting up agent event listeners
Sending message: Hello, can you help me?
Calling electronAPI.agent.sendMessage
Send message response: {...}
```

**Electron Terminal** should show:
```
AgentManager.sendMessage called with: Hello, can you help me?
AgentManager.executeQuery called with prompt: Hello, can you help me?
Calling agentService.sendMessage
Got response from agentService: [AI response text]
Returning result: [...]
AgentManager.sendMessage result: [...]
```

---

## 🔍 What to Look For

### **Scenario 1: Nothing in Browser Console**
**Problem**: Frontend not loading
**Check**:
- Is the app window showing?
- Press F12 - does DevTools open?
- Refresh the page (Ctrl+R)

### **Scenario 2: "electronAPI available: false"**
**Problem**: Preload script not loaded
**Check**:
- Check webpack compilation - any errors?
- Check main.ts - is preload path correct?

### **Scenario 3: "Sending message" but no "Send message response"**
**Problem**: IPC call failing
**Check**:
- Any errors in browser console?
- Check Electron terminal for errors

### **Scenario 4: Nothing in Electron Terminal**
**Problem**: Backend not receiving message
**Check**:
- Is IPC handler registered?
- Check for IPC errors in terminal

### **Scenario 5: "AgentManager.sendMessage called" but stops there**
**Problem**: Error in executeQuery
**Check**:
- Look for error messages in terminal
- Check if currentProjectId is set

### **Scenario 6: "Calling agentService.sendMessage" but no response**
**Problem**: OpenRouter API call failing
**Check**:
- Check .env file has CLAUDE_API_KEY
- Check network errors in terminal
- Check OpenRouter API status

### **Scenario 7: Response received but not showing in UI**
**Problem**: Event listener not working
**Check**:
- Did you see "Setting up agent event listeners"?
- Did you see "Received agent message"?
- Check if activeThreadId is set

---

## 📊 Expected Full Flow

**Complete successful flow**:

```
BROWSER:
1. ChatPanel mounted ✅
2. electronAPI available: true ✅
3. Setting up agent event listeners ✅
4. Sending message: Hello ✅
5. Calling electronAPI.agent.sendMessage ✅

ELECTRON:
6. AgentManager.sendMessage called with: Hello ✅
7. AgentManager.executeQuery called with prompt: Hello ✅
8. Calling agentService.sendMessage ✅
9. [OpenRouter API call happens] ✅
10. Got response from agentService: Sure, I can help! ✅
11. Returning result: [...] ✅

BROWSER:
12. Send message response: {...} ✅
13. Received agent message: Sure, I can help! ✅
14. [Message appears in chat] ✅
```

---

## 🎯 What to Report

After testing, tell me:

1. **Which logs appeared in Browser Console?**
   - List them in order

2. **Which logs appeared in Electron Terminal?**
   - List them in order

3. **Where did it stop?**
   - What was the last log you saw?

4. **Any errors?**
   - Copy the full error message

5. **Did the UI update?**
   - Did "AI is thinking" appear?
   - Did a response appear?

---

## 💡 Quick Checks

Before testing:

✅ **Check .env file**:
```env
CLAUDE_API_KEY=sk-or-v1-...
CLAUDE_MODEL=x-ai/grok-2-1212
CLAUDE_API_BASE_URL=https://openrouter.ai/api/v1
```

✅ **Check project is open**:
- You should be in workspace view
- File explorer should show on left
- Chat panel should show on right

✅ **Check thread is created**:
- Should see "General Chat" or similar
- Should be able to type in input box

---

## 🚀 Ready to Test!

Run the app and follow the steps above. The extensive logging will show us exactly where the issue is! 🔍
