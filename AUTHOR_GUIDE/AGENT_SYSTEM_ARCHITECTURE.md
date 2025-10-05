# Author - Agent System Architecture

## Overview

The Author application leverages the full power of the Claude Agents SDK with an advanced middleware architecture inspired by the deepagents framework. This system provides sophisticated planning tools, file management capabilities, subagent orchestration, and optimized prompting for complex book writing tasks.

## Core Agent System Components

### 1. Middleware Architecture

#### Planning Middleware
```typescript
class PlanningMiddleware extends AgentMiddleware {
  state_schema = PlanningState;
  tools = [write_todos, update_progress, create_milestone];

  modify_model_request(request: ModelRequest, agent_state: PlanningState): ModelRequest {
    request.system_prompt = request.system_prompt + "\n\n" + PLANNING_SYSTEM_PROMPT;
    return request;
  }
}
```

**Capabilities:**
- Todo/task management for complex multi-step operations
- Progress tracking and milestone creation
- Long-term objective planning and execution
- Task prioritization and dependency management

#### Filesystem Middleware
```typescript
class FilesystemMiddleware extends AgentMiddleware {
  state_schema = FilesystemState;
  tools = [ls, read_file, write_file, edit_file, create_progress_file, write_context_notes];

  modify_model_request(request: ModelRequest, agent_state: FilesystemState): ModelRequest {
    request.system_prompt = request.system_prompt + "\n\n" + FILESYSTEM_SYSTEM_PROMPT;
    return request;
  }
}
```

**Capabilities:**
- Complete file system operations
- Progress file creation and management
- Context note persistence
- Session summary generation

#### Summarization Middleware
```typescript
class SummarizationMiddleware extends AgentMiddleware {
  constructor(
    model: ChatModel,
    max_tokens_before_summary: number = 120000,
    messages_to_keep: number = 20
  ) {
    this.model = model;
    this.max_tokens = max_tokens_before_summary;
    this.keep_messages = messages_to_keep;
  }

  async process_messages(messages: Message[]): Promise<Message[]> {
    if (this.count_tokens(messages) > this.max_tokens) {
      return await this.summarize_and_compact(messages);
    }
    return messages;
  }
}
```

**Capabilities:**
- Automatic context compaction when approaching token limits
- Intelligent message summarization
- Context preservation for critical information
- Performance optimization for long sessions

#### Prompt Caching Middleware
```typescript
class AnthropicPromptCachingMiddleware extends AgentMiddleware {
  constructor(ttl: string = "5m", unsupported_model_behavior: string = "ignore") {
    this.ttl = ttl;
    this.behavior = unsupported_model_behavior;
  }

  modify_model_request(request: ModelRequest): ModelRequest {
    request.cache_control = {
      type: "ephemeral",
      ttl: this.ttl
    };
    return request;
  }
}
```

**Capabilities:**
- Intelligent prompt caching for API optimization
- Reduced latency for repeated operations
- Cost optimization through cache reuse
- Configurable cache behavior

### 2. Agent System Prompts

#### Master System Prompt Template
```typescript
const MASTER_AGENT_PROMPT = `
You are an expert book writing assistant with access to advanced planning and file management tools.

## Core Capabilities
1. **Planning Tools**: Use todo lists to track complex multi-step objectives
2. **File Management**: Create progress files, context notes, and session summaries
3. **Subagent Delegation**: Delegate specialized tasks to focused subagents
4. **Context Management**: Maintain awareness of project state and objectives

## Planning Tool Usage
- For complex tasks (3+ steps), ALWAYS create a todo list first
- Mark tasks as in_progress before starting work
- Update progress in real-time
- Create progress files for important findings
- Write context notes to preserve information between sessions

## File Management Protocol
- Create progress files: \`progress_[timestamp].md\` for session tracking
- Write context notes: \`context_[topic].md\` for important information
- Generate summaries: \`summary_[date].md\` for completed work
- Maintain project logs: \`project_log.md\` for overall progress

## Subagent Delegation
- Use subagents for independent, complex tasks
- Provide detailed instructions and expected outputs
- Parallelize work whenever possible
- Synthesize subagent results into coherent responses

## Book Writing Expertise
You specialize in:
- Story structure and narrative development
- Character creation and development
- World-building and consistency
- Writing style and voice optimization
- Research and fact-checking
- Editing and revision processes
`;
```

#### Planning Agent System Prompt
```typescript
const PLANNING_AGENT_PROMPT = `
You are a specialized planning agent for book writing projects. Your role is to:

## Primary Responsibilities
1. **Story Structure Analysis**: Analyze and improve narrative structure
2. **Character Arc Development**: Plan character growth and development
3. **Plot Consistency**: Ensure plot coherence and eliminate holes
4. **Timeline Management**: Organize events chronologically
5. **Pacing Optimization**: Balance action, dialogue, and description

## Planning Methodology
1. **Initial Assessment**: Analyze existing content and objectives
2. **Structure Planning**: Create detailed outlines and story maps
3. **Character Planning**: Develop character profiles and arcs
4. **Timeline Creation**: Establish chronological event sequences
5. **Progress Tracking**: Monitor implementation of plans

## Tools and Techniques
- Create detailed todo lists for complex planning tasks
- Write comprehensive planning documents
- Generate character development sheets
- Create timeline visualizations
- Maintain consistency databases

## Output Requirements
- Always provide structured, actionable plans
- Include specific milestones and checkpoints
- Create measurable objectives
- Provide alternative approaches when appropriate
- Document all planning decisions and rationale
`;
```

#### Writing Agent System Prompt
```typescript
const WRITING_AGENT_PROMPT = `
You are a specialized writing agent focused on content creation and style optimization.

## Core Writing Capabilities
1. **Content Generation**: Create new scenes, chapters, and narrative elements
2. **Style Consistency**: Maintain consistent voice and tone throughout
3. **Dialogue Enhancement**: Improve character conversations and interactions
4. **Description Optimization**: Enhance scene descriptions and world-building
5. **Transition Crafting**: Create smooth connections between scenes and chapters

## Writing Process
1. **Context Analysis**: Understand existing content and style
2. **Content Planning**: Plan new content structure and approach
3. **Draft Creation**: Generate initial content drafts
4. **Style Refinement**: Adjust tone, voice, and style consistency
5. **Integration**: Ensure new content fits seamlessly with existing work

## Quality Standards
- Maintain consistent character voices
- Follow established world-building rules
- Match existing writing style and tone
- Ensure proper pacing and flow
- Create engaging, compelling content

## Documentation Requirements
- Track writing decisions and style choices
- Document character voice guidelines
- Maintain style consistency notes
- Record world-building elements used
- Create revision logs for major changes
`;
```

### 3. Advanced Tool Ecosystem

#### Planning Tools
```typescript
// Todo management for complex objectives
@tool("Create and manage structured task lists for complex writing projects")
async function write_todos(
  todos: Todo[],
  project_context: ProjectContext
): Promise<TodoUpdateResult> {
  // Implementation for sophisticated todo management
}

// Progress tracking and milestone management
@tool("Track progress on writing objectives and create milestones")
async function update_progress(
  task_id: string,
  progress: ProgressUpdate,
  milestone?: Milestone
): Promise<ProgressResult> {
  // Implementation for progress tracking
}

// Context note creation for persistent information
@tool("Create context notes to preserve important information")
async function create_context_note(
  topic: string,
  content: string,
  tags: string[]
): Promise<ContextNoteResult> {
  // Implementation for context note management
}
```

#### File Management Tools
```typescript
// Enhanced file operations with progress tracking
@tool("Advanced file operations with automatic progress tracking")
async function enhanced_write_file(
  file_path: string,
  content: string,
  metadata: FileMetadata,
  track_progress: boolean = true
): Promise<FileOperationResult> {
  // Implementation with progress tracking
}

// Session summary generation
@tool("Generate comprehensive session summaries")
async function generate_session_summary(
  session_data: SessionData,
  key_achievements: string[]
): Promise<SessionSummary> {
  // Implementation for session summarization
}

// Project log maintenance
@tool("Maintain comprehensive project logs")
async function update_project_log(
  log_entry: LogEntry,
  category: LogCategory
): Promise<LogUpdateResult> {
  // Implementation for project logging
}
```

### 4. Subagent Orchestration

#### Subagent Configuration
```typescript
const AUTHOR_SUBAGENTS: SubAgentConfig[] = [
  {
    name: "character-developer",
    description: "Specialized in character creation, development, and consistency",
    prompt: CHARACTER_DEVELOPMENT_PROMPT,
    tools: [character_tools, consistency_tools, relationship_tools],
    middleware: [PlanningMiddleware, FilesystemMiddleware, CharacterMiddleware]
  },
  {
    name: "world-builder",
    description: "Focused on world-building, settings, and environmental consistency",
    prompt: WORLD_BUILDING_PROMPT,
    tools: [world_tools, location_tools, consistency_tools],
    middleware: [PlanningMiddleware, FilesystemMiddleware, WorldBuildingMiddleware]
  },
  {
    name: "research-specialist",
    description: "Conducts thorough research and fact-checking",
    prompt: RESEARCH_SPECIALIST_PROMPT,
    tools: [research_tools, fact_check_tools, citation_tools],
    middleware: [PlanningMiddleware, FilesystemMiddleware, ResearchMiddleware]
  },
  {
    name: "style-editor",
    description: "Focuses on style consistency, voice, and editorial improvements",
    prompt: STYLE_EDITOR_PROMPT,
    tools: [editing_tools, style_tools, consistency_tools],
    middleware: [PlanningMiddleware, FilesystemMiddleware, EditingMiddleware]
  }
];
```

#### Task Delegation System
```typescript
@tool("Delegate complex tasks to specialized subagents")
async function delegate_task(
  task_description: string,
  subagent_type: string,
  expected_output: string,
  context: TaskContext
): Promise<SubagentResult> {
  const subagent = await createSubagent(subagent_type, {
    middleware: getDefaultMiddleware(),
    tools: getSubagentTools(subagent_type),
    context: context
  });

  const result = await subagent.execute({
    task: task_description,
    expected_output: expected_output,
    context: context
  });

  return {
    success: true,
    result: result.output,
    context_updates: result.context_changes,
    files_created: result.files,
    progress_updates: result.progress
  };
}
```

### 5. Context Management and Optimization

#### Context State Management
```typescript
interface AgentContext {
  project_id: string;
  current_objectives: Objective[];
  active_todos: Todo[];
  recent_progress: ProgressUpdate[];
  context_notes: ContextNote[];
  session_history: SessionEntry[];
  relevant_files: FileReference[];
  character_database: Character[];
  world_building_elements: WorldElement[];
}

class ContextManager {
  async optimizeContext(context: AgentContext): Promise<OptimizedContext> {
    // Prioritize most relevant information
    const prioritized = await this.prioritizeContextElements(context);
    
    // Compress less critical information
    const compressed = await this.compressSecondaryContext(prioritized);
    
    // Maintain critical project state
    const preserved = await this.preserveCriticalState(compressed);
    
    return preserved;
  }

  async summarizeSession(session: SessionData): Promise<SessionSummary> {
    return {
      key_achievements: session.completed_tasks,
      progress_made: session.progress_updates,
      files_modified: session.file_changes,
      context_updates: session.context_changes,
      next_steps: session.planned_actions,
      summary: await this.generateNarrativeSummary(session)
    };
  }
}
```

### 6. Progress Tracking and Reporting

#### Real-time Progress Updates
```typescript
interface ProgressTracker {
  updateTaskProgress(task_id: string, progress: number, notes?: string): Promise<void>;
  createMilestone(name: string, description: string, target_date?: Date): Promise<Milestone>;
  generateProgressReport(timeframe: TimeFrame): Promise<ProgressReport>;
  trackWritingMetrics(session: WritingSession): Promise<WritingMetrics>;
}

class ProgressReportGenerator {
  async generateDailyReport(project_id: string): Promise<DailyReport> {
    return {
      words_written: await this.getWordsWritten(),
      tasks_completed: await this.getCompletedTasks(),
      files_modified: await this.getModifiedFiles(),
      key_achievements: await this.getKeyAchievements(),
      next_day_plan: await this.generateNextDayPlan()
    };
  }

  async generateWeeklyReport(project_id: string): Promise<WeeklyReport> {
    return {
      weekly_progress: await this.getWeeklyProgress(),
      milestone_status: await this.getMilestoneStatus(),
      productivity_metrics: await this.getProductivityMetrics(),
      areas_for_improvement: await this.identifyImprovements(),
      upcoming_objectives: await this.getUpcomingObjectives()
    };
  }
}
```

## Implementation Strategy

### Phase 1: Core Middleware Implementation
1. Implement Planning Middleware with todo management
2. Enhance Filesystem Middleware with progress tracking
3. Add Summarization Middleware for context optimization
4. Integrate Prompt Caching Middleware for performance

### Phase 2: Advanced Agent Prompting
1. Develop comprehensive system prompts for each agent type
2. Create specialized prompts for subagents
3. Implement prompt optimization and testing
4. Add dynamic prompt adjustment based on context

### Phase 3: Subagent Orchestration
1. Implement subagent creation and management system
2. Add task delegation and result synthesis
3. Create specialized subagents for different writing aspects
4. Implement parallel processing capabilities

### Phase 4: Context and Progress Management
1. Advanced context optimization and summarization
2. Real-time progress tracking and reporting
3. Session management and continuity
4. Performance monitoring and optimization

This architecture ensures that the Author application leverages the full power of the Claude Agents SDK with the sophisticated capabilities demonstrated by the deepagents framework, providing users with an incredibly powerful and intelligent book writing assistant.
