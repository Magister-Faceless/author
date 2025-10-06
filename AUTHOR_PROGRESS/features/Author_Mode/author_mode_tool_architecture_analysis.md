# Author Mode Tool Architecture Analysis

**Date**: October 6, 2025  
**Topic**: Virtual vs Real File Tools - Architecture Decision  
**Status**: Analysis Complete - Ready for Implementation

---

## Executive Summary

This document analyzes whether the DeepAgents framework's built-in virtual file management and planning tools should be provided to agents alongside the real file management tools in the Author project.

**KEY FINDING**: The DeepAgents SDK **DOES NOT** provide built-in virtual file management tools. The SDK only provides:
1. **TodoWrite** - For task tracking and progress visualization
2. **ExitPlanMode** - For planning workflows when in 'plan' permission mode
3. **Real file tools** - Read, Write, Edit, Glob, Grep, etc.

**CONCLUSION**: There is **NO CONFLICT** between virtual and real file tools because the SDK doesn't provide virtual file tools. The Master Development Plan's reference to "custom MCP planning tools" refers to tools we would need to **build ourselves** if we want virtual file management capabilities.

---

## Understanding Claude Agent SDK Built-in Tools

### What the SDK Actually Provides

Based on the SDK documentation (`claude_agent_sdk_doc.md`), the built-in tools are:

#### 1. **File Management Tools (Real Files)**
- **Read** - Read file contents
- **Write** - Write to files
- **Edit** - Make precise edits to files
- **MultiEdit** - Multiple edits in one operation
- **Glob** - Find files by pattern
- **Grep** - Search file contents

These tools **operate on real files** in the user's filesystem.

#### 2. **Planning & Task Management Tools**
- **TodoWrite** - Creates and manages structured task lists
  - Used for complex multi-step workflows
  - Tracks task status: pending, in_progress, completed
  - Provides progress visualization to users
  
- **ExitPlanMode** - Exits planning mode and presents plan for approval
  - Only relevant when using `permissionMode: 'plan'`
  - Allows agent to create a plan without execution

#### 3. **Execution Tools**
- **Bash** - Execute shell commands
- **Task** - Delegate work to subagents
- **KillBash** - Terminate running processes

#### 4. **Web & Research Tools**
- **WebFetch** - Fetch and process web content
- **WebSearch** - Search the web

#### 5. **MCP Integration Tools**
- **ListMcpResources** - List MCP server resources
- **ReadMcpResource** - Read MCP resource content

### What the SDK Does NOT Provide

The SDK **DOES NOT** provide:
- ❌ Virtual file system for agent-only documents
- ❌ ProgressFileWrite tool
- ❌ ContextNoteWrite tool
- ❌ SessionSummaryGenerate tool
- ❌ EnhancedTodoWrite with dependencies

These tools were **proposed** in the Master Development Plan as **custom tools** we would build using the MCP server system.

---

## Clarifying the Master Development Plan

### Week 5-6: Custom MCP Server Development

The Master Development Plan (lines 139-145) states:

```
#### Custom MCP Server Development
- [ ] **Enhanced Planning Tools**
  - Create custom MCP server with createSdkMcpServer
  - Implement ProgressFileWrite tool for session tracking
  - Develop ContextNoteWrite tool for persistent notes
  - Create SessionSummaryGenerate tool for continuity
  - Build EnhancedTodoWrite with dependencies and time tracking
```

**This means**: We would **create our own custom MCP server** with these tools if we need them.

### Week 5-6: Built-in Tool Integration

Lines 133-137 state:

```
- [ ] **Built-in Tool Integration**
  - Integrate TodoWrite tool for basic task management
  - Implement ExitPlanMode for planning workflows
  - Set up Task tool for subagent delegation
  - Configure permission modes and tool access controls
```

**This means**: Use the SDK's built-in tools as-is.

---

## Current Implementation Status

### What We Have Now

From `agent_service.py`:

```python
# Create file tools scoped to project
file_tools = create_file_tools(str(self.project_path))

# Create the deep agent
self.agent = async_create_deep_agent(
    tools=file_tools,
    instructions=MAIN_AGENT_INSTRUCTIONS,
    model=model,
    subagents=subagents,
)
```

**Current setup**:
- ✅ Real file management tools (Read, Write, Edit, etc.)
- ✅ Main orchestrator agent with subagents
- ✅ Streaming responses with deltas
- ❌ No custom MCP planning tools yet
- ❌ No virtual file system yet

### What Agents Currently Have Access To

**Built-in SDK tools** (automatically included when using Claude SDK):
1. **TodoWrite** - For task tracking ✅
2. **ExitPlanMode** - For planning workflows ✅
3. **Task** - For subagent delegation ✅
4. **Bash** - For executing commands (if enabled)

**Custom tools** (explicitly provided):
1. **Real file operations** - Read, Write, Edit, Glob, Grep on project files ✅

---

## Key Question: Do We Need Virtual File Tools?

### What Are Virtual File Tools?

Virtual file tools would be tools that:
- Create documents in a separate "virtual" filesystem
- Store agent progress notes, context, and plans
- Persist across sessions but are separate from the actual manuscript files
- Help agents maintain long-term context and continuity

### Why the Master Plan Suggested Them

The Master Development Plan suggested virtual file tools for:

1. **Agent Documentation System** (lines 148-152)
   - Implement virtual file system for agent-created documents
   - Create file indexing and search capabilities
   - Set up metadata management for virtual files
   - Implement VirtualFileRead tool for accessing documents

2. **Agent-Specific File Integration** (lines 188-193)
   - Implement progress file creation and management
   - Create context note system for agent information persistence
   - Set up session summary generation and storage
   - Build agent workspace organization

### The Real Question

**Do we need a SEPARATE virtual filesystem, or can agents just use the real file tools to create their own files in designated directories?**

---

## Architectural Decision: Virtual vs Real Files for Agent Context

### Option 1: Build Custom Virtual File System

**What it means**:
- Create custom MCP server with virtual file tools
- Agent documents exist only in memory or separate database
- Never touch the real filesystem for agent notes

**Pros**:
- ✅ Clean separation between manuscript and agent files
- ✅ Can implement custom metadata and indexing
- ✅ No risk of cluttering user's project
- ✅ Can reset/clear agent memory independently

**Cons**:
- ❌ More complex to implement
- ❌ Requires custom MCP server development
- ❌ Agent context not inspectable by users
- ❌ More abstraction layers

### Option 2: Use Real Files in Designated Directories ⭐ RECOMMENDED

**What it means**:
- Create `.author/` directory in each project
- Agents use normal Write/Read tools to save progress notes
- All context is stored as real markdown files
- Structure: `.author/progress/`, `.author/notes/`, `.author/sessions/`

**Pros**:
- ✅ Simple - uses existing tools
- ✅ User can inspect agent notes
- ✅ Version control friendly (can gitignore or commit)
- ✅ No custom tools needed
- ✅ Transparent and debuggable
- ✅ Works with existing SDK immediately

**Cons**:
- ⚠️ Could clutter project (mitigated by `.author/` convention)
- ⚠️ Agents must follow file naming conventions

### Recommendation: Option 2

**Use real file tools with designated `.author/` directories.**

**Rationale**:
1. **Simplicity**: No need to build custom MCP server
2. **Transparency**: Users can see what agents are doing
3. **Standard tools**: Agents already know how to use Write/Read
4. **Version control**: Can commit agent notes for team collaboration
5. **Fast implementation**: Can start immediately

**Implementation**:
```
project/
├── chapters/
│   ├── chapter-1.md
│   └── chapter-2.md
├── .author/                    # Agent workspace
│   ├── progress/               # Progress tracking
│   │   ├── session-001.md
│   │   └── session-002.md
│   ├── notes/                  # Context notes
│   │   ├── character-notes.md
│   │   └── plot-threads.md
│   ├── plans/                  # Planning documents
│   │   └── outline-v1.md
│   └── todos/                  # Task lists (if not using TodoWrite)
│       └── current-tasks.md
└── .gitignore                  # Can ignore .author/ if desired
```

---

## TodoWrite Tool: Built-in Planning Capability

### What TodoWrite Provides

The SDK's built-in **TodoWrite** tool already gives agents:
- ✅ Structured task tracking
- ✅ Status management (pending/in_progress/completed)
- ✅ Progress visualization for users
- ✅ Multi-step workflow organization

### Usage Pattern

```typescript
// Agent automatically uses TodoWrite for complex tasks
{
  type: "tool_use",
  name: "TodoWrite",
  input: {
    todos: [
      { content: "Plan chapter outline", status: "completed", activeForm: "Planning chapter outline" },
      { content: "Write opening scene", status: "in_progress", activeForm: "Writing opening scene" },
      { content: "Review for consistency", status: "pending", activeForm: "Reviewing for consistency" }
    ]
  }
}
```

### When TodoWrite Is Used

From SDK documentation:
- Complex multi-step tasks requiring 3+ distinct actions
- User-provided task lists
- Non-trivial operations benefiting from progress tracking
- Explicit user requests for todo organization

### Recommendation: Use TodoWrite

**The built-in TodoWrite tool is sufficient for task management.**

We do NOT need to build EnhancedTodoWrite unless we specifically need:
- Task dependencies (task A must complete before task B)
- Time estimates and tracking
- Priority levels
- Hierarchical task structures

**For most book writing workflows, the basic TodoWrite is sufficient.**

---

## Final Architecture Recommendation

### Tools Agents Should Have Access To

#### 1. Built-in SDK Tools (Automatically Available)
- ✅ **TodoWrite** - Task tracking and progress
- ✅ **ExitPlanMode** - Planning workflows (when in plan mode)
- ✅ **Task** - Subagent delegation

#### 2. Custom Real File Tools (Explicitly Provided)
- ✅ **Read** - Read project and `.author/` files
- ✅ **Write** - Write to project and `.author/` files
- ✅ **Edit** - Edit existing files
- ✅ **Glob** - Find files
- ✅ **Grep** - Search content

#### 3. Tool Access Scope

**Main Orchestrator Agent**:
- All file tools (full project access)
- TodoWrite for overall task management
- Task for delegating to subagents

**Subagents** (Planning, Writing, Editing):
- File tools scoped to their responsibility
- TodoWrite for subtask tracking
- No Task tool (can't delegate further)

### No Custom Virtual File Tools Needed

**Decision**: Do not build custom MCP server with virtual file tools.

**Instead**: Agents use standard Write/Read tools to manage their context in `.author/` directory.

**Benefits**:
- Faster implementation
- Simpler architecture
- More transparent to users
- No additional learning curve for agents

---

## Implementation Impact on Author Mode

### Author Mode Architecture

From the implementation plan, Author Mode will:
1. Change agent prompts based on selected mode (Fiction, Non-Fiction, Academic)
2. Keep same agent architecture (single agent with subagents)
3. Use same tools regardless of mode

### Tool Access Is Mode-Independent

**All author modes will have access to the same tools**:
- File operations (Read, Write, Edit, etc.)
- TodoWrite for task management
- Task for subagent delegation

**What changes between modes**:
- System prompts and instructions
- Terminology and focus areas
- Examples and guidelines

**Tools remain universal across all modes** ✅

### No Conflicts or Redundancy

There is **NO REDUNDANCY** between:
- Built-in SDK tools (TodoWrite, ExitPlanMode)
- Custom file tools (Read, Write, Edit)

They serve **different purposes**:
- **TodoWrite**: Task tracking and user progress visibility
- **File tools**: Manuscript and agent context management

Both should be available to all agents in all modes.

---

## Summary of Findings

### 1. SDK Provides Real File Tools Only

The Claude Agent SDK **DOES NOT** include virtual file management tools. All file tools operate on real filesystem files.

### 2. TodoWrite Is Sufficient for Planning

The built-in **TodoWrite** tool provides adequate task management for book writing workflows. Custom enhanced todo tools are not needed initially.

### 3. Use Real Files for Agent Context

Agents should use standard Write/Read tools to save progress notes, context, and session summaries in a `.author/` directory within each project.

### 4. No Tool Conflicts

There is **NO CONFLICT** between built-in and custom tools:
- Built-in: TodoWrite (task tracking), ExitPlanMode (planning mode)
- Custom: Real file operations (Read, Write, Edit)

All should be available to agents.

### 5. Ready for Author Mode Implementation

The current tool architecture is **ready for Author Mode implementation**:
- ✅ File tools work universally
- ✅ TodoWrite provides task tracking
- ✅ Agents can manage their own context
- ✅ No architectural changes needed

---

## Next Steps for Author Mode Implementation

### 1. Proceed with Author Mode Implementation ✅

Following the implementation plan:

**Phase 1: Core Infrastructure**
- [ ] Create prompt template system (`backend/prompts/prompt_templates.py`)
- [ ] Define Fiction, Non-Fiction, and Academic mode templates
- [ ] Modify `AgentService` to accept mode parameter
- [ ] Update frontend to show mode selector

**NO tool changes needed** - current tool setup is correct.

### 2. Optional: Add Agent Context Management

If we want agents to maintain session continuity:

- [ ] Create `.author/` directory structure in projects
- [ ] Update agent prompts to use `.author/` for progress notes
- [ ] Add instructions for reading previous session summaries
- [ ] Implement session handoff workflow

**Can use existing Write/Read tools** - no custom tools needed.

### 3. Future: Consider Custom Planning Tools

Only build custom MCP planning tools if we find that:
- TodoWrite is insufficient for complex planning
- Need dependency tracking between tasks
- Want time estimation and tracking
- Require hierarchical task structures

**Not needed for initial launch** - can add later if necessary.

---

## Conclusion

**Answer to the user's question**:

1. **Are virtual file management tools redundant?**
   - There are NO virtual file management tools in the SDK. The Master Plan was proposing we **build** them, but we don't need to. Agents can use real file tools to manage context in `.author/` directories.

2. **Should agents have access to built-in planning tools?**
   - **YES**. TodoWrite and ExitPlanMode are useful built-in tools that provide task tracking and planning workflows. They do NOT conflict with real file tools.

3. **Is there confusion between virtual and real file tools?**
   - **NO**. There's no confusion because virtual file tools don't exist. All file tools are real file tools.

4. **Should we proceed with Author Mode?**
   - **YES**. The current architecture is ready. Focus on implementing mode-specific prompts, not tools.

**Current tool architecture is correct and ready for Author Mode implementation.** 🎯

---

**Status**: Analysis Complete  
**Decision**: Use current tool setup - no changes needed  
**Action**: Proceed with Author Mode prompt template implementation
