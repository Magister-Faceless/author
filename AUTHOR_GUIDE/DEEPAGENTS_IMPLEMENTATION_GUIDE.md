# Author - Deepagents Framework Implementation Guide

## Overview

This document provides a comprehensive implementation guide for integrating the deepagents framework capabilities into the Author application. Based on analysis of the deepagents middleware, tools, and prompting strategies, this guide ensures we leverage the full power of the Claude Agents SDK with sophisticated planning, file management, subagent orchestration, and context optimization.

## Critical Implementation Requirements

### 1. Planning Tools Integration (MANDATORY)

#### Todo Management System
```typescript
// Core todo management interface
interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: Date;
  updated_at: Date;
  dependencies?: string[];
  estimated_duration?: number;
  actual_duration?: number;
  notes?: string;
}

// Planning state for middleware
interface PlanningState {
  todos: Todo[];
  current_objectives: Objective[];
  milestones: Milestone[];
  progress_tracking: ProgressEntry[];
}

// Implementation of write_todos tool
@tool("Create and manage structured task lists for complex writing projects")
async function write_todos(
  todos: Todo[],
  tool_call_id: string
): Promise<Command> {
  return Command({
    update: {
      todos: todos,
      messages: [
        ToolMessage(`Updated todo list with ${todos.length} tasks`, tool_call_id)
      ]
    }
  });
}
```

#### Progress Tracking System
```typescript
interface ProgressEntry {
  id: string;
  task_id: string;
  progress_percentage: number;
  status_update: string;
  timestamp: Date;
  session_id: string;
  achievements: string[];
  next_steps: string[];
}

@tool("Track detailed progress on writing tasks and objectives")
async function update_progress(
  task_id: string,
  progress: number,
  notes: string,
  achievements: string[] = []
): Promise<ProgressUpdateResult> {
  // Implementation for sophisticated progress tracking
}
```

### 2. Advanced File Management System (CRITICAL)

#### Agent-Specific File Operations
```typescript
// Enhanced file operations with agent context
interface AgentFileContext {
  agent_type: string;
  session_id: string;
  project_id: string;
  current_objectives: string[];
  context_preservation: boolean;
}

@tool("Advanced file operations with automatic progress and context tracking")
async function enhanced_write_file(
  file_path: string,
  content: string,
  context: AgentFileContext,
  track_progress: boolean = true
): Promise<FileOperationResult> {
  // Create file with metadata
  const result = await writeFileWithMetadata(file_path, content, {
    created_by: context.agent_type,
    session_id: context.session_id,
    project_id: context.project_id,
    timestamp: new Date(),
    objectives: context.current_objectives
  });

  // Auto-create progress tracking if enabled
  if (track_progress) {
    await createProgressFile(context.session_id, {
      action: 'file_created',
      file_path: file_path,
      content_summary: generateContentSummary(content),
      objectives_addressed: context.current_objectives
    });
  }

  return result;
}
```

#### Context Note System
```typescript
interface ContextNote {
  id: string;
  topic: string;
  content: string;
  tags: string[];
  agent_type: string;
  session_id: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  created_at: Date;
  related_files: string[];
  related_tasks: string[];
}

@tool("Create persistent context notes for important information")
async function create_context_note(
  topic: string,
  content: string,
  tags: string[],
  importance: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<ContextNoteResult> {
  const note: ContextNote = {
    id: generateId(),
    topic,
    content,
    tags,
    agent_type: getCurrentAgentType(),
    session_id: getCurrentSessionId(),
    importance,
    created_at: new Date(),
    related_files: extractFileReferences(content),
    related_tasks: extractTaskReferences(content)
  };

  // Save to context notes database
  await saveContextNote(note);
  
  // Create physical file for persistence
  const noteFile = `context_notes/${topic.toLowerCase().replace(/\s+/g, '_')}.md`;
  await writeFile(noteFile, formatContextNote(note));

  return { success: true, note_id: note.id, file_path: noteFile };
}
```

### 3. Middleware Architecture Implementation

#### Core Middleware Classes
```typescript
// Planning Middleware - Adds todo management capabilities
class PlanningMiddleware extends AgentMiddleware {
  state_schema = PlanningState;
  tools = [write_todos, update_progress, create_milestone, track_objectives];

  modify_model_request(request: ModelRequest, agent_state: PlanningState): ModelRequest {
    // Inject planning-specific system prompt
    const planningPrompt = this.generatePlanningPrompt(agent_state);
    request.system_prompt = request.system_prompt + "\n\n" + planningPrompt;
    
    // Add current todos and objectives to context
    request.context = {
      ...request.context,
      active_todos: agent_state.todos.filter(t => t.status !== 'completed'),
      current_objectives: agent_state.current_objectives,
      recent_progress: agent_state.progress_tracking.slice(-10)
    };

    return request;
  }

  private generatePlanningPrompt(state: PlanningState): string {
    return `
## Planning Tools Available

You have access to sophisticated planning tools for managing complex writing projects:

### Current Project State
- Active Todos: ${state.todos.filter(t => t.status !== 'completed').length}
- Completed Tasks: ${state.todos.filter(t => t.status === 'completed').length}
- Current Objectives: ${state.current_objectives.length}

### Planning Tool Usage Requirements
1. **Complex Tasks (3+ steps)**: ALWAYS create todo list before starting
2. **Progress Updates**: Mark tasks in_progress before beginning work
3. **Real-time Tracking**: Update task status immediately upon completion
4. **Context Preservation**: Create context notes for important findings
5. **Session Continuity**: Generate progress summaries for session handoffs

### Available Planning Tools
- write_todos: Create and manage structured task lists
- update_progress: Track detailed progress on tasks
- create_milestone: Set important project milestones
- track_objectives: Monitor long-term objective progress
    `;
  }
}

// Filesystem Middleware - Enhanced file operations
class FilesystemMiddleware extends AgentMiddleware {
  state_schema = FilesystemState;
  tools = [
    ls, read_file, write_file, edit_file, 
    enhanced_write_file, create_context_note, 
    generate_session_summary, create_progress_file
  ];

  modify_model_request(request: ModelRequest, agent_state: FilesystemState): ModelRequest {
    const filesystemPrompt = this.generateFilesystemPrompt(agent_state);
    request.system_prompt = request.system_prompt + "\n\n" + filesystemPrompt;
    
    // Add file context to request
    request.context = {
      ...request.context,
      recent_files: agent_state.recent_files,
      project_structure: agent_state.project_structure,
      session_files: agent_state.session_files
    };

    return request;
  }

  private generateFilesystemPrompt(state: FilesystemState): string {
    return `
## Advanced File Management System

You have access to sophisticated file management capabilities:

### File Management Protocol
1. **Progress Files**: Create progress_[timestamp].md for session tracking
2. **Context Notes**: Write context_[topic].md for important information  
3. **Session Summaries**: Generate summary_[date].md for completed work
4. **Project Logs**: Maintain project_log.md for overall progress

### Current Project Files
- Total Files: ${state.files?.size || 0}
- Recent Files: ${state.recent_files?.length || 0}
- Session Files: ${state.session_files?.length || 0}

### File Management Best Practices
- Always track progress for complex file operations
- Create context notes for important discoveries
- Maintain session continuity through progress files
- Generate summaries for handoff between sessions
- Use consistent naming conventions for agent-created files
    `;
  }
}

// Summarization Middleware - Context optimization
class SummarizationMiddleware extends AgentMiddleware {
  constructor(
    private model: ChatModel,
    private max_tokens_before_summary: number = 120000,
    private messages_to_keep: number = 20
  ) {
    super();
  }

  async process_messages(messages: Message[]): Promise<Message[]> {
    const tokenCount = this.countTokens(messages);
    
    if (tokenCount > this.max_tokens_before_summary) {
      return await this.summarizeAndCompact(messages);
    }
    
    return messages;
  }

  private async summarizeAndCompact(messages: Message[]): Promise<Message[]> {
    // Keep recent messages
    const recentMessages = messages.slice(-this.messages_to_keep);
    const messagesToSummarize = messages.slice(0, -this.messages_to_keep);
    
    // Generate comprehensive summary
    const summary = await this.generateContextSummary(messagesToSummarize);
    
    // Create summary message
    const summaryMessage = {
      role: 'system',
      content: `## Context Summary\n\n${summary}\n\n---\n\nContinuing with recent messages...`
    };
    
    return [summaryMessage, ...recentMessages];
  }

  private async generateContextSummary(messages: Message[]): Promise<string> {
    const summaryPrompt = `
Analyze the following conversation and create a comprehensive summary that preserves:
1. Key objectives and goals discussed
2. Important decisions made
3. Progress achieved on tasks
4. Context notes and findings
5. File operations performed
6. Planning decisions and todo items
7. Character, plot, or world-building elements established
8. Writing style and voice guidelines
9. Research findings and references
10. Any other critical information for project continuity

Provide a structured summary that allows seamless continuation of the writing project.
    `;

    const response = await this.model.invoke([
      { role: 'system', content: summaryPrompt },
      { role: 'user', content: JSON.stringify(messages) }
    ]);

    return response.content;
  }
}
```

### 4. Subagent Orchestration System

#### Subagent Configuration and Management
```typescript
interface SubAgentConfig {
  name: string;
  description: string;
  prompt: string;
  tools: BaseTool[];
  middleware: AgentMiddleware[];
  specializations: string[];
  context_isolation: boolean;
}

const AUTHOR_SUBAGENTS: SubAgentConfig[] = [
  {
    name: "character-developer",
    description: "Specialized in character creation, development, and consistency tracking",
    prompt: CHARACTER_DEVELOPMENT_AGENT_PROMPT,
    tools: [character_tools, consistency_tools, relationship_tools, write_todos, create_context_note],
    middleware: [PlanningMiddleware, FilesystemMiddleware, CharacterMiddleware],
    specializations: ["character_creation", "character_arcs", "dialogue", "relationships"],
    context_isolation: true
  },
  {
    name: "world-builder", 
    description: "Focused on world-building, settings, and environmental consistency",
    prompt: WORLD_BUILDING_AGENT_PROMPT,
    tools: [world_tools, location_tools, consistency_tools, write_todos, create_context_note],
    middleware: [PlanningMiddleware, FilesystemMiddleware, WorldBuildingMiddleware],
    specializations: ["world_creation", "settings", "cultures", "geography", "history"],
    context_isolation: true
  },
  {
    name: "plot-architect",
    description: "Specializes in story structure, pacing, and narrative development",
    prompt: PLOT_ARCHITECTURE_AGENT_PROMPT,
    tools: [plot_tools, structure_tools, pacing_tools, write_todos, create_context_note],
    middleware: [PlanningMiddleware, FilesystemMiddleware, PlotMiddleware],
    specializations: ["story_structure", "pacing", "plot_development", "tension"],
    context_isolation: true
  },
  {
    name: "research-specialist",
    description: "Conducts thorough research, fact-checking, and reference management",
    prompt: RESEARCH_SPECIALIST_AGENT_PROMPT,
    tools: [research_tools, fact_check_tools, citation_tools, write_todos, create_context_note],
    middleware: [PlanningMiddleware, FilesystemMiddleware, ResearchMiddleware],
    specializations: ["research", "fact_checking", "citations", "references"],
    context_isolation: true
  }
];

// Subagent creation and management
class SubAgentManager {
  private agents: Map<string, Agent> = new Map();

  async createSubAgent(config: SubAgentConfig): Promise<Agent> {
    const agent = create_agent(
      this.model,
      prompt: config.prompt,
      tools: config.tools,
      middleware: config.middleware,
      checkpointer: false
    );

    this.agents.set(config.name, agent);
    return agent;
  }

  async delegateTask(
    subagent_name: string,
    task_description: string,
    context: TaskContext,
    expected_output: string
  ): Promise<SubAgentResult> {
    const agent = this.agents.get(subagent_name);
    if (!agent) {
      throw new Error(`Subagent ${subagent_name} not found`);
    }

    // Create isolated context for subagent
    const isolatedContext = this.createIsolatedContext(context, subagent_name);

    // Execute task with detailed instructions
    const result = await agent.invoke({
      messages: [{
        role: 'user',
        content: `
## Task Assignment

**Objective**: ${task_description}

**Expected Output**: ${expected_output}

**Context**: ${JSON.stringify(isolatedContext, null, 2)}

**Instructions**:
1. Use planning tools (todo lists) for complex tasks
2. Create context notes for important findings
3. Generate progress files for significant work
4. Maintain consistency with project guidelines
5. Provide detailed, actionable results

Please complete this task systematically and document your process.
        `
      }],
      context: isolatedContext
    });

    return {
      success: true,
      output: result.messages[result.messages.length - 1].content,
      context_updates: result.context_updates,
      files_created: result.files_created,
      progress_made: result.progress_updates
    };
  }

  private createIsolatedContext(context: TaskContext, subagent_name: string): IsolatedContext {
    // Create context specific to subagent's needs
    return {
      project_id: context.project_id,
      relevant_files: context.files.filter(f => this.isRelevantToSubagent(f, subagent_name)),
      character_data: subagent_name === 'character-developer' ? context.characters : [],
      world_data: subagent_name === 'world-builder' ? context.world_elements : [],
      plot_data: subagent_name === 'plot-architect' ? context.plot_elements : [],
      research_data: subagent_name === 'research-specialist' ? context.research : [],
      objectives: context.objectives.filter(o => o.relates_to_subagent(subagent_name)),
      constraints: context.constraints
    };
  }
}
```

### 5. Implementation Priority and Timeline

#### Phase 1: Core Middleware (Weeks 5-8)
1. **Planning Middleware Implementation**
   - Todo management system
   - Progress tracking tools
   - Milestone management
   - Objective tracking

2. **Filesystem Middleware Implementation**
   - Enhanced file operations
   - Context note system
   - Progress file creation
   - Session summary generation

3. **Summarization Middleware Implementation**
   - Context compaction algorithms
   - Intelligent summarization
   - Context preservation logic
   - Performance optimization

#### Phase 2: Advanced Prompting (Weeks 9-12)
1. **Master Agent Prompt Development**
   - Comprehensive system prompts
   - Tool usage guidelines
   - Context awareness instructions
   - Quality standards definition

2. **Specialized Agent Prompts**
   - Planning Agent optimization
   - Writing Agent enhancement
   - Editing Agent refinement
   - Research Agent specialization

#### Phase 3: Subagent System (Weeks 13-16)
1. **Subagent Architecture**
   - Subagent configuration system
   - Task delegation framework
   - Context isolation mechanisms
   - Result synthesis protocols

2. **Specialized Subagents**
   - Character Developer subagent
   - World Builder subagent
   - Plot Architect subagent
   - Research Specialist subagent

## Success Metrics and Validation

### 1. Planning Tool Effectiveness
- **Todo Completion Rate**: >90% of created todos should be completed
- **Progress Tracking Accuracy**: Real-time progress updates for all complex tasks
- **Context Preservation**: 100% of important information preserved across sessions
- **User Satisfaction**: High user ratings for planning and organization features

### 2. File Management Performance
- **File Operation Success**: 99.9% success rate for file operations
- **Context Note Utility**: Regular use and reference of context notes
- **Progress File Quality**: Comprehensive and useful progress documentation
- **Session Continuity**: Seamless handoff between writing sessions

### 3. Subagent Coordination
- **Task Delegation Success**: >95% successful subagent task completion
- **Context Isolation**: No context pollution between subagents
- **Result Quality**: High-quality, specialized outputs from subagents
- **Integration Effectiveness**: Smooth integration of subagent results

This implementation guide ensures that the Author application fully leverages the sophisticated capabilities of the deepagents framework, providing users with an incredibly powerful and intelligent book writing assistant that rivals the best agentic coding IDEs.
