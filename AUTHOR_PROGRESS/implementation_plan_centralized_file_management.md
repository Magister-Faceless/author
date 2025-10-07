# Implementation Plan: Centralized File Management with Specialized Subagents

**Date**: 2025-10-06  
**Status**: Design Phase  
**Architecture**: Centralized file management with folder-specific subagents

---

## Architecture Overview

### Core Principles

1. **Centralized File Management**: ONLY the main agent writes/modifies files
2. **Specialized Subagents**: Each folder has a dedicated subagent for reading and analysis
3. **Context Window Optimization**: Subagents read and extract, reducing main agent context load
4. **Structured Project Layout**: Mandatory folder/file structure per book type
5. **Progress Tracking**: Dedicated tracking and compression subagents

### Agent Hierarchy

```
Main Agent (Orchestrator)
├── File Operations: write_real_file, edit_real_file (EXCLUSIVE)
├── Coordination: Spawns subagents, synthesizes recommendations
└── Decision Making: Final authority on all file modifications

Folder-Specific Subagents (Read-Only)
├── Story Bible Manager → story_bible/
├── Planning Manager → planning/
├── Chapter Manager → chapters/
├── Research Manager → research/
└── Progress Manager → progress/

Utility Subagents (Read-Only)
├── General Assistant 1, 2, 3 → Multi-file tasks
├── Tracking Agent → Progress analysis and suggestions
└── Compression Agent → Summary generation
```

---

## Phase 1: Project Structure Definition

### 1.1 Define Mandatory Structures

#### Fiction Mode Structure
```
project_root/
├── .author/                          # Project metadata (created automatically)
│   ├── project_config.json          # Project settings
│   └── agent_state.json             # Agent state persistence
│
├── story_bible/                      # MANAGED BY: story-bible-manager
│   ├── characters.md                # Character profiles, arcs, relationships
│   ├── worldbuilding.md             # World rules, magic systems, geography
│   ├── timeline.md                  # Chronological events tracker
│   ├── plot_outline.md              # Overall plot structure
│   ├── themes.md                    # Thematic elements and motifs
│   ├── style_guide.md               # Voice, tone, POV rules
│   └── continuity_tracker.md        # Detail tracking for consistency
│
├── planning/                         # MANAGED BY: planning-manager
│   ├── book_outline.md              # High-level book structure
│   ├── chapter_outlines/            # Individual chapter plans
│   │   ├── chapter_01_outline.md
│   │   ├── chapter_02_outline.md
│   │   └── ...
│   ├── scene_breakdowns/            # Scene-by-scene details
│   │   ├── chapter_01_scenes.md
│   │   └── ...
│   └── plot_threads.md              # Track multiple storylines
│
├── chapters/                         # MANAGED BY: chapter-manager
│   ├── chapter_01.md
│   ├── chapter_02.md
│   ├── chapter_03.md
│   └── ...
│
├── research/                         # MANAGED BY: research-manager
│   ├── topics/                      # Topic-specific research
│   ├── references.md                # Source materials
│   └── notes.md                     # General research notes
│
└── progress/                         # MANAGED BY: progress-manager
    ├── session_log.md               # Detailed session-by-session log
    ├── writing_stats.md             # Word counts, completion metrics
    ├── decisions_log.md             # Major creative decisions
    └── summaries/                   # Compressed historical summaries
        ├── week_01_summary.md
        ├── week_02_summary.md
        └── ...
```

#### Non-Fiction Mode Structure
```
project_root/
├── .author/
│   ├── project_config.json
│   └── agent_state.json
│
├── project_bible/                    # MANAGED BY: project-bible-manager
│   ├── thesis.md                    # Central argument/purpose
│   ├── outline.md                   # Book structure
│   ├── audience.md                  # Target audience profile
│   ├── research_tracker.md          # Sources and citations
│   ├── style_guide.md               # Writing style rules
│   └── key_concepts.md              # Core ideas and definitions
│
├── planning/                         # MANAGED BY: planning-manager
│   ├── book_outline.md
│   ├── chapter_outlines/
│   └── argument_structure.md        # Logical flow of arguments
│
├── chapters/                         # MANAGED BY: chapter-manager
│   ├── chapter_01.md
│   └── ...
│
├── research/                         # MANAGED BY: research-manager
│   ├── sources/
│   ├── data/
│   ├── citations.md
│   └── fact_checks.md
│
└── progress/                         # MANAGED BY: progress-manager
    ├── session_log.md
    ├── writing_stats.md
    └── summaries/
```

#### Academic Mode Structure
```
project_root/
├── .author/
│   ├── project_config.json
│   └── agent_state.json
│
├── research_bible/                   # MANAGED BY: research-bible-manager
│   ├── research_questions.md        # Core research questions
│   ├── methodology.md               # Research methodology
│   ├── literature_review.md         # Literature synthesis
│   ├── theoretical_framework.md     # Theoretical foundations
│   ├── data_sources.md              # Data collection details
│   └── citation_tracker.md          # Citation management
│
├── planning/                         # MANAGED BY: planning-manager
│   ├── dissertation_outline.md
│   ├── chapter_outlines/
│   └── analysis_plan.md
│
├── chapters/                         # MANAGED BY: chapter-manager
│   ├── chapter_01_introduction.md
│   ├── chapter_02_literature_review.md
│   ├── chapter_03_methodology.md
│   └── ...
│
├── analysis/                         # MANAGED BY: analysis-manager
│   ├── data_analysis/
│   ├── findings/
│   └── interpretations.md
│
├── research/                         # MANAGED BY: research-manager
│   ├── literature/
│   ├── data/
│   └── notes/
│
└── progress/                         # MANAGED BY: progress-manager
    ├── session_log.md
    ├── research_progress.md
    └── summaries/
```

### 1.2 Implementation: Project Initialization

**Create**: `backend/services/project_initializer.py`

```python
"""Project structure initialization for Author application"""

from pathlib import Path
from typing import Literal
import json
from datetime import datetime

AuthorMode = Literal['fiction', 'non-fiction', 'academic']

class ProjectInitializer:
    """Initialize project structure based on author mode"""
    
    FICTION_STRUCTURE = {
        '.author': ['project_config.json', 'agent_state.json'],
        'story_bible': [
            'characters.md',
            'worldbuilding.md',
            'timeline.md',
            'plot_outline.md',
            'themes.md',
            'style_guide.md',
            'continuity_tracker.md'
        ],
        'planning': ['book_outline.md', 'plot_threads.md'],
        'planning/chapter_outlines': [],
        'planning/scene_breakdowns': [],
        'chapters': [],
        'research': ['references.md', 'notes.md'],
        'research/topics': [],
        'progress': ['session_log.md', 'writing_stats.md', 'decisions_log.md'],
        'progress/summaries': []
    }
    
    NON_FICTION_STRUCTURE = {
        '.author': ['project_config.json', 'agent_state.json'],
        'project_bible': [
            'thesis.md',
            'outline.md',
            'audience.md',
            'research_tracker.md',
            'style_guide.md',
            'key_concepts.md'
        ],
        'planning': ['book_outline.md', 'argument_structure.md'],
        'planning/chapter_outlines': [],
        'chapters': [],
        'research': ['citations.md', 'fact_checks.md'],
        'research/sources': [],
        'research/data': [],
        'progress': ['session_log.md', 'writing_stats.md'],
        'progress/summaries': []
    }
    
    ACADEMIC_STRUCTURE = {
        '.author': ['project_config.json', 'agent_state.json'],
        'research_bible': [
            'research_questions.md',
            'methodology.md',
            'literature_review.md',
            'theoretical_framework.md',
            'data_sources.md',
            'citation_tracker.md'
        ],
        'planning': ['dissertation_outline.md', 'analysis_plan.md'],
        'planning/chapter_outlines': [],
        'chapters': [],
        'analysis': ['interpretations.md'],
        'analysis/data_analysis': [],
        'analysis/findings': [],
        'research': [],
        'research/literature': [],
        'research/data': [],
        'research/notes': [],
        'progress': ['session_log.md', 'research_progress.md'],
        'progress/summaries': []
    }
    
    # File templates
    TEMPLATES = {
        'characters.md': """# Character Profiles

## Main Characters

### [Character Name]
- **Full Name**: 
- **Age**: 
- **Appearance**: 
- **Personality**: 
- **Background**: 
- **Motivation**: 
- **Character Arc**: 
- **Relationships**: 

## Supporting Characters

## Minor Characters

---
*Last Updated: {date}*
""",
        'worldbuilding.md': """# World Building

## Setting Overview

## Geography

## Magic System / Technology

## Culture & Society

## History

## Rules & Constraints

---
*Last Updated: {date}*
""",
        'timeline.md': """# Story Timeline

## Pre-Story Events

## Story Events
### Chapter 1
- Event 1
- Event 2

---
*Last Updated: {date}*
""",
        'plot_outline.md': """# Plot Outline

## Premise

## Act 1 - Setup

## Act 2 - Confrontation

## Act 3 - Resolution

## Key Plot Points
- Inciting Incident:
- First Plot Point:
- Midpoint:
- Second Plot Point:
- Climax:
- Resolution:

---
*Last Updated: {date}*
""",
        'session_log.md': """# Project Session Log

## Current Session - {date}

### Accomplished
- 

### Files Modified
- 

### Decisions Made
- 

### Next Steps
- 

### Statistics
- Total words: 0
- Chapters completed: 0
- Progress: 0%

---

## Previous Sessions

""",
        'writing_stats.md': """# Writing Statistics

**Last Updated**: {date}

## Overall Progress
- **Total Words**: 0
- **Target Words**: 80,000
- **Progress**: 0%
- **Chapters Completed**: 0 / 20
- **Chapters Outlined**: 0 / 20

## Chapter Breakdown
| Chapter | Status | Word Count | Last Modified |
|---------|--------|------------|---------------|
| 1       | Not Started | 0 | - |

## Writing Velocity
- **Words per session**: 0
- **Average session length**: 0 min
- **Estimated completion**: TBD

---
*Auto-updated by Progress Manager*
""",
    }
    
    @classmethod
    def initialize_project(
        cls,
        project_path: Path,
        author_mode: AuthorMode,
        project_name: str,
        target_word_count: int = 80000
    ) -> dict:
        """
        Initialize project structure with all required folders and files.
        
        Args:
            project_path: Root path for the project
            author_mode: Type of book (fiction, non-fiction, academic)
            project_name: Name of the project
            target_word_count: Target word count for the book
            
        Returns:
            Dict with initialization results
        """
        project_path = Path(project_path)
        
        # Select structure based on mode
        if author_mode == 'fiction':
            structure = cls.FICTION_STRUCTURE
        elif author_mode == 'non-fiction':
            structure = cls.NON_FICTION_STRUCTURE
        else:
            structure = cls.ACADEMIC_STRUCTURE
        
        created_folders = []
        created_files = []
        
        # Create folders and files
        for folder, files in structure.items():
            folder_path = project_path / folder
            folder_path.mkdir(parents=True, exist_ok=True)
            created_folders.append(str(folder))
            
            # Create files with templates
            for file in files:
                file_path = folder_path / file
                if not file_path.exists():
                    template = cls.TEMPLATES.get(file, "")
                    content = template.format(date=datetime.now().strftime("%Y-%m-%d"))
                    file_path.write_text(content, encoding='utf-8')
                    created_files.append(str(folder / file))
        
        # Create project config
        config = {
            'project_name': project_name,
            'author_mode': author_mode,
            'created_date': datetime.now().isoformat(),
            'target_word_count': target_word_count,
            'structure_version': '1.0'
        }
        config_path = project_path / '.author' / 'project_config.json'
        config_path.write_text(json.dumps(config, indent=2), encoding='utf-8')
        
        return {
            'success': True,
            'folders_created': len(created_folders),
            'files_created': len(created_files),
            'structure': created_folders,
            'config': config
        }
```

---

## Phase 2: Subagent System Design

### 2.1 Folder-Specific Subagents

Each folder has ONE dedicated subagent responsible for:
- Listing files in their folder
- Reading files in their folder
- Analyzing content for consistency
- Extracting specific information
- Returning recommendations to main agent

**Key Design Principle**: Subagents NEVER write files. They only read and recommend.

### 2.2 Subagent Definitions

#### Story Bible Manager (Fiction)
```python
STORY_BIBLE_MANAGER = {
    "name": "story-bible-manager",
    "description": """Expert at managing story bible files for fiction projects. 
    Use when you need to:
    - Check character details for consistency
    - Verify worldbuilding rules
    - Review timeline for continuity
    - Extract plot structure information
    - Find character relationships or backstory
    
    This agent ONLY reads story_bible/ folder and returns information.""",
    
    "prompt": """You are the Story Bible Manager for a fiction writing project.

## Your Responsibilities

1. **Read and Analyze** story_bible/ files:
   - characters.md
   - worldbuilding.md
   - timeline.md
   - plot_outline.md
   - themes.md
   - style_guide.md
   - continuity_tracker.md

2. **Extract Information** requested by the main agent:
   - Character details (appearance, personality, relationships)
   - World rules and constraints
   - Timeline events
   - Plot structure
   - Established facts for continuity

3. **Check Consistency**:
   - Flag contradictions between files
   - Identify missing information
   - Verify continuity of details

4. **Return Recommendations**:
   - What information was found
   - What's missing or inconsistent
   - Suggested updates (but NEVER write files yourself)

## Your Limitations

- You can ONLY read files in story_bible/ folder
- You CANNOT write or modify any files
- You return information and recommendations to the main agent
- The main agent makes all final decisions and file modifications

## Response Format

Always structure your response as:

**Information Found:**
[List the relevant information extracted]

**Consistency Check:**
[Any contradictions or issues found]

**Recommendations:**
[Suggested updates or additions]

**Files Reviewed:**
[List which files you read]

Be thorough but concise. Focus on what the main agent needs.""",
    
    "tools": ["read_real_file", "list_real_files"]
}
```

#### Planning Manager
```python
PLANNING_MANAGER = {
    "name": "planning-manager",
    "description": """Expert at managing planning files (outlines, chapter plans, scene breakdowns).
    Use when you need to:
    - Review chapter outlines
    - Check scene breakdowns
    - Verify plot thread consistency
    - Extract planning information
    
    This agent ONLY reads planning/ folder and returns information.""",
    
    "prompt": """You are the Planning Manager for the writing project.

## Your Responsibilities

1. **Read and Analyze** planning/ files:
   - book_outline.md
   - chapter_outlines/
   - scene_breakdowns/
   - plot_threads.md (fiction)
   - argument_structure.md (non-fiction)

2. **Extract Planning Information**:
   - Chapter structures and purposes
   - Scene sequences and beats
   - Plot thread progressions
   - Pacing notes

3. **Verify Consistency**:
   - Check if outlines match actual chapters
   - Identify gaps in planning
   - Flag outdated plans

4. **Return Recommendations**:
   - Current planning status
   - What needs updating
   - Suggested outline improvements

## Your Limitations

- You can ONLY read files in planning/ folder
- You CANNOT write or modify any files
- You return information and recommendations only

## Response Format

**Planning Information:**
[Relevant outline/planning details]

**Status Check:**
[Are plans up to date? Any gaps?]

**Recommendations:**
[Suggested planning updates]

**Files Reviewed:**
[List which files you read]""",
    
    "tools": ["read_real_file", "list_real_files"]
}
```

#### Chapter Manager
```python
CHAPTER_MANAGER = {
    "name": "chapter-manager",
    "description": """Expert at managing chapter files and tracking writing progress.
    Use when you need to:
    - Review existing chapters
    - Check chapter word counts
    - Verify chapter consistency
    - Extract chapter content
    
    This agent ONLY reads chapters/ folder and returns information.""",
    
    "prompt": """You are the Chapter Manager for the writing project.

## Your Responsibilities

1. **Read and Analyze** chapters/ files:
   - List all chapter files
   - Read specific chapters as requested
   - Count words and analyze structure
   - Check for continuity issues

2. **Extract Chapter Information**:
   - Chapter content and summaries
   - Word counts and statistics
   - Character appearances
   - Plot events covered

3. **Verify Consistency**:
   - Check if chapters match outlines
   - Identify continuity errors
   - Flag incomplete chapters

4. **Return Recommendations**:
   - Chapter status and statistics
   - Consistency issues found
   - Suggested revisions

## Your Limitations

- You can ONLY read files in chapters/ folder
- You CANNOT write or modify any files
- You return information and recommendations only

## Response Format

**Chapter Information:**
[Content summary, word counts, key events]

**Consistency Check:**
[Any issues with continuity or outline matching]

**Statistics:**
[Word counts, completion status]

**Recommendations:**
[Suggested improvements or fixes]

**Files Reviewed:**
[List which chapters you read]""",
    
    "tools": ["read_real_file", "list_real_files"]
}
```

#### Research Manager
```python
RESEARCH_MANAGER = {
    "name": "research-manager",
    "description": """Expert at managing research files and reference materials.
    Use when you need to:
    - Find research information
    - Check citations and sources
    - Review reference materials
    - Extract research notes
    
    This agent ONLY reads research/ folder and returns information.""",
    
    "prompt": """You are the Research Manager for the writing project.

## Your Responsibilities

1. **Read and Analyze** research/ files:
   - All research notes and materials
   - Citations and references
   - Topic-specific research
   - Data and sources

2. **Extract Research Information**:
   - Relevant facts and data
   - Source citations
   - Research summaries
   - Supporting evidence

3. **Organize Information**:
   - Categorize research by topic
   - Identify gaps in research
   - Flag outdated information

4. **Return Recommendations**:
   - Relevant research findings
   - Additional research needed
   - Citation information

## Your Limitations

- You can ONLY read files in research/ folder
- You CANNOT write or modify any files
- You return information and recommendations only

## Response Format

**Research Findings:**
[Relevant information extracted]

**Sources:**
[Citations and references]

**Gaps Identified:**
[What additional research is needed]

**Recommendations:**
[How to use this research]

**Files Reviewed:**
[List which research files you read]""",
    
    "tools": ["read_real_file", "list_real_files"]
}
```

#### Progress Manager
```python
PROGRESS_MANAGER = {
    "name": "progress-manager",
    "description": """Expert at managing progress tracking files.
    Use when you need to:
    - Review session logs
    - Check writing statistics
    - Analyze progress trends
    - Determine if compression is needed
    
    This agent ONLY reads progress/ folder and returns information.""",
    
    "prompt": """You are the Progress Manager for the writing project.

## Your Responsibilities

1. **Read and Analyze** progress/ files:
   - session_log.md
   - writing_stats.md
   - decisions_log.md
   - summaries/ folder

2. **Extract Progress Information**:
   - Recent session activities
   - Writing statistics and trends
   - Major decisions made
   - Completion percentages

3. **Analyze Trends**:
   - Writing velocity
   - Progress patterns
   - Bottlenecks or issues

4. **Determine Compression Needs**:
   - Check if session_log is too long (>50 sessions)
   - Identify sessions that can be compressed
   - Suggest summary creation

5. **Return Recommendations**:
   - Current progress status
   - When to create summaries
   - What to track next

## Your Limitations

- You can ONLY read files in progress/ folder
- You CANNOT write or modify any files
- You return information and recommendations only

## Response Format

**Progress Summary:**
[Recent activities and statistics]

**Trends:**
[Writing velocity, patterns observed]

**Compression Recommendation:**
[Should we compress old sessions? Which ones?]

**Next Steps:**
[What to track or update next]

**Files Reviewed:**
[List which progress files you read]""",
    
    "tools": ["read_real_file", "list_real_files"]
}
```

### 2.3 General Purpose Subagents

For tasks requiring reading multiple files across folders:

```python
GENERAL_ASSISTANT_1 = {
    "name": "general-assistant-1",
    "description": """General purpose assistant for multi-file reading tasks.
    Use when a task requires reading files from multiple folders.
    The main agent must specify EXACTLY which files to read.""",
    
    "prompt": """You are General Assistant 1, a flexible helper for multi-file tasks.

## Your Role

The main agent will give you SPECIFIC files to read and SPECIFIC information to extract.

Follow these steps:
1. Read ONLY the files specified by the main agent
2. Extract ONLY the information requested
3. Return findings in a clear, structured format
4. Do NOT read additional files unless explicitly told to

## Your Limitations

- You can read files from any folder
- You CANNOT write or modify any files
- You must follow main agent's instructions precisely
- Keep your context focused on the assigned task

## Response Format

**Task Assigned:**
[Repeat what the main agent asked you to do]

**Files Read:**
[List files you read]

**Information Extracted:**
[The specific information requested]

**Additional Notes:**
[Any relevant observations]

Be efficient and focused. Don't read more than necessary.""",
    
    "tools": ["read_real_file", "list_real_files"]
}

# Create GENERAL_ASSISTANT_2 and GENERAL_ASSISTANT_3 with identical configs
```

### 2.4 Tracking Agent

Specialized agent for progress analysis:

```python
TRACKING_AGENT = {
    "name": "tracking-agent",
    "description": """Specialized agent for analyzing progress and suggesting tracking updates.
    Use when you need to:
    - Analyze current progress
    - Determine what to log
    - Suggest when to create summaries
    - Calculate statistics
    
    This agent reads progress files and provides tracking recommendations.""",
    
    "prompt": """You are the Tracking Agent, specialized in progress analysis.

## Your Responsibilities

1. **Analyze Progress Files**:
   - Read session_log.md
   - Read writing_stats.md
   - Read decisions_log.md
   - Review recent summaries

2. **Calculate Statistics**:
   - Total word count
   - Words written this session
   - Chapters completed
   - Progress percentage
   - Writing velocity

3. **Suggest Log Entries**:
   - What should be logged for this session
   - How to format the entry
   - What statistics to update

4. **Recommend Summaries**:
   - When session log is too long (>50 entries)
   - Which sessions to compress
   - What summary period to use (weekly/monthly)

5. **Return Recommendations**:
   - Suggested session log entry
   - Updated statistics
   - Whether compression is needed

## Your Limitations

- You can read files from any folder to gather statistics
- You CANNOT write or modify any files
- You provide recommendations; main agent writes

## Response Format

**Current Statistics:**
- Total words: [number]
- Session words: [number]
- Chapters completed: [number]
- Progress: [percentage]

**Suggested Session Entry:**
```markdown
# Session [N] - [Date]

## Accomplished
- [Item 1]
- [Item 2]

## Files Modified
- [file path] (created/modified, [word count])

## Decisions Made
- [Decision 1]

## Next Steps
- [Step 1]

## Statistics
- Total words: [number] (+[change])
- Chapters: [completed]/[total]
```

**Compression Recommendation:**
[Yes/No - If yes, which sessions and why]

**Files Reviewed:**
[List files you read for analysis]""",
    
    "tools": ["read_real_file", "list_real_files"]
}
```

### 2.5 Compression Agent

Specialized agent for creating summaries:

```python
COMPRESSION_AGENT = {
    "name": "compression-agent",
    "description": """Specialized agent for compressing old progress entries into summaries.
    Use when session log is too long and needs compression.
    
    This agent reads multiple sessions and creates compressed summaries.""",
    
    "prompt": """You are the Compression Agent, specialized in creating progress summaries.

## Your Responsibilities

1. **Read Sessions to Compress**:
   - Read specified range of sessions from session_log.md
   - Read related files to verify information
   - Identify key accomplishments and decisions

2. **Create Compressed Summary**:
   - Group sessions by time period (week/month)
   - Preserve important decisions and milestones
   - Maintain statistics continuity
   - Discard redundant details

3. **Cross-Check Information**:
   - Verify word counts with writing_stats.md
   - Check decisions against decisions_log.md
   - Ensure no critical information is lost

4. **Return Summary**:
   - Compressed summary text
   - List of sessions compressed
   - Key milestones preserved

## Compression Guidelines

**Keep:**
- Major accomplishments (chapters completed, outlines created)
- Important decisions and why they were made
- Significant statistics and milestones
- Problems encountered and solutions

**Discard:**
- Routine activities (read file X, wrote to file Y)
- Redundant information
- Overly detailed step-by-step logs
- Minor edits and tweaks

## Your Limitations

- You can read files from any folder for verification
- You CANNOT write or modify any files
- You provide summary text; main agent writes it

## Response Format

**Sessions Analyzed:**
[List session numbers/dates reviewed]

**Compressed Summary:**
```markdown
## [Time Period] Summary

### Major Accomplishments
- [Key achievement 1]
- [Key achievement 2]

### Chapters Completed
- Chapter X: [title] ([word count] words)
- Chapter Y: [title] ([word count] words)

### Important Decisions
- [Decision 1]: [Rationale]
- [Decision 2]: [Rationale]

### Statistics
- Words written: [total for period]
- Chapters completed: [number]
- Progress: [start %] → [end %]

### Challenges & Solutions
- [Challenge]: [How it was resolved]
```

**Verification:**
[Confirmed statistics match writing_stats.md: Yes/No]

**Files Reviewed:**
[List files read for verification]""",
    
    "tools": ["read_real_file", "list_real_files"]
}
```

---

## Phase 3: Main Agent Modifications

### 3.1 Update Main Agent Prompt

**Key Additions:**

1. **File Operation Authority**
```markdown
## File Operations (EXCLUSIVE AUTHORITY)

You are the ONLY agent that can write or modify files. This is critical for preventing conflicts.

### Your File Tools
- **write_real_file**: Create new files
- **edit_real_file**: Modify existing files
- **read_real_file**: Read files (but prefer delegating to subagents)
- **list_real_files**: List files (but prefer delegating to subagents)

### Subagent Coordination
- Subagents can ONLY read and list files
- Subagents return recommendations and information
- YOU make all final decisions about file modifications
- YOU write all file changes based on subagent recommendations
```

2. **Project Structure Management**
```markdown
## Project Structure (MANDATORY)

When starting a new project, you MUST initialize the proper structure:

### Fiction Projects
- story_bible/ (7 required files)
- planning/ (outlines and breakdowns)
- chapters/ (actual content)
- research/ (reference materials)
- progress/ (tracking and logs)

### Non-Fiction Projects
- project_bible/ (6 required files)
- planning/ (structure and arguments)
- chapters/ (actual content)
- research/ (sources and data)
- progress/ (tracking and logs)

### Academic Projects
- research_bible/ (6 required files)
- planning/ (dissertation structure)
- chapters/ (dissertation chapters)
- analysis/ (data analysis)
- research/ (literature and data)
- progress/ (research tracking)

Use the project initialization service to create this structure automatically.
```

3. **Subagent Delegation Protocol**
```markdown
## Subagent Delegation Protocol

### When to Use Folder-Specific Subagents

**Story Bible Manager** (story_bible/)
- When you need character details
- When checking worldbuilding consistency
- When verifying timeline
- When extracting plot structure

**Planning Manager** (planning/)
- When reviewing outlines
- When checking scene breakdowns
- When verifying plot threads

**Chapter Manager** (chapters/)
- When reviewing existing chapters
- When checking word counts
- When verifying chapter consistency

**Research Manager** (research/)
- When finding research information
- When checking citations
- When reviewing reference materials

**Progress Manager** (progress/)
- When reviewing session history
- When checking statistics
- When determining if compression is needed

### When to Use General Assistants

Use general-assistant-1, general-assistant-2, or general-assistant-3 when:
- Task requires reading files from multiple folders
- Single subagent would need to read >3 files
- Context window optimization is needed

**IMPORTANT**: Before spawning general assistants:
1. List the files you need
2. Divide files among assistants (max 3 files each)
3. Give each assistant SPECIFIC files and SPECIFIC extraction tasks
4. Synthesize their findings

### When to Use Tracking Agent

Use tracking-agent when:
- You need to log progress for this session
- You want to update statistics
- You need to determine if compression is needed
- You want to analyze writing trends

### When to Use Compression Agent

Use compression-agent when:
- Session log has >50 entries
- Tracking agent recommends compression
- You need to create weekly/monthly summaries

### Delegation Best Practices

1. **Be Specific**: Tell subagents exactly what files to read and what to extract
2. **Optimize Context**: Don't have one subagent read 10 files; use multiple assistants
3. **Synthesize Results**: Combine subagent findings into coherent recommendations
4. **Make Decisions**: You decide what to write based on subagent input
5. **Write Files**: You perform all file write operations
```

4. **Progress Tracking Protocol**
```markdown
## Progress Tracking (MANDATORY)

### After Every Significant Task

1. **Spawn tracking-agent**:
   - Ask it to analyze current progress
   - Request suggested session log entry
   - Get updated statistics

2. **Review tracking-agent's recommendation**:
   - Verify the suggested entry is accurate
   - Add any additional context
   - Confirm statistics are correct

3. **Write to progress files**:
   - Update session_log.md with new entry
   - Update writing_stats.md with new statistics
   - Update decisions_log.md if major decisions were made

### When Session Log Gets Long

1. **Spawn tracking-agent** to check if compression is needed
2. If yes, **spawn compression-agent**:
   - Specify which sessions to compress
   - Request summary for specific time period
3. **Review compression-agent's summary**
4. **Write summary** to progress/summaries/[period]_summary.md
5. **Update session_log.md** to remove compressed entries and add reference to summary

### Statistics to Track

- Total word count
- Words written this session
- Chapters completed / total chapters
- Chapters outlined / total chapters
- Progress percentage
- Writing velocity (words per session)
- Session count
```

### 3.2 Implementation: Updated Main Agent Prompt File

**Modify**: `backend/prompts/prompt_templates.py`

Add the new sections to each mode's main agent prompt (FICTION_MAIN_AGENT, NON_FICTION_MAIN_AGENT, ACADEMIC_MAIN_AGENT).

---

## Phase 4: Progress Tracking Tool Implementation

### 4.1 Create Progress Tracking Tool

**Create**: `backend/tools/progress_tools.py`

```python
"""Progress tracking tools for the Author application"""

from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List
from langchain_core.tools import tool


def create_progress_tools(project_path: str):
    """
    Create progress tracking tools scoped to a specific project.
    
    Args:
        project_path: Absolute path to the project directory
        
    Returns:
        List of progress tracking tool functions
    """
    project_root = Path(project_path).resolve()
    progress_dir = project_root / 'progress'
    
    @tool
    def update_progress_log(
        session_summary: str,
        files_modified: List[str],
        next_steps: str,
        decisions_made: Optional[List[str]] = None,
        statistics: Optional[Dict[str, any]] = None
    ) -> str:
        """
        Update the project progress log with current session information.
        
        This tool helps maintain a detailed record of work done during each session.
        
        Args:
            session_summary: What was accomplished this session (be specific)
            files_modified: List of files created/modified with details
                           Format: ["chapters/chapter_01.md (created, 1200 words)", ...]
            next_steps: What to do next session
            decisions_made: Optional list of major decisions made
            statistics: Optional dict with keys:
                       - total_words: int
                       - session_words: int
                       - chapters_completed: int
                       - chapters_total: int
                       - chapters_outlined: int
                       - progress_percentage: float
        
        Returns:
            Success message with session number
        """
        try:
            session_log_path = progress_dir / 'session_log.md'
            
            # Read existing log to get session count
            if session_log_path.exists():
                content = session_log_path.read_text(encoding='utf-8')
                # Count existing sessions
                session_count = content.count('## Session ') + 1
            else:
                session_count = 1
                content = "# Project Session Log\n\n"
            
            # Format new session entry
            date_str = datetime.now().strftime("%Y-%m-%d %H:%M")
            
            entry = f"\n## Session {session_count} - {date_str}\n\n"
            entry += "### Accomplished\n"
            for line in session_summary.split('\n'):
                if line.strip():
                    entry += f"- {line.strip()}\n"
            
            entry += "\n### Files Modified\n"
            for file in files_modified:
                entry += f"- {file}\n"
            
            if decisions_made:
                entry += "\n### Decisions Made\n"
                for decision in decisions_made:
                    entry += f"- {decision}\n"
            
            entry += "\n### Next Steps\n"
            for line in next_steps.split('\n'):
                if line.strip():
                    entry += f"- {line.strip()}\n"
            
            if statistics:
                entry += "\n### Statistics\n"
                total = statistics.get('total_words', 0)
                session = statistics.get('session_words', 0)
                completed = statistics.get('chapters_completed', 0)
                total_chapters = statistics.get('chapters_total', 0)
                outlined = statistics.get('chapters_outlined', 0)
                progress = statistics.get('progress_percentage', 0)
                
                entry += f"- Total words: {total:,} (+{session:,})\n"
                entry += f"- Chapters: {completed}/{total_chapters} completed, {outlined}/{total_chapters} outlined\n"
                entry += f"- Progress: {progress:.1f}%\n"
            
            entry += "\n---\n"
            
            # Insert new entry after header
            if "## Session " in content:
                # Insert before first session
                parts = content.split("## Session ", 1)
                new_content = parts[0] + entry.lstrip('\n') + "## Session " + parts[1]
            else:
                # First session
                new_content = content + entry
            
            # Write updated log
            session_log_path.write_text(new_content, encoding='utf-8')
            
            return f"Successfully logged Session {session_count} to progress/session_log.md"
            
        except Exception as e:
            return f"Error updating progress log: {str(e)}"
    
    @tool
    def update_writing_stats(
        total_words: int,
        chapters_completed: int,
        chapters_total: int,
        chapters_outlined: int,
        target_words: int = 80000
    ) -> str:
        """
        Update the writing statistics file with current progress metrics.
        
        Args:
            total_words: Total word count across all chapters
            chapters_completed: Number of completed chapters
            chapters_total: Total number of planned chapters
            chapters_outlined: Number of chapters with outlines
            target_words: Target word count for the book (default: 80000)
        
        Returns:
            Success message with updated statistics
        """
        try:
            stats_path = progress_dir / 'writing_stats.md'
            date_str = datetime.now().strftime("%Y-%m-%d %H:%M")
            
            progress_pct = (total_words / target_words * 100) if target_words > 0 else 0
            
            content = f"""# Writing Statistics

**Last Updated**: {date_str}

## Overall Progress
- **Total Words**: {total_words:,}
- **Target Words**: {target_words:,}
- **Progress**: {progress_pct:.1f}%
- **Chapters Completed**: {chapters_completed} / {chapters_total}
- **Chapters Outlined**: {chapters_outlined} / {chapters_total}

## Status
- **Completion Rate**: {(chapters_completed / chapters_total * 100) if chapters_total > 0 else 0:.1f}%
- **Outline Rate**: {(chapters_outlined / chapters_total * 100) if chapters_total > 0 else 0:.1f}%
- **Average Chapter Length**: {(total_words / chapters_completed) if chapters_completed > 0 else 0:.0f} words

---
*Auto-updated by Main Agent via Tracking Agent recommendations*
"""
            
            stats_path.write_text(content, encoding='utf-8')
            
            return f"Successfully updated writing statistics: {total_words:,} words, {chapters_completed}/{chapters_total} chapters"
            
        except Exception as e:
            return f"Error updating writing stats: {str(e)}"
    
    @tool
    def log_decision(
        decision: str,
        rationale: str,
        impact: str
    ) -> str:
        """
        Log a major creative or structural decision to the decisions log.
        
        Use this for important decisions that affect the project direction.
        
        Args:
            decision: The decision that was made
            rationale: Why this decision was made
            impact: What this decision affects
        
        Returns:
            Success message
        """
        try:
            decisions_path = progress_dir / 'decisions_log.md'
            date_str = datetime.now().strftime("%Y-%m-%d %H:%M")
            
            # Read existing content
            if decisions_path.exists():
                content = decisions_path.read_text(encoding='utf-8')
            else:
                content = "# Major Decisions Log\n\n"
            
            # Add new decision
            entry = f"\n## {date_str}\n\n"
            entry += f"**Decision**: {decision}\n\n"
            entry += f"**Rationale**: {rationale}\n\n"
            entry += f"**Impact**: {impact}\n\n"
            entry += "---\n"
            
            # Append to log
            content += entry
            decisions_path.write_text(content, encoding='utf-8')
            
            return f"Successfully logged decision to progress/decisions_log.md"
            
        except Exception as e:
            return f"Error logging decision: {str(e)}"
    
    @tool
    def create_progress_summary(
        period: str,
        summary_content: str
    ) -> str:
        """
        Create a compressed summary of progress for a specific time period.
        
        Use this when session log gets too long and needs compression.
        
        Args:
            period: Time period identifier (e.g., "week_01", "month_01", "2025-10-01_to_2025-10-07")
            summary_content: The compressed summary content (in markdown format)
        
        Returns:
            Success message with summary file path
        """
        try:
            summaries_dir = progress_dir / 'summaries'
            summaries_dir.mkdir(exist_ok=True)
            
            summary_path = summaries_dir / f"{period}_summary.md"
            summary_path.write_text(summary_content, encoding='utf-8')
            
            return f"Successfully created summary: progress/summaries/{period}_summary.md"
            
        except Exception as e:
            return f"Error creating summary: {str(e)}"
    
    return [
        update_progress_log,
        update_writing_stats,
        log_decision,
        create_progress_summary
    ]
```

### 4.2 Integrate Progress Tools into Agent Service

**Modify**: `backend/services/agent_service.py`

```python
# Add import
from tools.progress_tools import create_progress_tools

# In _initialize_agent method, after creating file_tools:
def _initialize_agent(self):
    # Create file tools scoped to project
    file_tools = create_file_tools(str(self.project_path))
    
    # Create progress tracking tools
    progress_tools = create_progress_tools(str(self.project_path))
    
    # Combine all tools
    all_tools = file_tools + progress_tools
    
    # Create tool name mapping
    tool_map = {tool.name: tool for tool in all_tools}
    
    # ... rest of initialization
```

---

## Phase 5: Tool Access Configuration

### 5.1 Define Tool Access by Agent Type

```python
# In prompt_templates.py, update get_subagent_configs function:

def get_subagent_configs(mode='fiction'):
    """Get all subagent configurations for the specified mode."""
    
    # Determine bible folder name based on mode
    if mode == 'fiction':
        bible_name = 'story_bible'
        bible_manager_name = 'story-bible-manager'
    elif mode == 'non-fiction':
        bible_name = 'project_bible'
        bible_manager_name = 'project-bible-manager'
    else:  # academic
        bible_name = 'research_bible'
        bible_manager_name = 'research-bible-manager'
    
    # Folder-specific subagents (READ-ONLY)
    bible_manager = {
        "name": bible_manager_name,
        "description": f"Manages {bible_name}/ files. Use for consistency checks and information extraction.",
        "prompt": get_bible_manager_prompt(mode),
        "tools": ["read_real_file", "list_real_files"],
    }
    
    planning_manager = {
        "name": "planning-manager",
        "description": "Manages planning/ files. Use for outline reviews and planning information.",
        "prompt": PLANNING_MANAGER_PROMPT,
        "tools": ["read_real_file", "list_real_files"],
    }
    
    chapter_manager = {
        "name": "chapter-manager",
        "description": "Manages chapters/ files. Use for chapter reviews and statistics.",
        "prompt": CHAPTER_MANAGER_PROMPT,
        "tools": ["read_real_file", "list_real_files"],
    }
    
    research_manager = {
        "name": "research-manager",
        "description": "Manages research/ files. Use for research information and citations.",
        "prompt": RESEARCH_MANAGER_PROMPT,
        "tools": ["read_real_file", "list_real_files"],
    }
    
    progress_manager = {
        "name": "progress-manager",
        "description": "Manages progress/ files. Use for progress reviews and statistics.",
        "prompt": PROGRESS_MANAGER_PROMPT,
        "tools": ["read_real_file", "list_real_files"],
    }
    
    # General purpose assistants (READ-ONLY, any folder)
    general_assistant_1 = {
        "name": "general-assistant-1",
        "description": "General purpose assistant for multi-file reading tasks.",
        "prompt": GENERAL_ASSISTANT_PROMPT,
        "tools": ["read_real_file", "list_real_files"],
    }
    
    general_assistant_2 = {
        "name": "general-assistant-2",
        "description": "General purpose assistant for multi-file reading tasks.",
        "prompt": GENERAL_ASSISTANT_PROMPT,
        "tools": ["read_real_file", "list_real_files"],
    }
    
    general_assistant_3 = {
        "name": "general-assistant-3",
        "description": "General purpose assistant for multi-file reading tasks.",
        "prompt": GENERAL_ASSISTANT_PROMPT,
        "tools": ["read_real_file", "list_real_files"],
    }
    
    # Specialized utility agents (READ-ONLY, any folder)
    tracking_agent = {
        "name": "tracking-agent",
        "description": "Analyzes progress and suggests tracking updates.",
        "prompt": TRACKING_AGENT_PROMPT,
        "tools": ["read_real_file", "list_real_files"],
    }
    
    compression_agent = {
        "name": "compression-agent",
        "description": "Creates compressed summaries of old progress entries.",
        "prompt": COMPRESSION_AGENT_PROMPT,
        "tools": ["read_real_file", "list_real_files"],
    }
    
    # Return all subagents
    return [
        bible_manager,
        planning_manager,
        chapter_manager,
        research_manager,
        progress_manager,
        general_assistant_1,
        general_assistant_2,
        general_assistant_3,
        tracking_agent,
        compression_agent,
    ]
```

### 5.2 Main Agent Tool Access

Main agent gets ALL tools:
- `read_real_file` (but should delegate to subagents)
- `write_real_file` (EXCLUSIVE)
- `edit_real_file` (EXCLUSIVE)
- `list_real_files` (but should delegate to subagents)
- `update_progress_log` (EXCLUSIVE)
- `update_writing_stats` (EXCLUSIVE)
- `log_decision` (EXCLUSIVE)
- `create_progress_summary` (EXCLUSIVE)

---

## Phase 6: Implementation Roadmap

### Step 1: Project Structure Setup (Week 1)
- [ ] Create `backend/services/project_initializer.py`
- [ ] Implement structure definitions for all three modes
- [ ] Create file templates for all required files
- [ ] Add initialization endpoint to API
- [ ] Test project initialization for each mode

### Step 2: Progress Tools Implementation (Week 1)
- [ ] Create `backend/tools/progress_tools.py`
- [ ] Implement `update_progress_log` tool
- [ ] Implement `update_writing_stats` tool
- [ ] Implement `log_decision` tool
- [ ] Implement `create_progress_summary` tool
- [ ] Test all progress tools

### Step 3: Subagent Prompt Creation (Week 2)
- [ ] Write Story Bible Manager prompt (fiction)
- [ ] Write Project Bible Manager prompt (non-fiction)
- [ ] Write Research Bible Manager prompt (academic)
- [ ] Write Planning Manager prompt
- [ ] Write Chapter Manager prompt
- [ ] Write Research Manager prompt
- [ ] Write Progress Manager prompt
- [ ] Write General Assistant prompt
- [ ] Write Tracking Agent prompt
- [ ] Write Compression Agent prompt
- [ ] Add all prompts to `prompt_templates.py`

### Step 4: Main Agent Prompt Updates (Week 2)
- [ ] Add "File Operations (EXCLUSIVE AUTHORITY)" section
- [ ] Add "Project Structure (MANDATORY)" section
- [ ] Add "Subagent Delegation Protocol" section
- [ ] Add "Progress Tracking (MANDATORY)" section
- [ ] Update for Fiction mode
- [ ] Update for Non-Fiction mode
- [ ] Update for Academic mode
- [ ] Test prompt clarity and completeness

### Step 5: Subagent Configuration (Week 3)
- [ ] Update `get_subagent_configs()` function
- [ ] Configure tool access for each subagent type
- [ ] Implement mode-specific bible manager selection
- [ ] Test subagent initialization
- [ ] Verify tool restrictions work correctly

### Step 6: Agent Service Integration (Week 3)
- [ ] Integrate progress tools into agent service
- [ ] Update tool mapping to include progress tools
- [ ] Ensure main agent gets all tools
- [ ] Ensure subagents get only read tools
- [ ] Test agent initialization with new tools

### Step 7: Testing & Validation (Week 4)
- [ ] Test project initialization
- [ ] Test file write operations (main agent only)
- [ ] Test subagent read operations
- [ ] Test subagent recommendations
- [ ] Test progress tracking workflow
- [ ] Test compression workflow
- [ ] Test multi-subagent coordination
- [ ] Test context window optimization

### Step 8: Documentation (Week 4)
- [ ] Document project structure requirements
- [ ] Document subagent delegation patterns
- [ ] Document progress tracking workflow
- [ ] Create user guide for new system
- [ ] Create developer guide for maintenance

---

## Phase 7: Testing Strategy

### 7.1 Unit Tests

**Test Project Initialization:**
```python
def test_fiction_project_initialization():
    """Test that fiction project structure is created correctly"""
    # Initialize project
    # Verify all folders exist
    # Verify all required files exist
    # Verify file templates are correct

def test_nonfiction_project_initialization():
    """Test that non-fiction project structure is created correctly"""
    # Similar to above

def test_academic_project_initialization():
    """Test that academic project structure is created correctly"""
    # Similar to above
```

**Test Progress Tools:**
```python
def test_update_progress_log():
    """Test progress log updates correctly"""
    # Create test project
    # Call update_progress_log
    # Verify entry is added
    # Verify formatting is correct

def test_update_writing_stats():
    """Test writing stats updates correctly"""
    # Create test project
    # Call update_writing_stats
    # Verify statistics are calculated correctly

def test_create_progress_summary():
    """Test summary creation"""
    # Create test project with sessions
    # Call create_progress_summary
    # Verify summary file is created
```

**Test Tool Access Restrictions:**
```python
def test_main_agent_has_write_access():
    """Test that main agent can write files"""
    # Initialize main agent
    # Verify write_real_file is available
    # Verify edit_real_file is available

def test_subagent_no_write_access():
    """Test that subagents cannot write files"""
    # Initialize subagent
    # Verify write_real_file is NOT available
    # Verify edit_real_file is NOT available
    # Verify read_real_file IS available
```

### 7.2 Integration Tests

**Test Subagent Coordination:**
```python
def test_story_bible_manager_reads_and_recommends():
    """Test story bible manager workflow"""
    # Create fiction project
    # Spawn story-bible-manager
    # Request character information
    # Verify subagent reads correct files
    # Verify subagent returns recommendations
    # Verify main agent can write based on recommendations

def test_multiple_general_assistants():
    """Test multiple general assistants working in parallel"""
    # Create project with multiple files
    # Spawn 3 general assistants
    # Assign different files to each
    # Verify each reads only assigned files
    # Verify main agent can synthesize results
```

**Test Progress Tracking Workflow:**
```python
def test_full_progress_tracking_workflow():
    """Test complete progress tracking flow"""
    # Create project
    # Perform some writing tasks
    # Spawn tracking-agent
    # Verify tracking-agent analyzes progress
    # Verify tracking-agent suggests log entry
    # Main agent writes log entry
    # Verify log is updated correctly

def test_compression_workflow():
    """Test progress compression flow"""
    # Create project with 50+ sessions
    # Spawn tracking-agent to check compression need
    # Spawn compression-agent
    # Verify compression-agent creates summary
    # Main agent writes summary
    # Verify old sessions are compressed
```

### 7.3 End-to-End Tests

**Test Complete Writing Session:**
```python
def test_complete_fiction_writing_session():
    """Test a complete fiction writing session"""
    # 1. Initialize fiction project
    # 2. User asks to create character profile
    # 3. Main agent spawns story-bible-manager to check existing characters
    # 4. Main agent writes new character to story_bible/characters.md
    # 5. User asks to write chapter 1
    # 6. Main agent spawns planning-manager to get outline
    # 7. Main agent writes chapter to chapters/chapter_01.md
    # 8. Main agent spawns tracking-agent for progress update
    # 9. Main agent updates progress files
    # 10. Verify all files are correct
    # 11. Verify no file conflicts occurred
```

---

## Phase 8: Improvements & Considerations

### 8.1 Suggested Improvements

**1. File Locking Mechanism**
- Implement optimistic locking with file version tracking
- Add `.author/file_versions.json` to track file modifications
- Main agent checks version before writing
- Prevents race conditions if multiple sessions are somehow active

**2. Undo/Rollback System**
- Keep last N versions of each file in `.author/backups/`
- Allow main agent to rollback changes if needed
- Useful for experimental writing that doesn't work out

**3. Consistency Validation**
- Add validation tool that checks consistency across files
- Main agent can run validation after major changes
- Flags contradictions between story bible and chapters

**4. Smart Context Loading**
- Main agent loads only relevant context before tasks
- Uses subagents to pre-filter information
- Reduces main agent context window usage

**5. Session State Persistence**
- Save agent state between sessions in `.author/agent_state.json`
- Remember what was being worked on
- Resume seamlessly in next session

**6. Automated Statistics Calculation**
- Background process that updates writing_stats.md
- Counts words in all chapters automatically
- Main agent just needs to trigger update

**7. Search and Reference Tool**
- Add tool to search across all project files
- Main agent can quickly find information
- Reduces need to spawn multiple subagents

**8. Template System for New Files**
- Define templates for common file types
- Main agent uses templates when creating new files
- Ensures consistency in file structure

### 8.2 Performance Optimizations

**1. Subagent Result Caching**
- Cache subagent results for frequently accessed files
- Invalidate cache when files are modified
- Reduces redundant file reads

**2. Parallel Subagent Execution**
- Ensure subagents can truly run in parallel
- Use async/await properly
- Maximize throughput for multi-file tasks

**3. Incremental File Updates**
- Use `edit_real_file` for small changes
- Avoid rewriting entire files when possible
- Faster and more efficient

**4. Lazy Loading**
- Don't load all subagent prompts at initialization
- Load only when needed
- Reduces startup time

### 8.3 User Experience Enhancements

**1. Progress Visualization**
- Add UI component showing progress statistics
- Visual representation of chapter completion
- Writing velocity graphs

**2. Consistency Checker UI**
- Show consistency issues in sidebar
- Allow user to review and resolve
- Integrated with story bible manager

**3. Session Summary on Startup**
- Show summary of last session when opening project
- Remind user what they were working on
- Suggest next steps

**4. Quick Actions**
- UI shortcuts for common tasks
- "Create new character", "Outline chapter", etc.
- Streamlines workflow

---

## Phase 9: Migration Plan

### 9.1 For Existing Projects

**Migration Script:**
```python
def migrate_existing_project(project_path: Path, author_mode: str):
    """
    Migrate an existing project to new structure.
    
    Steps:
    1. Detect existing files and folders
    2. Create new structure
    3. Move files to appropriate locations
    4. Create missing required files
    5. Generate initial progress log from existing work
    """
    # Implementation
```

### 9.2 Backward Compatibility

- Support old project structure for a transition period
- Main agent detects structure version
- Prompts user to migrate to new structure
- Provides migration tool in UI

---

## Summary

This implementation plan provides a comprehensive roadmap for implementing centralized file management with specialized subagents. The key principles are:

1. **Centralized Control**: Only main agent writes files
2. **Specialized Reading**: Each folder has a dedicated subagent
3. **Context Optimization**: Multiple subagents for large tasks
4. **Progress Tracking**: Dedicated tracking and compression agents
5. **Structured Projects**: Mandatory folder/file structure per mode

The architecture prevents file conflicts, optimizes context window usage, maintains consistency, and provides robust progress tracking—all critical for long-form book writing projects.

**Estimated Timeline**: 4 weeks for full implementation and testing

**Next Steps**: 
1. Review and approve this plan
2. Begin Phase 1: Project Structure Setup
3. Iterate based on testing feedback
