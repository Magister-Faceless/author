# Agent Architecture Review: File Management, Consistency, and Progress Tracking

**Date**: 2025-10-06  
**Review Focus**: Agent/Subagent file operations, conflict prevention, and progress documentation

---

## 1. WHO WRITES TO REAL FILES?

### Current Implementation

**Both Main Agent AND Subagents have file write access:**

#### Main Agent
- **Tools**: `read_real_file`, `write_real_file`, `list_real_files`, `edit_real_file`
- **Source**: Lines 52-56 in `prompt_templates.py`

#### Subagents
- **Planning Agent**: `read_real_file`, `write_real_file`, `list_real_files` (Lines 708)
- **Writing Agent**: `read_real_file`, `write_real_file`, `edit_real_file` (Lines 715)
- **Editing Agent**: `read_real_file`, `edit_real_file` (Lines 722)

### Conflict Risk Analysis

**⚠️ HIGH RISK OF FILE CONFLICTS**

**Potential Conflict Scenarios:**

1. **Concurrent Writes**: Main agent and subagent writing to the same file simultaneously
2. **Stale Context**: Subagent reads file, main agent modifies it, subagent writes based on old content
3. **No Coordination**: No file locking or coordination mechanism between agents
4. **Parallel Subagents**: Multiple subagents can be launched concurrently (per main agent prompt line 45)

**Current Safeguards:**
- ✅ Path validation (files must be within project root)
- ✅ Read-before-edit recommendation in prompts
- ❌ No file locking mechanism
- ❌ No conflict detection
- ❌ No transaction management
- ❌ No version control integration

### Recommendations

**Option 1: Centralized File Management (Recommended for Book Writing)**
```
Main Agent ONLY writes to files
Subagents return content/recommendations
Main agent coordinates all file operations
```

**Benefits:**
- Single source of truth
- No conflicts
- Clear audit trail
- Easier to implement progress tracking

**Option 2: File Ownership Model**
```
Assign specific files to specific agents
Planning Agent → outlines/, plans/
Writing Agent → chapters/, scenes/
Editing Agent → Read-only access
Main Agent → All coordination files
```

**Option 3: Transaction-Based System**
```
Implement file locking
Add conflict detection
Use optimistic locking with version checks
```

---

## 2. SPECIFIC FILES FOR BOOK PLANNING (Story Bible)

### Current State

**❌ NO SPECIFIC FILE STRUCTURE MANDATED**

The prompts mention:
- "Managing research, notes, and world-building information" (Line 18)
- "Keep file organization clean and logical" (Line 62)
- Generic file operations

**BUT:**
- No specific file names required
- No standardized structure
- No "Story Bible" concept
- No mandatory metadata files

### Proposed Story Bible Structure

#### For Fiction Mode

**Core Story Bible Files (MUST CREATE & MAINTAIN):**

```
project_root/
├── story_bible/
│   ├── characters.md          # Character profiles, arcs, relationships
│   ├── worldbuilding.md       # World rules, magic systems, geography
│   ├── timeline.md            # Chronological events
│   ├── plot_outline.md        # Overall plot structure
│   ├── themes.md              # Thematic elements and motifs
│   ├── style_guide.md         # Voice, tone, POV rules
│   └── continuity_tracker.md  # Track details for consistency
├── planning/
│   ├── chapter_outlines/      # Individual chapter plans
│   └── scene_breakdowns/      # Scene-by-scene details
├── chapters/
│   ├── chapter_01.md
│   ├── chapter_02.md
│   └── ...
├── research/
│   └── [topic-specific research files]
└── progress/
    ├── session_log.md         # Session-by-session progress
    ├── writing_stats.md       # Word counts, completion %
    └── decisions_log.md       # Major creative decisions
```

#### For Non-Fiction Mode

```
project_root/
├── project_bible/
│   ├── thesis.md              # Central argument/purpose
│   ├── outline.md             # Book structure
│   ├── audience.md            # Target audience profile
│   ├── research_tracker.md    # Sources and citations
│   └── style_guide.md         # Writing style rules
├── chapters/
├── research/
└── progress/
```

#### For Academic Mode

```
project_root/
├── research_bible/
│   ├── research_questions.md
│   ├── methodology.md
│   ├── literature_review.md
│   ├── theoretical_framework.md
│   ├── data_sources.md
│   └── citation_tracker.md
├── chapters/
├── analysis/
└── progress/
```

### How Agentic Coding Apps Handle This

**Cascade/Windsurf/Cursor Pattern:**

1. **Project Context Files**: `.cascade/`, `.windsurf/`, `.cursor/`
   - Store project-specific rules
   - Maintain architecture decisions
   - Track dependencies

2. **Progress Tracking**: 
   - `progress.md` or `development_log.md`
   - Updated after each significant change
   - Compressed summary of work done

3. **Architecture Documents**:
   - `ARCHITECTURE.md` - System design
   - `API.md` - Interface contracts
   - `DECISIONS.md` - Why certain choices were made

4. **Consistency Mechanisms**:
   - Read all related files before making changes
   - Update all dependent files atomically
   - Use TypeScript/type systems for compile-time checks
   - Run tests to verify consistency

**Key Insight**: Coding agents maintain **multiple interconnected files** and update them **together** to maintain consistency.

### Recommended Implementation

**Add to Main Agent Prompt:**

```markdown
## Story Bible Management (CRITICAL)

You MUST create and maintain these core files:

### Fiction Projects
1. **story_bible/characters.md** - All character profiles
   - Update EVERY TIME a character detail is mentioned
   - Include: name, age, appearance, personality, arc, relationships
   
2. **story_bible/worldbuilding.md** - World rules and settings
   - Update when introducing new locations, rules, or systems
   - Maintain consistency with established facts

3. **story_bible/timeline.md** - Chronological event tracker
   - Update after writing each chapter
   - Prevent timeline inconsistencies

4. **story_bible/plot_outline.md** - Overall story structure
   - Update as plot evolves
   - Track setup/payoff relationships

5. **story_bible/continuity_tracker.md** - Detail tracking
   - Eye color, names, dates, facts
   - Reference before writing each chapter

### File Update Protocol
1. **Before writing a chapter**: Read ALL story bible files
2. **After writing a chapter**: Update relevant story bible files
3. **When user changes details**: Update story bible FIRST, then chapters
4. **Use edit_real_file**: For small updates to existing files
5. **Delegate to planning-agent**: For major story bible restructuring
```

**Add Specialized Subagent: Story Bible Manager**

```python
STORY_BIBLE_AGENT_CONFIG = {
    "name": "story-bible-agent",
    "description": "Maintains story bible files for consistency. Use when creating/updating character profiles, worldbuilding, timelines, or checking continuity.",
    "prompt": """You are the Story Bible Manager, responsible for maintaining consistency across the entire book project.

Your primary responsibilities:
1. Create and maintain story_bible/ files
2. Update character profiles when new details emerge
3. Track worldbuilding rules and ensure consistency
4. Maintain timeline accuracy
5. Flag continuity errors

When invoked:
- Read existing story bible files first
- Update relevant sections
- Flag any inconsistencies found
- Return a summary of changes made

Always maintain these files:
- characters.md
- worldbuilding.md
- timeline.md
- plot_outline.md
- continuity_tracker.md""",
    "tools": ["read_real_file", "write_real_file", "edit_real_file", "list_real_files"],
}
```

---

## 3. PROGRESS DOCUMENTATION

### Current State

**⚠️ PARTIAL IMPLEMENTATION**

**What Exists:**
- Main agent prompt mentions: "Maintain continuity by creating progress files and context notes" (Line 29)
- Generic mention of "Tracking progress across multi-session writing projects" (Line 19)

**What's Missing:**
- ❌ No specific progress file format
- ❌ No mandatory progress tracking
- ❌ No compression strategy
- ❌ No session summary mechanism
- ❌ No tool specifically for progress documentation

### How Agentic Coding Apps Do It

**Cascade/Windsurf Pattern:**

1. **Automatic Progress Logging**
   - After each significant action, update `progress.md`
   - Compress old progress into summaries
   - Keep recent progress detailed

2. **Session Summaries**
   - At end of session, create compressed summary
   - Include: what was done, why, what's next
   - Reference specific files changed

3. **Decision Logs**
   - Track WHY decisions were made
   - Prevent revisiting settled questions
   - Provide context for future work

4. **Checkpoint System**
   - Create checkpoints at milestones
   - Allow rollback if needed
   - Maintain project state snapshots

**Example Progress File Structure:**

```markdown
# Project Progress Log

## Current Session (2025-10-06)
- Created Chapter 3 outline
- Wrote opening scene (1,200 words)
- Updated character profile for Sarah (added backstory)
- Next: Write Chapter 3 confrontation scene

## Previous Sessions
### 2025-10-05
- Completed Chapter 2 (3,500 words)
- Revised Chapter 1 based on feedback
- Updated plot outline with new subplot

### 2025-10-04
- Created initial story bible
- Outlined first 5 chapters
- Established main character profiles

## Statistics
- Total words: 12,400
- Chapters completed: 2/20
- Chapters outlined: 5/20
- Target completion: 2025-12-31
```

### Recommended Implementation

**Add Progress Tracking Tool:**

```python
@tool
def update_progress_log(
    session_summary: str,
    files_modified: list[str],
    next_steps: str,
    statistics: dict = None
) -> str:
    """
    Update the project progress log with current session information.
    
    Args:
        session_summary: What was accomplished this session
        files_modified: List of files created/modified
        next_steps: What to do next
        statistics: Optional dict with word counts, completion %, etc.
    
    Returns:
        Success message
    """
    # Implementation
```

**Add to Main Agent Prompt:**

```markdown
## Progress Tracking (MANDATORY)

You MUST maintain `progress/session_log.md`:

### When to Update
1. **After completing a major task** (writing a chapter, creating outline)
2. **Before ending a conversation** (if significant work was done)
3. **When user asks "what have we done?"**

### What to Include
- Date and session number
- What was accomplished (be specific)
- Files created/modified
- Key decisions made
- Next steps
- Statistics (word count, chapters completed, etc.)

### Format
```markdown
# Session [N] - [Date]

## Accomplished
- [Specific achievement 1]
- [Specific achievement 2]

## Files Modified
- chapters/chapter_03.md (created, 1,200 words)
- story_bible/characters.md (updated Sarah's profile)

## Decisions Made
- Changed protagonist's motivation from revenge to redemption
- Moved confrontation scene to Chapter 5

## Next Steps
- Write Chapter 3 confrontation scene
- Revise Chapter 2 pacing

## Statistics
- Total words: 12,400 (+1,200)
- Chapters: 2/20 complete, 5/20 outlined
```

### Compression Strategy

**Implement Progress Compression:**

```markdown
## Recent Sessions (Detailed)
[Last 5 sessions with full details]

## Previous Work (Compressed)
### Weeks 1-2 (Oct 1-14)
- Completed story bible setup
- Wrote Chapters 1-3 (10,500 words)
- Established main characters and world rules

### Week 3 (Oct 15-21)
- Wrote Chapters 4-6 (12,000 words)
- Revised opening chapters
- Expanded worldbuilding document
```

**Add Compression Subagent:**

```python
PROGRESS_MANAGER_AGENT_CONFIG = {
    "name": "progress-manager",
    "description": "Manages and compresses progress logs. Use when progress log gets too long or when creating session summaries.",
    "prompt": """You are the Progress Manager, responsible for maintaining clean, useful progress documentation.

Your responsibilities:
1. Update session_log.md after significant work
2. Compress old progress entries when log gets long (>50 sessions)
3. Create milestone summaries
4. Generate statistics and completion reports

Compression Strategy:
- Keep last 10 sessions detailed
- Compress older sessions by week/month
- Preserve key decisions and milestones
- Maintain statistics continuity""",
    "tools": ["read_real_file", "write_real_file", "edit_real_file"],
}
```

---

## Summary of Recommendations

### 1. File Conflict Prevention
- **Implement centralized file management**: Main agent coordinates all writes
- **OR implement file ownership model**: Each agent owns specific directories
- **Add file locking mechanism**: Prevent concurrent writes
- **Add conflict detection**: Check file versions before writing

### 2. Story Bible Implementation
- **Create mandatory Story Bible structure** for each author mode
- **Add Story Bible Manager subagent** to maintain consistency
- **Update prompts** to require story bible maintenance
- **Implement update protocol**: Read before write, update after changes

### 3. Progress Documentation
- **Add `update_progress_log` tool** for structured progress tracking
- **Create Progress Manager subagent** for compression and summaries
- **Implement automatic progress updates** after major tasks
- **Add compression strategy** to keep logs manageable

### 4. Consistency Mechanisms
- **Read all related files before changes**: Like coding agents do
- **Update dependent files together**: Atomic multi-file updates
- **Create validation checks**: Verify consistency after changes
- **Implement rollback capability**: Allow undo of problematic changes

---

## Next Steps

1. **Decide on file management strategy** (centralized vs. ownership model)
2. **Design Story Bible structure** for each author mode
3. **Implement progress tracking tool** and Progress Manager subagent
4. **Update all agent prompts** with new requirements
5. **Add Story Bible Manager subagent** to subagent configs
6. **Test with real writing scenarios** to validate approach
7. **Document best practices** for users

---

## References

- `backend/prompts/prompt_templates.py` - Main agent and subagent prompts
- `backend/prompts/subagents.py` - Legacy subagent configs
- `backend/tools/file_tools.py` - File operation implementations
- `backend/services/agent_service.py` - Agent initialization and coordination
- `REFERENCES/claude_agent_sdk/subagents.md` - SDK subagent documentation
- `REFERENCES/claude_agent_sdk/todo.md` - SDK todo/progress tracking
- `AUTHOR_GUIDE/AGENT_SYSTEM_ARCHITECTURE.md` - Original architecture design
