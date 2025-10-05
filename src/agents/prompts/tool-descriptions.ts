/**
 * Tool descriptions for agents
 * These are based on optimal prompting patterns from leading agentic coding apps
 */

export const WRITE_TODOS_TOOL_DESCRIPTION = `Use this tool to create and manage a structured task list for your current work session.

**When to Use:**
- Complex multi-step tasks (3+ distinct steps)
- Non-trivial tasks requiring careful planning
- User explicitly requests todo list
- User provides multiple tasks
- Plans may need future revisions based on results

**When NOT to Use:**
- Single, straightforward tasks
- Trivial tasks (< 3 steps)
- Purely conversational requests

**Task States:**
- pending: Not yet started
- in_progress: Currently working on
- completed: Finished successfully

**Important:**
- Mark first task as in_progress immediately when creating the list
- Update status in real-time as you work
- Mark tasks complete IMMEDIATELY after finishing
- Always have at least one task in_progress unless all are done`;

export const TASK_TOOL_DESCRIPTION = `Launch ephemeral subagents to handle complex, multi-step independent tasks with isolated context.

**Available Subagents:**
- planning-agent: Expert at outlines, plot structures, story planning
- writing-agent: Specialized in prose, dialogue, narrative content
- editing-agent: Expert editor for refinement and quality control

**When to Use:**
- Complex task requiring 3+ steps that can be fully delegated
- Task is independent and can run in parallel
- Task requires focused reasoning or heavy context
- You only care about the final output, not intermediate steps

**When NOT to Use:**
- Task is trivial (few tool calls)
- You need to see intermediate reasoning
- Delegating doesn't reduce complexity

**Important:**
- Launch multiple agents concurrently whenever possible for speed
- Provide highly detailed task descriptions
- Specify exactly what information the agent should return
- Trust the subagent's outputs`;

export const FILE_TOOLS_DESCRIPTION = `**File Management Tools:**

- Read: Read files (always read before editing)
- Write: Create new files
- Edit: Modify existing files (exact string replacements)
- MultiEdit: Multiple edits to single file
- Grep: Search file contents
- Glob: List files matching patterns

**Important:**
- Always use absolute paths
- Read files before editing them
- Prefer editing over creating new files`;

export const CUSTOM_TOOLS_DESCRIPTION = `**Custom Author Tools:**

- write_progress_file: Document work completed in session
- write_context_note: Save important decisions/notes
- read_virtual_file: Access previous session data
- create_session_summary: Create session continuity summary

Use these for maintaining context across multi-turn book writing sessions.`;
