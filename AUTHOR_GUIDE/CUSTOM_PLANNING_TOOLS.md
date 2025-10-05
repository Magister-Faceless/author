# Author - Custom Planning Tools Implementation

## Overview

While the Claude Agents SDK provides basic planning tools (`TodoWrite`, `ExitPlanMode`), we need to implement additional custom MCP tools to match the sophisticated capabilities of the deepagents framework. This document outlines the implementation of custom planning and documentation tools for the Author application.

## Architecture: Hybrid Approach

### Built-in Claude SDK Tools (Use These)
- **TodoWrite**: Basic task management
- **ExitPlanMode**: Planning mode transitions
- **Task**: Subagent delegation

### Custom MCP Tools (We Need to Implement)
- **Enhanced file management with virtual files**
- **Context notes and session summaries**
- **Progress tracking and documentation**
- **Agent-specific file operations**

## Custom MCP Tools Implementation

### 1. Virtual File System Tools

#### ProgressFileWrite Tool
```typescript
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

export const progressFileWriteTool = tool(
  'ProgressFileWrite',
  'Create or update progress files for tracking agent work and achievements',
  {
    session_id: z.string().describe('Current session identifier'),
    progress_type: z.enum(['session_start', 'task_completion', 'milestone', 'session_end'])
      .describe('Type of progress being recorded'),
    content: z.string().describe('Progress content in markdown format'),
    achievements: z.array(z.string()).optional()
      .describe('List of achievements or completed tasks'),
    next_steps: z.array(z.string()).optional()
      .describe('Planned next steps or upcoming tasks'),
    files_modified: z.array(z.string()).optional()
      .describe('List of files that were created or modified'),
    metadata: z.record(z.any()).optional()
      .describe('Additional metadata for the progress entry')
  },
  async (args, extra) => {
    const { session_id, progress_type, content, achievements, next_steps, files_modified, metadata } = args;
    
    // Create virtual progress file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `progress_${session_id}_${timestamp}.md`;
    
    const progressContent = `# Progress Report - ${progress_type}

**Session ID**: ${session_id}
**Timestamp**: ${new Date().toISOString()}
**Type**: ${progress_type}

## Progress Summary

${content}

${achievements && achievements.length > 0 ? `
## Achievements
${achievements.map(achievement => `- ✅ ${achievement}`).join('\n')}
` : ''}

${next_steps && next_steps.length > 0 ? `
## Next Steps
${next_steps.map(step => `- 🔄 ${step}`).join('\n')}
` : ''}

${files_modified && files_modified.length > 0 ? `
## Files Modified
${files_modified.map(file => `- 📝 ${file}`).join('\n')}
` : ''}

${metadata ? `
## Metadata
\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`
` : ''}
`;

    // Store in virtual file system (implementation depends on your storage mechanism)
    await storeVirtualFile(filename, progressContent, {
      type: 'progress',
      session_id,
      progress_type,
      created_at: new Date().toISOString()
    });

    return {
      content: [{
        type: 'text',
        text: `Created progress file: ${filename}\n\nContent preview:\n${progressContent.substring(0, 500)}...`
      }]
    };
  }
);
```

#### ContextNoteWrite Tool
```typescript
export const contextNoteWriteTool = tool(
  'ContextNoteWrite',
  'Create persistent context notes for important information, findings, and decisions',
  {
    topic: z.string().describe('Topic or subject of the context note'),
    content: z.string().describe('Detailed content of the context note'),
    tags: z.array(z.string()).describe('Tags for categorizing and finding the note'),
    importance: z.enum(['low', 'medium', 'high', 'critical'])
      .describe('Importance level of this information'),
    agent_type: z.string().optional().describe('Type of agent creating this note'),
    related_files: z.array(z.string()).optional()
      .describe('Files related to this context note'),
    related_tasks: z.array(z.string()).optional()
      .describe('Task IDs related to this context note'),
    project_area: z.string().optional()
      .describe('Project area this note relates to (e.g., characters, plot, world-building)')
  },
  async (args, extra) => {
    const { topic, content, tags, importance, agent_type, related_files, related_tasks, project_area } = args;
    
    const noteId = generateUniqueId();
    const timestamp = new Date().toISOString();
    const filename = `context_${topic.toLowerCase().replace(/\s+/g, '_')}_${noteId}.md`;
    
    const noteContent = `# Context Note: ${topic}

**Note ID**: ${noteId}
**Created**: ${timestamp}
**Agent**: ${agent_type || 'Unknown'}
**Importance**: ${importance}
**Project Area**: ${project_area || 'General'}

## Tags
${tags.map(tag => `\`${tag}\``).join(', ')}

## Content

${content}

${related_files && related_files.length > 0 ? `
## Related Files
${related_files.map(file => `- ${file}`).join('\n')}
` : ''}

${related_tasks && related_tasks.length > 0 ? `
## Related Tasks
${related_tasks.map(task => `- ${task}`).join('\n')}
` : ''}

---
*This note was created automatically by the Author AI system for context preservation.*
`;

    await storeVirtualFile(filename, noteContent, {
      type: 'context_note',
      note_id: noteId,
      topic,
      tags,
      importance,
      agent_type,
      created_at: timestamp
    });

    return {
      content: [{
        type: 'text',
        text: `Created context note: ${filename}\n\nNote ID: ${noteId}\nTopic: ${topic}\nImportance: ${importance}`
      }]
    };
  }
);
```

#### SessionSummaryGenerate Tool
```typescript
export const sessionSummaryGenerateTool = tool(
  'SessionSummaryGenerate',
  'Generate comprehensive session summaries for continuity between work sessions',
  {
    session_id: z.string().describe('Session identifier to summarize'),
    session_duration: z.number().optional().describe('Session duration in minutes'),
    key_activities: z.array(z.string()).describe('Key activities performed during session'),
    objectives_completed: z.array(z.string()).describe('Objectives that were completed'),
    objectives_in_progress: z.array(z.string()).describe('Objectives still in progress'),
    files_created: z.array(z.string()).optional().describe('Files created during session'),
    files_modified: z.array(z.string()).optional().describe('Files modified during session'),
    important_decisions: z.array(z.string()).optional().describe('Important decisions made'),
    context_notes_created: z.array(z.string()).optional().describe('Context notes created'),
    next_session_priorities: z.array(z.string()).optional().describe('Priorities for next session')
  },
  async (args, extra) => {
    const {
      session_id,
      session_duration,
      key_activities,
      objectives_completed,
      objectives_in_progress,
      files_created,
      files_modified,
      important_decisions,
      context_notes_created,
      next_session_priorities
    } = args;

    const timestamp = new Date().toISOString();
    const date = new Date().toISOString().split('T')[0];
    const filename = `session_summary_${date}_${session_id}.md`;

    const summaryContent = `# Session Summary - ${date}

**Session ID**: ${session_id}
**Date**: ${timestamp}
**Duration**: ${session_duration ? `${session_duration} minutes` : 'Not specified'}

## Executive Summary

This session focused on ${key_activities.length} main activities with ${objectives_completed.length} objectives completed and ${objectives_in_progress.length} objectives remaining in progress.

## Key Activities

${key_activities.map((activity, index) => `${index + 1}. ${activity}`).join('\n')}

## Objectives Status

### ✅ Completed Objectives
${objectives_completed.length > 0 ? 
  objectives_completed.map(obj => `- ${obj}`).join('\n') : 
  '- No objectives completed this session'
}

### 🔄 In Progress Objectives  
${objectives_in_progress.length > 0 ? 
  objectives_in_progress.map(obj => `- ${obj}`).join('\n') : 
  '- No objectives currently in progress'
}

## File Operations

${files_created && files_created.length > 0 ? `
### 📁 Files Created
${files_created.map(file => `- ${file}`).join('\n')}
` : ''}

${files_modified && files_modified.length > 0 ? `
### ✏️ Files Modified
${files_modified.map(file => `- ${file}`).join('\n')}
` : ''}

${important_decisions && important_decisions.length > 0 ? `
## Important Decisions Made

${important_decisions.map(decision => `- ${decision}`).join('\n')}
` : ''}

${context_notes_created && context_notes_created.length > 0 ? `
## Context Notes Created

${context_notes_created.map(note => `- ${note}`).join('\n')}
` : ''}

## Next Session Priorities

${next_session_priorities && next_session_priorities.length > 0 ? 
  next_session_priorities.map((priority, index) => `${index + 1}. ${priority}`).join('\n') : 
  '1. Review this session summary\n2. Continue with in-progress objectives'
}

---
*Generated automatically by Author AI system for session continuity.*
`;

    await storeVirtualFile(filename, summaryContent, {
      type: 'session_summary',
      session_id,
      date,
      created_at: timestamp,
      objectives_completed: objectives_completed.length,
      objectives_in_progress: objectives_in_progress.length
    });

    return {
      content: [{
        type: 'text',
        text: `Generated session summary: ${filename}\n\nSummary includes:\n- ${key_activities.length} key activities\n- ${objectives_completed.length} completed objectives\n- ${objectives_in_progress.length} in-progress objectives\n- Session continuity information for next session`
      }]
    };
  }
);
```

### 2. Enhanced Todo Management Tools

#### EnhancedTodoWrite Tool (extends built-in TodoWrite)
```typescript
export const enhancedTodoWriteTool = tool(
  'EnhancedTodoWrite',
  'Advanced todo management with dependencies, time tracking, and progress documentation',
  {
    todos: z.array(z.object({
      id: z.string().describe('Unique identifier for the todo item'),
      content: z.string().describe('Task description'),
      status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled'])
        .describe('Current status of the task'),
      priority: z.enum(['low', 'medium', 'high', 'critical'])
        .describe('Task priority level'),
      estimated_duration: z.number().optional()
        .describe('Estimated duration in minutes'),
      actual_duration: z.number().optional()
        .describe('Actual time spent in minutes'),
      dependencies: z.array(z.string()).optional()
        .describe('IDs of tasks this depends on'),
      agent_type: z.string().optional()
        .describe('Type of agent responsible for this task'),
      notes: z.string().optional()
        .describe('Additional notes about the task'),
      created_at: z.string().optional()
        .describe('When the task was created'),
      completed_at: z.string().optional()
        .describe('When the task was completed')
    })).describe('Array of enhanced todo items'),
    session_id: z.string().describe('Current session identifier'),
    project_context: z.string().optional()
      .describe('Current project context or focus area')
  },
  async (args, extra) => {
    const { todos, session_id, project_context } = args;
    
    // Store enhanced todos in virtual file system
    const timestamp = new Date().toISOString();
    const filename = `todos_${session_id}_${timestamp.split('T')[0]}.md`;
    
    const todoContent = `# Enhanced Todo List

**Session ID**: ${session_id}
**Updated**: ${timestamp}
**Project Context**: ${project_context || 'General'}

## Task Summary

- **Total Tasks**: ${todos.length}
- **Pending**: ${todos.filter(t => t.status === 'pending').length}
- **In Progress**: ${todos.filter(t => t.status === 'in_progress').length}
- **Completed**: ${todos.filter(t => t.status === 'completed').length}
- **Blocked**: ${todos.filter(t => t.status === 'blocked').length}

## Tasks by Status

### 🔄 In Progress
${todos.filter(t => t.status === 'in_progress').map(todo => 
  `- **${todo.content}** (${todo.priority} priority)${todo.agent_type ? ` - Agent: ${todo.agent_type}` : ''}${todo.notes ? `\n  Notes: ${todo.notes}` : ''}`
).join('\n') || '- No tasks in progress'}

### ⏳ Pending
${todos.filter(t => t.status === 'pending').map(todo => 
  `- **${todo.content}** (${todo.priority} priority)${todo.estimated_duration ? ` - Est: ${todo.estimated_duration}min` : ''}${todo.dependencies && todo.dependencies.length > 0 ? `\n  Dependencies: ${todo.dependencies.join(', ')}` : ''}`
).join('\n') || '- No pending tasks'}

### ✅ Completed
${todos.filter(t => t.status === 'completed').map(todo => 
  `- **${todo.content}**${todo.actual_duration ? ` - Took: ${todo.actual_duration}min` : ''}${todo.completed_at ? ` - Completed: ${new Date(todo.completed_at).toLocaleString()}` : ''}`
).join('\n') || '- No completed tasks'}

### 🚫 Blocked
${todos.filter(t => t.status === 'blocked').map(todo => 
  `- **${todo.content}** - ${todo.notes || 'No blocking reason specified'}`
).join('\n') || '- No blocked tasks'}

## Task Details

${todos.map(todo => `
### ${todo.content} (ID: ${todo.id})
- **Status**: ${todo.status}
- **Priority**: ${todo.priority}
- **Agent**: ${todo.agent_type || 'Unassigned'}
${todo.estimated_duration ? `- **Estimated Duration**: ${todo.estimated_duration} minutes\n` : ''}${todo.actual_duration ? `- **Actual Duration**: ${todo.actual_duration} minutes\n` : ''}${todo.dependencies && todo.dependencies.length > 0 ? `- **Dependencies**: ${todo.dependencies.join(', ')}\n` : ''}${todo.notes ? `- **Notes**: ${todo.notes}\n` : ''}${todo.created_at ? `- **Created**: ${new Date(todo.created_at).toLocaleString()}\n` : ''}${todo.completed_at ? `- **Completed**: ${new Date(todo.completed_at).toLocaleString()}\n` : ''}
`).join('\n')}
`;

    await storeVirtualFile(filename, todoContent, {
      type: 'enhanced_todos',
      session_id,
      total_tasks: todos.length,
      completed_tasks: todos.filter(t => t.status === 'completed').length,
      created_at: timestamp
    });

    // Also call the built-in TodoWrite for compatibility
    const simpleTodos = todos.map(todo => ({
      content: todo.content,
      status: todo.status === 'blocked' || todo.status === 'cancelled' ? 'pending' : todo.status,
      activeForm: todo.status === 'in_progress' ? `Working on: ${todo.content}` : todo.content
    }));

    return {
      content: [{
        type: 'text',
        text: `Enhanced todo list updated: ${filename}\n\nSummary:\n- Total: ${todos.length} tasks\n- In Progress: ${todos.filter(t => t.status === 'in_progress').length}\n- Pending: ${todos.filter(t => t.status === 'pending').length}\n- Completed: ${todos.filter(t => t.status === 'completed').length}\n- Blocked: ${todos.filter(t => t.status === 'blocked').length}`
      }]
    };
  }
);
```

### 3. Virtual File System Implementation

#### Virtual File Storage Interface
```typescript
interface VirtualFile {
  filename: string;
  content: string;
  metadata: {
    type: 'progress' | 'context_note' | 'session_summary' | 'enhanced_todos' | 'project_log';
    created_at: string;
    updated_at?: string;
    session_id?: string;
    agent_type?: string;
    tags?: string[];
    [key: string]: any;
  };
}

class VirtualFileSystem {
  private files: Map<string, VirtualFile> = new Map();
  private fileIndex: Map<string, Set<string>> = new Map(); // type -> filenames

  async storeFile(filename: string, content: string, metadata: VirtualFile['metadata']): Promise<void> {
    const file: VirtualFile = {
      filename,
      content,
      metadata: {
        ...metadata,
        updated_at: new Date().toISOString()
      }
    };

    this.files.set(filename, file);
    
    // Update index
    if (!this.fileIndex.has(metadata.type)) {
      this.fileIndex.set(metadata.type, new Set());
    }
    this.fileIndex.get(metadata.type)!.add(filename);
  }

  async getFile(filename: string): Promise<VirtualFile | null> {
    return this.files.get(filename) || null;
  }

  async getFilesByType(type: string): Promise<VirtualFile[]> {
    const filenames = this.fileIndex.get(type) || new Set();
    return Array.from(filenames)
      .map(filename => this.files.get(filename))
      .filter((file): file is VirtualFile => file !== undefined);
  }

  async searchFiles(query: string, type?: string): Promise<VirtualFile[]> {
    const files = type ? await this.getFilesByType(type) : Array.from(this.files.values());
    return files.filter(file => 
      file.content.toLowerCase().includes(query.toLowerCase()) ||
      file.filename.toLowerCase().includes(query.toLowerCase()) ||
      (file.metadata.tags && file.metadata.tags.some(tag => 
        tag.toLowerCase().includes(query.toLowerCase())
      ))
    );
  }

  async listFiles(type?: string): Promise<string[]> {
    if (type) {
      return Array.from(this.fileIndex.get(type) || new Set());
    }
    return Array.from(this.files.keys());
  }
}

// Global instance
const virtualFileSystem = new VirtualFileSystem();

// Helper function for tools
async function storeVirtualFile(filename: string, content: string, metadata: any): Promise<void> {
  await virtualFileSystem.storeFile(filename, content, metadata);
}
```

### 4. File Query and Management Tools

#### VirtualFileRead Tool
```typescript
export const virtualFileReadTool = tool(
  'VirtualFileRead',
  'Read virtual files created by agents for planning and documentation',
  {
    filename: z.string().optional().describe('Specific filename to read'),
    file_type: z.enum(['progress', 'context_note', 'session_summary', 'enhanced_todos', 'project_log']).optional()
      .describe('Type of files to list/search'),
    search_query: z.string().optional().describe('Search query to find relevant files'),
    limit: z.number().optional().describe('Maximum number of files to return')
  },
  async (args, extra) => {
    const { filename, file_type, search_query, limit = 10 } = args;

    if (filename) {
      // Read specific file
      const file = await virtualFileSystem.getFile(filename);
      if (!file) {
        return {
          content: [{
            type: 'text',
            text: `File not found: ${filename}`
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: `# ${filename}\n\n${file.content}\n\n---\n**Metadata**: ${JSON.stringify(file.metadata, null, 2)}`
        }]
      };
    }

    // Search or list files
    let files: VirtualFile[];
    
    if (search_query) {
      files = await virtualFileSystem.searchFiles(search_query, file_type);
    } else if (file_type) {
      files = await virtualFileSystem.getFilesByType(file_type);
    } else {
      const filenames = await virtualFileSystem.listFiles();
      files = await Promise.all(
        filenames.slice(0, limit).map(async name => await virtualFileSystem.getFile(name))
      ).then(results => results.filter((f): f is VirtualFile => f !== null));
    }

    files = files.slice(0, limit);

    const fileList = files.map(file => 
      `**${file.filename}** (${file.metadata.type})\n` +
      `Created: ${new Date(file.metadata.created_at).toLocaleString()}\n` +
      `Preview: ${file.content.substring(0, 200)}...\n`
    ).join('\n---\n');

    return {
      content: [{
        type: 'text',
        text: `Found ${files.length} virtual files:\n\n${fileList}`
      }]
    };
  }
);
```

## Integration with Author Application

### 1. MCP Server Setup
```typescript
import { createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';

export const authorPlanningServer = createSdkMcpServer({
  name: 'author-planning-tools',
  version: '1.0.0',
  tools: [
    progressFileWriteTool,
    contextNoteWriteTool,
    sessionSummaryGenerateTool,
    enhancedTodoWriteTool,
    virtualFileReadTool
  ]
});
```

### 2. Integration in Agent Options
```typescript
const queryOptions = {
  mcpServers: {
    'author-planning': {
      type: 'sdk' as const,
      name: 'author-planning-tools',
      instance: authorPlanningServer.instance
    }
  },
  // Use built-in planning tools alongside custom ones
  allowedTools: [
    'TodoWrite',        // Built-in basic todos
    'ExitPlanMode',     // Built-in planning mode
    'Task',             // Built-in subagent delegation
    'ProgressFileWrite', // Custom progress tracking
    'ContextNoteWrite',  // Custom context notes
    'SessionSummaryGenerate', // Custom session summaries
    'EnhancedTodoWrite', // Custom enhanced todos
    'VirtualFileRead',   // Custom file reading
    // ... other tools
  ]
};
```

## Usage in Agent System Prompts

### Enhanced Planning Agent Prompt
```typescript
const ENHANCED_PLANNING_AGENT_PROMPT = `
You are an advanced planning agent with sophisticated planning and documentation tools.

## Available Planning Tools

### Built-in Claude SDK Tools
- **TodoWrite**: Basic task management (use for simple todo lists)
- **ExitPlanMode**: Exit planning mode and get user approval

### Custom Author Planning Tools  
- **EnhancedTodoWrite**: Advanced todos with dependencies, time tracking, priorities
- **ProgressFileWrite**: Create progress files for session tracking
- **ContextNoteWrite**: Create persistent context notes for important information
- **SessionSummaryGenerate**: Generate comprehensive session summaries
- **VirtualFileRead**: Read previously created planning documents

## Planning Protocol

### For Complex Tasks (MANDATORY):
1. **Start with EnhancedTodoWrite**: Create detailed todo list with priorities and dependencies
2. **Create Context Notes**: Use ContextNoteWrite for important decisions and findings
3. **Track Progress**: Use ProgressFileWrite for significant milestones
4. **Document Sessions**: Use SessionSummaryGenerate at session end

### Example Usage:
\`\`\`
User: "Help me plan a fantasy novel with complex magic system"

1. First, create enhanced todo list:
   - Research magic system types and rules
   - Develop magic system constraints and costs
   - Create character magic abilities
   - Plan magic system integration with plot

2. Create context note for magic system decisions
3. Track progress as each planning element is completed
4. Generate session summary with next steps
\`\`\`

Always use these tools for complex planning tasks to ensure continuity and thoroughness.
`;
```

This hybrid approach gives us the best of both worlds:
- **Built-in Claude SDK tools** for basic functionality and compatibility
- **Custom MCP tools** for advanced planning and documentation capabilities
- **Virtual file system** for persistent context across sessions
- **Enhanced todo management** with dependencies and time tracking

The virtual files allow agents to maintain context and continuity across long writing projects, just like the deepagents framework, while leveraging the Claude Agents SDK's native capabilities where available.
