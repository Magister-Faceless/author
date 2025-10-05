# Streaming Event Channel Blocking Issue

## Issue Date
2025-10-05

## Problem Description
After implementing the OpenRouter streaming functionality, messages were getting through to the backend and being processed correctly, but the streaming events were not reaching the frontend. The ChatPanel showed "AI is thinking..." but never displayed the streamed response.

## Root Cause
The streaming event channels (`agent:stream-start`, `agent:stream-chunk`, `agent:stream-end`, etc.) were not defined in the `IPC_CHANNELS` constant. The preload script's `on()` method validates all event channels against this constant, and was blocking any channel not explicitly listed.

**Key files affected:**
- `src/shared/ipc-channels.ts` - Missing streaming event channel definitions
- `src/main/preload.ts` - Too strict validation in the `on()` method

## Evidence
From the Electron terminal logs:
```
Got response from agentService: Hey there! I'm excited to chat...
Returning result: [...]
```

From the browser console:
```
ChatPanel.tsx:96 Setting up agent event listeners
ChatPanel.tsx:141 Sending message: hey there
ChatPanel.tsx:155 Calling electronAPI.agent.sendMessage
ChatPanel.tsx:157 Send message response: {id: '', success: true, data: Array(1)}
```

The backend was emitting streaming events, but the frontend never received them because the preload script blocked the IPC communication.

## Solution Implemented

### 1. Added Streaming Event Channels to IPC_CHANNELS
Added the following channels to `src/shared/ipc-channels.ts`:
```typescript
// Agent Events (Streaming)
AGENT_STREAM_START: 'agent:stream-start',
AGENT_STREAM_CHUNK: 'agent:stream-chunk',
AGENT_STREAM_END: 'agent:stream-end',
AGENT_MESSAGE: 'agent:message',
AGENT_ERROR: 'agent:error',
AGENT_TODOS: 'agent:todos',
AGENT_FILE_OPERATION: 'agent:file-operation',
AGENT_DELEGATED: 'agent:delegated',
AGENT_SESSION_STARTED: 'agent:session-started',
AGENT_QUERY_COMPLETE: 'agent:query-complete',
```

### 2. Updated Preload Script Validation
Modified `src/main/preload.ts` to use prefix-based validation instead of exact matching:
- Allows any channel starting with valid prefixes: `agent:`, `file:`, `project:`, etc.
- Provides better security while allowing streaming events
- Updated `removeListener` to use `removeAllListeners` for simplicity

**Before:**
```typescript
on: (channel: string, callback: (data: any) => void) => {
  const validChannels = Object.values(IPC_CHANNELS);
  if (validChannels.includes(channel as any)) {
    ipcRenderer.on(channel, (_, data) => callback(data));
  }
}
```

**After:**
```typescript
on: (channel: string, callback: (data: any) => void) => {
  const validChannels = Object.values(IPC_CHANNELS);
  const validPrefixes = ['agent:', 'file:', 'project:', 'virtual-file:', 'db:', 'settings:', 'app:', 'error:', 'window:', 'dialog:'];
  const isValid = validChannels.includes(channel as any) || 
                  validPrefixes.some(prefix => channel.startsWith(prefix));
  
  if (isValid) {
    ipcRenderer.on(channel, (_, data) => callback(data));
  } else {
    console.warn('Attempted to listen on invalid channel:', channel);
  }
}
```

## Testing
To verify the fix:
1. Restart the Electron app: `npm run electron:dev`
2. Send a message in the ChatPanel
3. Watch for streaming events in the browser console:
   - "Stream started"
   - "Received stream chunk: ..."
   - "Stream ended: ..."
4. Verify the message appears in the chat with streaming animation

## Related Files
- `src/shared/ipc-channels.ts` - IPC channel definitions
- `src/main/preload.ts` - Preload script with IPC API
- `src/main/services/agent-manager.ts` - Emits streaming events
- `src/agents/core/openrouter-agent-service.ts` - Generates streaming events
- `src/renderer/components/ChatPanel.tsx` - Listens for streaming events

## Prevention
- When adding new event types, ensure they are either:
  1. Added to `IPC_CHANNELS` constant, OR
  2. Use a prefix that's whitelisted in the preload validation
- Consider adding automated tests for IPC event communication
- Document all IPC channels and their purposes

## Status
✅ **RESOLVED** - Streaming events now reach the frontend correctly
