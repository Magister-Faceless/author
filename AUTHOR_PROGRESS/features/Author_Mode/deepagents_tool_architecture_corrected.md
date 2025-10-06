# DeepAgents Tool Architecture - CORRECTED Analysis

**Date**: October 6, 2025  
**Topic**: Understanding DeepAgents Virtual vs Real File Tools  
**Status**: Corrected - Previous analysis was based on wrong framework

---

## CRITICAL CORRECTION

**Previous analysis was INCORRECT** - I analyzed the Claude Agents SDK, but Author is using the **DeepAgents framework**, which is completely different!

---

## What Is DeepAgents?

From `deepagents/README.md`:

> "Using an LLM to call tools in a loop is the simplest form of an agent. This architecture, however, can yield agents that are 'shallow' and fail to plan and act over longer, more complex tasks. Applications like 'Deep Research', 'Manus', and 'Claude Code' have gotten around this limitation by implementing a combination of four things: a **planning tool**, **sub agents**, access to a **file system**, and a **detailed prompt**."

**DeepAgents is a framework that provides these four components out-of-the-box.**

---

## Built-in Tools in DeepAgents Framework

### From `deepagents/src/deepagents/tools.py`:

DeepAgents provides **5 built-in tools** automatically:

#### 1. `write_todos` - Planning Tool ✅
```python
@tool(description=WRITE_TODOS_TOOL_DESCRIPTION)
def write_todos(todos: list[Todo], tool_call_id: Annotated[str, InjectedToolCallId]) -> Command:
    return Command(update={"todos": todos, "messages": [...]})
```
- **Purpose**: Task tracking and progress visualization
- **Storage**: LangGraph state (`state["todos"]`)
- **Lifecycle**: Exists only during agent execution
- **Visibility**: User can see todo list in UI

#### 2. `ls` - List Virtual Files ✅
```python
@tool(description=LIST_FILES_TOOL_DESCRIPTION)
def ls(state: Annotated[FilesystemState, InjectedState]) -> list[str]:
    return list(state.get("files", {}).keys())
```
- **Purpose**: List files in virtual filesystem
- **Storage**: LangGraph state (`state["files"]`)

#### 3. `read_file` - Read Virtual File ✅
```python
@tool(description=READ_FILE_TOOL_DESCRIPTION)
def read_file(file_path: str, state: Annotated[FilesystemState, InjectedState], 
              offset: int = 0, limit: int = 2000) -> str:
    mock_filesystem = state.get("files", {})
    if file_path not in mock_filesystem:
        return f"Error: File '{file_path}' not found"
    content = mock_filesystem[file_path]
    # Returns formatted content with line numbers
```
- **Purpose**: Read from virtual filesystem
- **Storage**: LangGraph state (`state["files"]`)

#### 4. `write_file` - Write Virtual File ✅
```python
@tool(description=WRITE_FILE_TOOL_DESCRIPTION)
def write_file(file_path: str, content: str, 
               state: Annotated[FilesystemState, InjectedState],
               tool_call_id: Annotated[str, InjectedToolCallId]) -> Command:
    files = state.get("files", {})
    files[file_path] = content
    return Command(update={"files": files, "messages": [...]})
```
- **Purpose**: Write to virtual filesystem
- **Storage**: LangGraph state (`state["files"]`)

#### 5. `edit_file` - Edit Virtual File ✅
```python
@tool(description=EDIT_FILE_TOOL_DESCRIPTION)
def edit_file(file_path: str, old_string: str, new_string: str,
              state: Annotated[FilesystemState, InjectedState],
              tool_call_id: Annotated[str, InjectedToolCallId],
              replace_all: bool = False) -> Union[Command, str]:
    mock_filesystem = state.get("files", {})
    # Performs string replacement in virtual file
```
- **Purpose**: Edit files in virtual filesystem
- **Storage**: LangGraph state (`state["files"]`)

---

## Key Insight: Virtual Filesystem

From DeepAgents README (lines 252-272):

> "These do not actually use a file system - rather, they mock out a file system using LangGraph's State object. This means you can easily run many of these agents on the same machine without worrying that they will edit the same underlying files."

**What this means**:
- Virtual files exist **only in memory** during agent execution
- They are **NOT written to disk**
- They live in LangGraph's state object
- Each agent session has its own isolated virtual filesystem
- Virtual files are **cleared when session ends** (unless explicitly persisted)

**Purpose of Virtual Filesystem**:
```python
agent = create_deep_agent(...)

result = agent.invoke({
    "messages": ...,
    # Pass in files to the agent using this key
    "files": {"planning.md": "Chapter outline...", "notes.md": "Character notes..."}
})

# Access any files afterwards
result["files"]  # Get all files created by agent
```

---

## Custom Real File Tools in Author Project

### From `backend/tools/file_tools.py`:

Author project created **4 custom REAL file tools**:

#### 1. `read_real_file` ✅
```python
@tool
def read_real_file(file_path: str, offset: int = 0, limit: int = 2000) -> str:
    """Read a real file from the project."""
    full_path = _resolve_path(file_path)
    # Actually reads from filesystem using open()
```
- **Purpose**: Read actual manuscript files from disk
- **Storage**: Real filesystem (project directory)

#### 2. `write_real_file` ✅
```python
@tool
def write_real_file(file_path: str, content: str) -> str:
    """Write to a real file in the project."""
    full_path = _resolve_path(file_path)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
```
- **Purpose**: Write manuscript files to disk
- **Storage**: Real filesystem (project directory)

#### 3. `list_real_files` ✅
```python
@tool
def list_real_files(directory: str = ".", pattern: Optional[str] = None) -> str:
    """List real files in a directory."""
    dir_path = _resolve_path(directory)
    files = list(dir_path.iterdir())
```
- **Purpose**: Browse real project files
- **Storage**: Real filesystem (project directory)

#### 4. `edit_real_file` ✅
```python
@tool
def edit_real_file(file_path: str, old_string: str, new_string: str, replace_all: bool = False) -> str:
    """Edit a real file by replacing text."""
    full_path = _resolve_path(file_path)
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    # Performs replacement and writes back
```
- **Purpose**: Edit actual manuscript files
- **Storage**: Real filesystem (project directory)

---

## Current Agent Configuration

### From `backend/services/agent_service.py` (lines 36-68):

```python
def _initialize_agent(self):
    # Create REAL file tools scoped to project
    file_tools = create_file_tools(str(self.project_path))  # 4 real file tools
    
    # Create the deep agent
    self.agent = async_create_deep_agent(
        tools=file_tools,  # Pass REAL file tools
        instructions=MAIN_AGENT_INSTRUCTIONS,
        model=model,
        subagents=subagents,
    )
```

**What agents get**:
1. ✅ **4 REAL file tools** (passed explicitly): `read_real_file`, `write_real_file`, `list_real_files`, `edit_real_file`
2. ✅ **5 VIRTUAL file tools** (built-in from DeepAgents): `write_todos`, `ls`, `read_file`, `write_file`, `edit_file`
3. ✅ **Sub-agent delegation** (built-in from DeepAgents): `Task` tool to call subagents

**TOTAL: 9 tools available to agents**

---

## The Critical Question: Is This Redundant?

### Tool Inventory

| Tool Name | Type | Operates On | Purpose |
|-----------|------|-------------|---------|
| `write_todos` | Built-in | LangGraph state | Task tracking UI |
| `ls` | Built-in | Virtual filesystem | List virtual files |
| `read_file` | Built-in | Virtual filesystem | Read virtual files |
| `write_file` | Built-in | Virtual filesystem | Write virtual files |
| `edit_file` | Built-in | Virtual filesystem | Edit virtual files |
| `read_real_file` | Custom | Real filesystem | Read manuscript files |
| `write_real_file` | Custom | Real filesystem | Write manuscript files |
| `list_real_files` | Custom | Real filesystem | List manuscript files |
| `edit_real_file` | Custom | Real filesystem | Edit manuscript files |

### Potential Confusion Points

**PROBLEM 1**: Naming Collision 🔴
- `read_file` (virtual) vs `read_real_file` (real)
- `write_file` (virtual) vs `write_real_file` (real)
- `edit_file` (virtual) vs `edit_real_file` (real)
- `ls` (virtual) vs `list_real_files` (real)

**PROBLEM 2**: Similar Signatures 🔴
Both sets have the same parameters, making it easy for agents to confuse them.

**PROBLEM 3**: Unclear Purpose 🔴
Without clear guidance, agents might:
- Use virtual tools when they should use real tools
- Try to read manuscripts from virtual filesystem (will fail)
- Write planning documents to real filesystem (clutters project)

---

## Answer to Your Questions

### Q1: Are we using DeepAgents framework?

**YES** ✅ 

Your project uses `async_create_deep_agent` from the DeepAgents framework in `backend/services/agent_service.py`.

### Q2: Do agents automatically have access to virtual planning and document management tools?

**YES** ✅

DeepAgents framework **automatically provides** these built-in tools to ALL agents and subagents:
- `write_todos` - Planning/task tracking
- `ls` - List virtual files
- `read_file` - Read virtual files
- `write_file` - Write virtual files
- `edit_file` - Edit virtual files

These are **always available** and cannot be disabled (they're core to DeepAgents).

### Q3: What's the relationship between virtual and real file tools?

They serve **DIFFERENT purposes**:

**Virtual File Tools** (Built-in):
- ✅ Agent's **scratch workspace** for planning
- ✅ Temporary documents **during execution**
- ✅ Planning notes, outlines, analysis
- ✅ **Isolated per session** - doesn't affect real files
- ✅ Can be passed in/out via `state["files"]`

**Real File Tools** (Custom):
- ✅ User's **actual manuscript** files
- ✅ Persistent files **on disk**
- ✅ Chapters, characters, notes
- ✅ **Shared across sessions** - real project files
- ✅ What the user actually wants to create/edit

---

## The Problem: Tool Confusion

### Without Clear Guidance, Agents Will Be Confused

**Scenario 1**: Agent tries to read manuscript
```
Agent: "Let me read chapter 1"
Agent uses: read_file("chapters/chapter-1.md")  # ❌ WRONG - virtual filesystem
Result: "Error: File 'chapters/chapter-1.md' not found"
Agent: "The file doesn't exist"
```

**Should have been**:
```
Agent uses: read_real_file("chapters/chapter-1.md")  # ✅ CORRECT - real filesystem
Result: [chapter content]
```

**Scenario 2**: Agent writes planning document to real filesystem
```
Agent: "Let me create a planning document"
Agent uses: write_real_file(".author/planning.md", "...")  # ❌ WRONG - clutters project
Result: Creates real file on disk that user doesn't need
```

**Should have been**:
```
Agent uses: write_file("planning.md", "...")  # ✅ CORRECT - virtual workspace
Result: Planning doc exists in virtual filesystem for this session
```

---

## Recommended Solutions

### Option 1: Rename Custom Tools for Clarity ⭐ RECOMMENDED

Change custom tool names to clearly distinguish them:

**Before**:
- `read_real_file` → Confusing ("real" vs what?)
- `write_real_file`
- `list_real_files`
- `edit_real_file`

**After**:
- `read_manuscript_file` → Clear purpose
- `write_manuscript_file`
- `list_manuscript_files`
- `edit_manuscript_file`

**Benefits**:
- ✅ Instantly clear these are for manuscripts
- ✅ Virtual tools keep simple names (`read_file`, `write_file`)
- ✅ No confusion about which to use

### Option 2: Update Agent Instructions

Add clear guidance in agent system prompts:

```markdown
## File Management Tools

You have access to TWO sets of file tools:

### Manuscript Files (User's Book)
Use these tools to work with the user's actual book manuscript:
- `read_manuscript_file` - Read chapters, characters, outlines from project
- `write_manuscript_file` - Create new manuscript files
- `edit_manuscript_file` - Edit existing manuscript files
- `list_manuscript_files` - Browse project files

These tools operate on REAL FILES on disk that persist across sessions.

### Virtual Workspace (Your Planning Documents)
Use these tools for YOUR OWN planning and organization:
- `write_file` - Create planning documents, notes, analysis
- `read_file` - Read your own planning documents
- `edit_file` - Update your planning documents
- `ls` - List your planning documents

These tools operate on VIRTUAL FILES that exist only during this session.
They are your personal workspace and don't affect the user's project.

### When to Use Each:

**Use Manuscript Tools when**:
- Reading the user's chapters, characters, notes
- Writing new chapters or content for the book
- Editing existing book content
- Creating files the user wants to keep

**Use Virtual Tools when**:
- Creating planning documents for yourself
- Taking notes during analysis
- Organizing your thoughts
- Creating temporary documents you don't need to save
```

### Option 3: Hybrid Approach ⭐ BEST

Combine both options:
1. Rename tools to `read_manuscript_file`, etc.
2. Add clear instructions in agent prompts
3. Update tool descriptions to emphasize distinction

---

## Proposed Implementation

### Step 1: Rename Custom Tools

**File**: `backend/tools/file_tools.py`

```python
@tool
def read_manuscript_file(file_path: str, offset: int = 0, limit: int = 2000) -> str:
    """
    Read a file from the user's book manuscript project.
    
    Use this to read the user's actual chapters, characters, notes, and other
    book content that exists on disk.
    
    For your own planning documents, use read_file() instead (virtual workspace).
    """
    # ... existing implementation

@tool
def write_manuscript_file(file_path: str, content: str) -> str:
    """
    Write a file to the user's book manuscript project.
    
    Use this to create chapters, characters, notes, and other book content
    that the user wants to keep permanently.
    
    For your own planning documents, use write_file() instead (virtual workspace).
    """
    # ... existing implementation

@tool
def list_manuscript_files(directory: str = ".", pattern: Optional[str] = None) -> str:
    """
    List files in the user's book manuscript project.
    
    Use this to browse the user's actual project files on disk.
    
    For your own planning documents, use ls() instead (virtual workspace).
    """
    # ... existing implementation

@tool
def edit_manuscript_file(
    file_path: str,
    old_string: str,
    new_string: str,
    replace_all: bool = False
) -> str:
    """
    Edit a file in the user's book manuscript project.
    
    Use this to modify the user's actual book content on disk.
    
    For your own planning documents, use edit_file() instead (virtual workspace).
    """
    # ... existing implementation
```

### Step 2: Update Agent Instructions

**File**: `backend/prompts/main_agent.py`

Add section explaining the dual file system:

```python
FILE_SYSTEM_GUIDANCE = """
## File Management

You have access to two separate file systems:

### 1. Manuscript Files (User's Project)
Tools: read_manuscript_file, write_manuscript_file, edit_manuscript_file, list_manuscript_files

These tools work with the user's ACTUAL book project files on disk:
- Chapters and manuscript content
- Character profiles and world-building notes
- Research documents and references
- Any files the user wants to keep permanently

Use these when the user asks you to:
- Read their existing work
- Write new chapters or content
- Edit their manuscripts
- Create files for their book project

### 2. Virtual Workspace (Your Planning Area)
Tools: write_file, read_file, edit_file, ls

These tools work with YOUR temporary planning documents in memory:
- Planning documents and outlines
- Analysis and notes for yourself
- Temporary documents during complex tasks
- Organization and task tracking documents

Use these when YOU need to:
- Organize complex tasks
- Take notes during analysis
- Create planning documents
- Store intermediate work

**Important**: Virtual files are cleared after the session ends. Only use them
for YOUR OWN planning, not for content the user wants to keep.
"""
```

### Step 3: Update Subagent Instructions

Each subagent should understand the distinction:

**Planning Agent**:
```python
"""
...
When creating outlines and plans:
- Use write_file() for YOUR planning documents (virtual workspace)
- Use write_manuscript_file() when creating outlines the USER wants to save
"""
```

**Writing Agent**:
```python
"""
...
When writing content:
- ALWAYS use write_manuscript_file() for chapters and manuscript content
- Use write_file() only for your own drafting notes (if needed)
"""
```

**Editing Agent**:
```python
"""
...
When editing content:
- ALWAYS use read_manuscript_file() and edit_manuscript_file() for user's work
- Use virtual tools only for your own editing notes (if needed)
"""
```

---

## Benefits of This Approach

### Clear Separation of Concerns ✅
- Manuscript tools = User's book
- Virtual tools = Agent's workspace
- No confusion about which to use

### Leverages DeepAgents Design ✅
- Virtual filesystem used as intended (agent planning)
- Real filesystem for persistent user content
- Best of both worlds

### Prevents Mistakes ✅
- Agents won't try to read manuscripts from virtual filesystem
- Agents won't clutter project with temporary files
- Clear guidance in tool names and descriptions

### Maintains DeepAgents Benefits ✅
- Keep `write_todos` for task tracking
- Keep virtual filesystem for planning
- Keep detailed prompts and sub-agents

---

## Implementation Checklist

### Phase 1: Rename Tools
- [ ] Rename `read_real_file` → `read_manuscript_file`
- [ ] Rename `write_real_file` → `write_manuscript_file`
- [ ] Rename `list_real_files` → `list_manuscript_files`
- [ ] Rename `edit_real_file` → `edit_manuscript_file`
- [ ] Update tool descriptions with clear guidance
- [ ] Test that renamed tools work correctly

### Phase 2: Update Agent Prompts
- [ ] Add FILE_SYSTEM_GUIDANCE to main agent instructions
- [ ] Update Planning Agent prompt with tool guidance
- [ ] Update Writing Agent prompt with tool guidance
- [ ] Update Editing Agent prompt with tool guidance
- [ ] Test agents understand when to use each tool set

### Phase 3: Documentation
- [ ] Update developer documentation
- [ ] Document virtual vs manuscript file system
- [ ] Add examples of when to use each
- [ ] Update any existing guides

---

## Conclusion

**YES, you are correct:**
1. ✅ Author uses DeepAgents framework
2. ✅ All agents automatically have virtual planning and file tools
3. ✅ There IS potential confusion with two sets of similar tools

**The solution**:
- Rename custom tools to `*_manuscript_file` for clarity
- Add clear guidance in agent prompts
- Leverage both systems for their intended purposes:
  - **Virtual = Agent planning workspace**
  - **Real = User's manuscript files**

**This is NOT redundancy - it's intentional dual-purpose design:**
- Virtual files let agents plan and organize (DeepAgents' strength)
- Real files let agents work with actual manuscripts (project requirement)

**Status**: Ready to implement tool renaming and prompt updates

---

**Next Action**: Rename tools and update prompts for Author Mode implementation
