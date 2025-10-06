# Author Mode Implementation Plan

**Date**: October 6, 2025  
**Feature**: Transform Agent Selector into "Author Mode" Selector  
**Goal**: Support different writing types (Fiction, Non-Fiction, Academic, etc.) without major architectural changes

---

## Executive Summary

The current agent dropdown in the center column (MultiTabEditor) will be repurposed as an "Author Mode" selector. This allows users to select the type of book they're writing, which dynamically adjusts agent prompts and behavior without requiring multiple agent instances or significant architectural changes.

**Decision**: Maintain single agent architecture with dynamic prompt templates based on selected mode.

---

## Current State Analysis

### Agent Dropdown Location
- **File**: `src/renderer/components/MultiTabEditor.tsx`
- **Lines**: 106-127
- **Current Function**: Calls `electronAPI.agent.listAvailable()` to populate dropdown
- **Current Options**: Shows agent names (Planning Agent, Writing Agent, Editing Agent)

### Current Agent Prompts Analysis

**Main Agent** (`backend/prompts/main_agent.py`):
- ✅ Relatively general (can work for multiple genres)
- ⚠️ Some fiction-specific language ("story", "plot", "characters")
- ✅ Core capabilities are universal (planning, writing, editing)

**Subagent Prompts** (`backend/prompts/subagents.py`):

1. **Planning Agent**: 
   - ❌ Heavily fiction-focused (plot arcs, character arcs, three-act structure)
   - ❌ Examples use narrative fiction terminology
   - ⚠️ Would need adaptation for academic/non-fiction

2. **Writing Agent**:
   - ❌ Fiction-specific (prose, dialogue, scenes, character voice)
   - ❌ Genre specialization section is all fiction genres
   - ⚠️ Needs significant adaptation for non-fiction

3. **Editing Agent**:
   - ✅ More universal (grammar, clarity, consistency)
   - ⚠️ Some fiction bias (plot holes, character consistency)
   - ✅ Could work for most book types with minor tweaks

### Conclusion
**Current prompts are heavily fiction-biased and would not work well for academic or non-fiction books.**

---

## Recommended Approach: Dynamic Prompt Templates

### Architecture Decision

**✅ RECOMMENDED: Single Agent with Dynamic Prompts**

**Why This Approach**:
1. ✅ No architectural changes needed
2. ✅ Maintains current agent infrastructure
3. ✅ Easy to implement and test
4. ✅ Fast path to production
5. ✅ Can be enhanced later with more sophisticated routing

**How It Works**:
1. User selects "Author Mode" from dropdown (Fiction, Non-Fiction, Academic, etc.)
2. Mode selection is passed to backend with each message
3. Backend dynamically selects appropriate prompt templates
4. Main agent and subagents use mode-specific prompts
5. Tools remain the same (file operations work for all modes)

---

## Author Modes to Implement

### Phase 1: Core Modes (Immediate Implementation)

#### 1. **Fiction Mode** (Default)
**Use Cases**: Novels, short stories, creative writing
**Prompt Focus**:
- Story structure and plot development
- Character development and arcs
- Dialogue and narrative voice
- Scene construction and pacing
- World-building (for fantasy/sci-fi)

**Subagent Specializations**:
- Planning: Plot outlines, story structure, character arcs
- Writing: Prose, dialogue, scenes, descriptions
- Editing: Narrative consistency, character voice, plot holes

#### 2. **Non-Fiction Mode**
**Use Cases**: Memoirs, biographies, self-help, business books, how-to guides
**Prompt Focus**:
- Argument structure and thesis development
- Evidence and example organization
- Clear, informative writing style
- Chapter flow and logical progression
- Fact-checking and accuracy

**Subagent Specializations**:
- Planning: Outline arguments, organize topics, structure chapters
- Writing: Clear explanations, examples, transitions
- Editing: Clarity, accuracy, logical flow, consistency

#### 3. **Academic/Scholarly Mode**
**Use Cases**: Textbooks, research-based books, academic publications
**Prompt Focus**:
- Research methodology and citation
- Formal academic writing style
- Argument construction and evidence
- Literature review and synthesis
- Technical accuracy and precision

**Subagent Specializations**:
- Planning: Research structure, chapter organization, argument flow
- Writing: Formal academic prose, citations, technical explanations
- Editing: Academic rigor, citation accuracy, formal style consistency

### Phase 2: Specialized Modes (Future Enhancement)

#### 4. **Technical/Professional Mode**
**Use Cases**: Technical manuals, professional guides, documentation
**Prompt Focus**:
- Clear technical explanations
- Step-by-step instructions
- Diagrams and visual references
- Glossary and terminology consistency

#### 5. **Children's/YA Mode**
**Use Cases**: Children's books, young adult fiction
**Prompt Focus**:
- Age-appropriate language and themes
- Engaging, accessible writing
- Educational elements (for children's books)
- Coming-of-age themes (for YA)

#### 6. **Poetry/Creative Mode**
**Use Cases**: Poetry collections, experimental writing
**Prompt Focus**:
- Poetic devices and techniques
- Rhythm, meter, and form
- Imagery and metaphor
- Creative experimentation

---

## Technical Implementation

### 1. Frontend Changes (MultiTabEditor.tsx)

**Replace Agent Selector with Author Mode Selector**:

```typescript
// Instead of loading agents, define modes
const authorModes = [
  { id: 'fiction', name: 'Fiction Writing', icon: '📖' },
  { id: 'non-fiction', name: 'Non-Fiction', icon: '📚' },
  { id: 'academic', name: 'Academic/Scholarly', icon: '🎓' },
  { id: 'technical', name: 'Technical/Professional', icon: '⚙️' },
  { id: 'childrens', name: "Children's/YA", icon: '🌟' },
  { id: 'poetry', name: 'Poetry/Creative', icon: '✨' }
];

const [selectedMode, setSelectedMode] = useState<string>('fiction');
```

**Update Dropdown UI**:
```typescript
<select
  value={selectedMode}
  onChange={(e) => setSelectedMode(e.target.value)}
  style={{...}}
>
  {authorModes.map(mode => (
    <option key={mode.id} value={mode.id}>
      {mode.icon} {mode.name}
    </option>
  ))}
</select>
```

**Pass Mode to Backend**:
- Store selected mode in app state
- Include mode in WebSocket messages to backend
- Backend uses mode to select appropriate prompts

### 2. Backend Changes

#### A. Create Prompt Template System

**New File**: `backend/prompts/prompt_templates.py`

```python
"""
Dynamic prompt templates for different author modes
"""

# Main Agent Templates
MAIN_AGENT_TEMPLATES = {
    'fiction': FICTION_MAIN_AGENT_PROMPT,
    'non-fiction': NON_FICTION_MAIN_AGENT_PROMPT,
    'academic': ACADEMIC_MAIN_AGENT_PROMPT,
    # ... more modes
}

# Subagent Templates
PLANNING_AGENT_TEMPLATES = {
    'fiction': FICTION_PLANNING_PROMPT,
    'non-fiction': NON_FICTION_PLANNING_PROMPT,
    'academic': ACADEMIC_PLANNING_PROMPT,
    # ... more modes
}

# Similar for writing and editing agents
```

#### B. Modify AgentService to Accept Mode

**File**: `backend/services/agent_service.py`

```python
class AgentService:
    def __init__(self, project_path: str, author_mode: str = 'fiction'):
        self.project_path = Path(project_path).resolve()
        self.author_mode = author_mode
        self.agent = None
        self._initialize_agent()
    
    def _initialize_agent(self):
        # Get mode-specific prompts
        main_prompt = get_main_agent_prompt(self.author_mode)
        subagent_configs = get_subagent_configs(self.author_mode)
        
        # Create agent with mode-specific prompts
        self.agent = async_create_deep_agent(
            tools=file_tools,
            instructions=main_prompt,
            model=model,
            subagents=subagent_configs,
        )
    
    def change_mode(self, new_mode: str):
        """Change author mode and reinitialize agent"""
        self.author_mode = new_mode
        self._initialize_agent()
```

#### C. Update WebSocket Protocol

**File**: `backend/main.py`

```python
# Add mode to initialization
if message_type == "init":
    project_path = data.get("project_path")
    author_mode = data.get("author_mode", "fiction")
    
    agent_service = AgentService(project_path, author_mode)
    # ...

# Add mode change handler
elif message_type == "change_mode":
    new_mode = data.get("mode")
    if agent_service:
        agent_service.change_mode(new_mode)
        await websocket.send_json({
            "type": "mode_changed",
            "mode": new_mode
        })
```

### 3. Prompt Template Creation

#### Fiction Mode Prompts (Current)
- Keep existing prompts as fiction templates
- Minor refinements for clarity

#### Non-Fiction Mode Prompts (New)

**Main Agent - Non-Fiction**:
```
You are an expert AI writing assistant specialized in non-fiction book writing.

## Your Core Capabilities
- Structuring arguments and organizing information
- Developing clear, informative content
- Managing research and fact-checking
- Ensuring logical flow and coherence
- Supporting evidence-based writing

## Your Approach
1. Analyze the book's purpose and target audience
2. Organize information logically and accessibly
3. Ensure clarity and accuracy
4. Support claims with evidence and examples
5. Maintain consistent voice and style
...
```

**Planning Agent - Non-Fiction**:
```
You are a master non-fiction book planner and structure expert.

## Your Expertise
- Organizing complex information into clear structures
- Developing argument flow and thesis support
- Creating chapter outlines with logical progression
- Balancing depth and accessibility
- Planning research and evidence integration

## Planning Guidelines
1. **Thesis-Driven Structure**
   - Clear central argument or purpose
   - Supporting points organized logically
   - Evidence and examples mapped to claims

2. **Chapter Organization**
   - Each chapter serves the overall thesis
   - Clear topic sentences and transitions
   - Balance of information and engagement
...
```

**Writing Agent - Non-Fiction**:
```
You are an expert non-fiction writer specializing in clear, engaging explanatory writing.

## Your Expertise
- Writing clear, accessible explanations
- Using examples and analogies effectively
- Maintaining engaging narrative flow
- Balancing detail with readability
- Adapting tone for target audience

## Writing Guidelines
1. **Clarity First**
   - Use concrete examples
   - Define technical terms
   - Break down complex concepts
   - Use active voice

2. **Engagement**
   - Tell stories and use anecdotes
   - Ask rhetorical questions
   - Use vivid language
   - Maintain reader interest
...
```

**Editing Agent - Non-Fiction**:
```
You are a professional non-fiction editor specializing in clarity and accuracy.

## Your Expertise
- Ensuring factual accuracy
- Improving clarity and readability
- Checking logical flow and argument strength
- Verifying evidence and citations
- Maintaining consistent voice

## What to Look For
1. **Accuracy and Evidence**
   - Factual claims supported
   - Sources cited appropriately
   - Statistics and data accurate
   - Claims not overstated

2. **Clarity and Flow**
   - Arguments easy to follow
   - Transitions smooth
   - Technical terms explained
   - Examples relevant
...
```

#### Academic Mode Prompts (New)

**Main Agent - Academic**:
```
You are an expert AI writing assistant specialized in academic and scholarly writing.

## Your Core Capabilities
- Structuring rigorous academic arguments
- Managing research and citations
- Maintaining formal academic style
- Ensuring methodological soundness
- Supporting evidence-based scholarship

## Academic Standards
1. Rigorous citation and attribution
2. Formal academic writing style
3. Critical analysis and synthesis
4. Methodological transparency
5. Engagement with scholarly literature
...
```

**Planning Agent - Academic**:
```
You are a master academic book planner with expertise in scholarly structure.

## Your Expertise
- Organizing research-based arguments
- Structuring literature reviews
- Planning methodology sections
- Organizing evidence and analysis
- Creating scholarly chapter flow

## Planning Guidelines
1. **Research Structure**
   - Literature review organization
   - Theoretical framework
   - Methodology chapter
   - Analysis chapters
   - Conclusion and implications

2. **Argument Development**
   - Clear research questions
   - Hypothesis or thesis
   - Evidence mapping
   - Counter-argument consideration
...
```

---

## Implementation Steps

### Phase 1: Core Infrastructure (Week 1)

**Day 1-2: Prompt Template System**
- [ ] Create `backend/prompts/prompt_templates.py`
- [ ] Define template structure and selection logic
- [ ] Create fiction mode templates (refactor existing)
- [ ] Create non-fiction mode templates
- [ ] Create academic mode templates

**Day 3-4: Backend Integration**
- [ ] Modify `AgentService` to accept mode parameter
- [ ] Implement `change_mode()` method
- [ ] Update WebSocket protocol for mode support
- [ ] Add mode change message handler
- [ ] Test backend mode switching

**Day 5: Frontend Implementation**
- [ ] Replace agent selector with mode selector in `MultiTabEditor.tsx`
- [ ] Add mode icons and labels
- [ ] Store selected mode in app state
- [ ] Send mode with initialization message
- [ ] Implement mode change handler

**Day 6-7: Testing and Refinement**
- [ ] Test each mode with sample projects
- [ ] Verify prompt switching works correctly
- [ ] Test mode changes during active sessions
- [ ] Refine prompts based on testing
- [ ] Document mode selection feature

### Phase 2: Additional Modes (Week 2)

**Day 1-3: Create Additional Mode Prompts**
- [ ] Technical/Professional mode prompts
- [ ] Children's/YA mode prompts
- [ ] Poetry/Creative mode prompts

**Day 4-5: UI Enhancements**
- [ ] Add mode descriptions/tooltips
- [ ] Show mode-specific tips in UI
- [ ] Add mode indicator in chat panel
- [ ] Create mode selection guide

**Day 6-7: Documentation and Polish**
- [ ] User documentation for mode selection
- [ ] Mode selection best practices guide
- [ ] Update onboarding to explain modes
- [ ] Create mode comparison chart

---

## Prompt Design Principles

### Universal Elements (All Modes)
- File management tools (read, write, list, edit)
- Todo system for task management
- Progress tracking and continuity
- Context awareness
- Quality focus

### Mode-Specific Elements

**Fiction**:
- Story structure terminology
- Character and plot focus
- Narrative techniques
- Creative language

**Non-Fiction**:
- Argument structure terminology
- Evidence and clarity focus
- Explanatory techniques
- Informative language

**Academic**:
- Research methodology terminology
- Rigor and citation focus
- Scholarly techniques
- Formal language

---

## Benefits of This Approach

### 1. **No Architectural Changes**
- Uses existing agent infrastructure
- Same WebSocket protocol (minor additions)
- Same file tools and capabilities
- Minimal code changes

### 2. **Fast Implementation**
- Can be completed in 1-2 weeks
- No complex routing or agent management
- Straightforward prompt switching
- Easy to test and debug

### 3. **User-Friendly**
- Clear mode selection
- Appropriate terminology for each book type
- Better agent responses for specific genres
- Intuitive mental model

### 4. **Maintainable**
- Prompts are separate and modular
- Easy to add new modes
- Easy to refine existing modes
- Clear separation of concerns

### 5. **Scalable**
- Can add more modes easily
- Can enhance with middleware later
- Can add mode-specific tools if needed
- Foundation for future enhancements

---

## Alternative Approaches Considered

### ❌ Option 1: Multiple Agent Instances
**Why Rejected**: 
- Requires significant architectural changes
- Higher memory usage
- Complex state management
- Delays production timeline

### ❌ Option 2: Middleware Layer
**Why Rejected**:
- Adds complexity without clear benefit
- Prompt templates achieve same goal
- Harder to maintain and debug
- Overkill for current needs

### ❌ Option 3: One-Size-Fits-All Agent
**Why Rejected**:
- Current prompts are too fiction-specific
- Generic prompts would be less effective
- Users need specialized assistance
- Mode-specific prompts provide better UX

---

## Future Enhancements

### Phase 3: Advanced Features (Post-Production)

1. **Mode-Specific Tools**
   - Citation manager for academic mode
   - Fact-checker for non-fiction mode
   - Character tracker for fiction mode

2. **Mode Learning**
   - Agent learns user's style within mode
   - Mode-specific preferences
   - Custom mode templates

3. **Hybrid Modes**
   - Creative non-fiction (memoir, narrative journalism)
   - Historical fiction (research + narrative)
   - Popular science (academic + accessible)

4. **Mode Recommendations**
   - Suggest mode based on project structure
   - Auto-detect book type from content
   - Mode switching suggestions

---

## Testing Plan

### Unit Tests
- [ ] Prompt template selection logic
- [ ] Mode switching functionality
- [ ] WebSocket message handling
- [ ] Agent reinitialization

### Integration Tests
- [ ] End-to-end mode selection flow
- [ ] Mode changes during active sessions
- [ ] Prompt application verification
- [ ] File operations in different modes

### User Acceptance Tests
- [ ] Fiction mode with sample novel project
- [ ] Non-fiction mode with sample how-to book
- [ ] Academic mode with sample research book
- [ ] Mode switching between projects
- [ ] User feedback on prompt appropriateness

---

## Documentation Requirements

### User Documentation
1. **Mode Selection Guide**
   - When to use each mode
   - Mode descriptions and examples
   - How to switch modes

2. **Mode-Specific Tips**
   - Best practices for fiction mode
   - Best practices for non-fiction mode
   - Best practices for academic mode

3. **FAQ**
   - Can I switch modes mid-project?
   - What if my book doesn't fit a mode?
   - Can I customize mode behavior?

### Developer Documentation
1. **Prompt Template System**
   - How to add new modes
   - Prompt design guidelines
   - Template structure

2. **Mode Architecture**
   - How mode selection works
   - Agent reinitialization process
   - WebSocket protocol updates

---

## Success Criteria

### Functional Requirements
- ✅ User can select author mode from dropdown
- ✅ Agent uses appropriate prompts for selected mode
- ✅ Mode can be changed without restarting app
- ✅ All modes work with existing file tools
- ✅ Mode selection persists across sessions

### Quality Requirements
- ✅ Fiction mode prompts work well for novels
- ✅ Non-fiction mode prompts work well for informative books
- ✅ Academic mode prompts work well for scholarly books
- ✅ Mode switching is smooth and fast (<2 seconds)
- ✅ No loss of context when switching modes

### User Experience Requirements
- ✅ Mode selection is intuitive and clear
- ✅ Mode descriptions help users choose correctly
- ✅ Agent responses feel appropriate for selected mode
- ✅ Users can easily understand which mode they're in
- ✅ Mode selection doesn't disrupt workflow

---

## Conclusion

The "Author Mode" feature provides a clean, maintainable solution for supporting different types of book writing without requiring major architectural changes. By using dynamic prompt templates, we can deliver specialized assistance for fiction, non-fiction, and academic writing while maintaining the current single-agent architecture.

**Implementation Timeline**: 1-2 weeks  
**Risk Level**: Low  
**Impact**: High (significantly improves user experience for non-fiction authors)  
**Recommendation**: Proceed with implementation immediately

This approach keeps the project on track for production while delivering meaningful value to users writing different types of books.

---

**Next Steps**:
1. Review and approve this plan
2. Begin Phase 1 implementation
3. Create prompt templates for three core modes
4. Test with sample projects
5. Refine based on feedback
6. Document for users
7. Ship to production

---

**Document Status**: Implementation Plan Complete  
**Ready for Development**: Yes  
**Estimated Completion**: 1-2 weeks
