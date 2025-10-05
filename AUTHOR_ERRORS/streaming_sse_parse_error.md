# Streaming SSE Parse Error - Fixed

**Date**: 2025-10-05  
**Status**: ✅ Fixed

## Error Description

When streaming responses from OpenRouter API, the application was logging multiple parse errors:

```
Failed to parse SSE data: {"id":"gen-1759639509-fA2IVfkRTmbJ8O3yb3JX","provider":"xAI","model":"x-ai/grok-4-fast","object":"chat.completion.chunk","created":1759639509,"choices":[{"index":0,"delta":{"role":"assistant","content":"","reasoning":null,"reasoning_details":[]},"finish_reason":null,"native_finish_re
```

The JSON was being truncated mid-stream, causing `JSON.parse()` to fail.

## Root Cause

The SSE (Server-Sent Events) stream processing was incorrectly handling chunk boundaries:

1. **Original Implementation**: Split chunks by newline immediately after decoding
2. **Problem**: JSON data could be split across multiple TCP chunks
3. **Result**: Incomplete JSON strings were being parsed, causing errors

### Example of the Issue

```
Chunk 1: "data: {"id":"123","choices":[{"delta":{"con"
Chunk 2: "tent":"Hello"}}]}\n"
```

The original code would try to parse Chunk 1 as complete JSON, which would fail.

## Solution

Implemented proper line buffering according to OpenRouter's SSE documentation:

### Fixed Implementation

```typescript
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  // Append new chunk to buffer
  buffer += decoder.decode(value, { stream: true });

  // Process complete lines from buffer
  while (true) {
    const lineEnd = buffer.indexOf('\n');
    if (lineEnd === -1) break;  // No complete line yet

    const line = buffer.slice(0, lineEnd).trim();
    buffer = buffer.slice(lineEnd + 1);

    // Skip empty lines and comments
    if (!line || line.startsWith(':')) {
      continue;
    }

    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || '';
        
        if (content) {
          fullResponse += content;
          this.emit('stream-chunk', {
            type: 'assistant',
            content: content,
            fullContent: fullResponse,
            timestamp: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn('Failed to parse SSE data:', data.substring(0, 100));
      }
    }
  }
}
```

### Key Changes

1. **Line Buffering**: Accumulate chunks in a buffer until a complete line (ending with `\n`) is found
2. **Proper Line Extraction**: Only process complete lines, keep incomplete data in buffer
3. **Comment Handling**: Skip SSE comments (lines starting with `:`) per SSE spec
4. **Error Logging**: Truncate error messages to avoid console spam

## Reference

According to OpenRouter's streaming documentation:
- SSE streams send data in `data: {json}\n` format
- Comments like `: OPENROUTER PROCESSING` can appear and should be ignored
- JSON payloads can span multiple TCP chunks
- Proper buffering is essential for reliable parsing

## Testing

After fix:
- ✅ No more parse errors in console
- ✅ Complete JSON objects are parsed correctly
- ✅ Streaming works reliably across all chunk boundaries

## Next Steps

While this fixes the immediate parsing issue, we should transition to using the **Claude Agents SDK** which provides:
- Built-in streaming support
- Proper tool integration
- Session management
- Subagent delegation
- Better error handling

See: `REFERENCES/claude_agent_sdk/streaming.md` for implementation guide.
