import { EventEmitter } from 'events';

export interface AgentServiceOptions {
  model?: string;
  apiKey?: string;
  apiBaseUrl?: string;
}

export interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * OpenRouter-compatible Agent Service
 * Works with any model via OpenRouter API using native fetch
 */
export class OpenRouterAgentService extends EventEmitter {
  private apiKey: string;
  private apiBaseUrl: string;
  private model: string;
  private conversationHistory: AgentMessage[] = [];

  constructor(options: AgentServiceOptions = {}) {
    super();
    
    this.model = options.model || process.env.CLAUDE_MODEL || 'x-ai/grok-2-1212';
    this.apiKey = options.apiKey || process.env.CLAUDE_API_KEY || '';
    this.apiBaseUrl = options.apiBaseUrl || process.env.CLAUDE_API_BASE_URL || 'https://openrouter.ai/api/v1';
  }

  /**
   * Send a message and get response using OpenRouter API with streaming
   */
  async sendMessage(userMessage: string, options?: {
    systemPrompt?: string;
    maxTokens?: number;
  }): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      this.emit('message', {
        type: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      });

      // Create system prompt
      const systemPrompt = options?.systemPrompt || this.getDefaultSystemPrompt();

      // Prepare messages for OpenRouter
      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      // Call OpenRouter API using fetch with streaming enabled
      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://author-app.local',
          'X-Title': 'Author - AI Book Writing Assistant'
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          max_tokens: options?.maxTokens || 4096,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      // Process streaming response
      let fullResponse = '';
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      // Emit stream start event
      this.emit('stream-start', {
        timestamp: new Date().toISOString()
      });

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Append new chunk to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines from buffer
        while (true) {
          const lineEnd = buffer.indexOf('\n');
          if (lineEnd === -1) break;

          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);

          // Skip empty lines and comments
          if (!line || line.startsWith(':')) {
            continue;
          }

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              
              if (content) {
                fullResponse += content;
                
                // Emit streaming chunk
                this.emit('stream-chunk', {
                  type: 'assistant',
                  content: content,
                  fullContent: fullResponse,
                  timestamp: new Date().toISOString()
                });
              }
            } catch (e) {
              // Skip invalid JSON (shouldn't happen with proper buffering)
              console.warn('Failed to parse SSE data:', data.substring(0, 100));
            }
          }
        }
      }

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse
      });

      // Emit complete message
      this.emit('message', {
        type: 'assistant',
        content: fullResponse,
        timestamp: new Date().toISOString()
      });

      // Emit stream end event
      this.emit('stream-end', {
        fullContent: fullResponse,
        timestamp: new Date().toISOString()
      });

      this.emit('query-complete', { messageCount: this.conversationHistory.length });

      return fullResponse;

    } catch (error) {
      console.error('Agent error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.emit('history-cleared');
  }

  /**
   * Get conversation history
   */
  getHistory(): AgentMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Get default system prompt
   */
  private getDefaultSystemPrompt(): string {
    return `You are an expert AI assistant specialized in book writing and authoring. You help authors with:

- **Planning**: Story structure, character development, plot outlines, world-building
- **Writing**: Content generation, style consistency, voice development, dialogue
- **Editing**: Manuscript improvement, consistency checking, feedback, revision
- **Research**: Fact-checking, world-building details, reference organization
- **Organization**: File management, project structure, version tracking

## Your Approach

1. **Be Helpful**: Provide specific, actionable advice
2. **Be Professional**: Maintain a supportive, encouraging tone
3. **Be Thorough**: Give detailed responses with examples
4. **Be Creative**: Offer innovative ideas and solutions
5. **Be Organized**: Structure your responses clearly

## Working with Book Projects

Projects are organized with this structure:
- \`chapters/\` - Chapter files (markdown)
- \`characters/\` - Character profiles
- \`outlines/\` - Story outlines and plot structures
- \`research/\` - Research notes and references
- \`notes/\` - General notes and ideas

When helping with writing tasks:
- Ask clarifying questions when needed
- Provide specific examples
- Offer multiple options when appropriate
- Respect the author's creative vision
- Give constructive feedback

Remember: You're a collaborative partner in the creative process. Help authors bring their stories to life!`;
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return true;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }
}
