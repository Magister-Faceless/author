# Author Application - User Experience Flow

**Document**: UX Flow Documentation  
**Date**: 2025-10-05  
**Purpose**: Document the complete user experience when interacting with the Author AI agents  

---

## Overview

The Author application provides an agentic AI writing assistant similar to Windsurf, Cursor, and Claude Code, but optimized for book writing. Users interact through a chat interface where AI agents plan, execute, and track complex writing tasks across multiple sessions.

---

## User Experience Scenarios

### Scenario 1: Writing a New Chapter

**User Request:**
> "Help me write Chapter 5 of my fantasy novel. It should include an action scene where the protagonist discovers their hidden powers, and connect to the cliffhanger from Chapter 4."

**What the User Sees:**

1. **Immediate Response** (< 1 second)
   ```
   I'll help you write Chapter 5. This is a complex task, so let me create a plan to track our progress.
   ```

2. **Todo List Appears** (streaming in real-time)
   ```
   📋 Todo List Created:
   ☐ Read Chapter 4 to understand the cliffhanger  
   ☐ Create Chapter 5 outline with action scene  
   ☐ Write the action scene  
   ☐ Write character development sections  
   ☐ Ensure smooth connection to Chapter 4  
   ☐ Review and refine Chapter 5  
   ☐ Create progress file documenting work  
   ```

3. **First Task Starts** (todo list updates)
   ```
   📋 Todo List Updated:
   🔧 Read Chapter 4 to understand the cliffhanger  
   ☐ Create Chapter 5 outline with action scene  
   ...
   ```

4. **Agent Works** (streaming text appears in real-time)
   ```
   Let me read Chapter 4 to understand the context...
   
   [Reads Chapter 4]
   
   I can see Chapter 4 ends with Kira trapped in the burning archive, 
   surrounded by soldiers. Perfect setup for the power revelation!
   ```

5. **Task Completes, Next Starts** (todo list updates)
   ```
   📋 Todo List Updated:
   ✅ Read Chapter 4 to understand the cliffhanger  
   🔧 Create Chapter 5 outline with action scene  
   ☐ Write the action scene  
   ...
   ```

6. **Subagent Delegation** (user sees this)
   ```
   I'm delegating the outline creation to the planning-agent who 
   specializes in story structure. This will ensure we have a solid 
   framework before writing.
   
   [Planning agent working...]
   ```

7. **Planning Agent Returns** (streaming continues)
   ```
   The planning-agent has created a detailed Chapter 5 outline:
   
   # Chapter 5: Fire and Revelation
   
   ## Scene 1: Desperate Escape (Fast pacing)
   - Kira surrounded, archive burning
   - Instinctive power activation
   - Soldiers thrown back by unseen force
   ...
   
   This looks excellent! Let me move forward with writing.
   ```

8. **Multiple Tasks in Parallel** (todo list shows multiple in progress)
   ```
   📋 Todo List Updated:
   ✅ Read Chapter 4 to understand the cliffhanger  
   ✅ Create Chapter 5 outline with action scene  
   🔧 Write the action scene  
   🔧 Write character development sections  
   ☐ Ensure smooth connection to Chapter 4  
   ...
   ```

9. **Agents Working in Parallel** (user informed)
   ```
   I'm launching two writing-agent subagents in parallel to work on:
   1. The action scene (Scene 1-2)
   2. The character development sections (Scene 3-4)
   
   This will be faster than working sequentially.
   
   [Both agents working simultaneously...]
   ```

10. **Content Delivered** (streaming prose)
    ```
    Here's the drafted Chapter 5:
    
    ---
    
    The flames roared closer, heat pressing against Kira's skin like a 
    physical force. Smoke burned her lungs with each gasping breath. 
    The soldiers advanced, weapons drawn, cutting off every escape route.
    
    She was going to die here.
    
    The thought crystallized with terrifying clarity...
    
    [Full chapter content streams in]
    ```

11. **Quality Review** (automatic)
    ```
    📋 Todo List Updated:
    ✅ Write the action scene  
    ✅ Write character development sections  
    🔧 Review and refine Chapter 5  
    ...
    
    Let me review the chapter for consistency and quality...
    
    [Editing agent reviews content]
    
    The editing-agent found a few minor improvements. I've applied them.
    ```

12. **Progress Documentation** (automatic)
    ```
    📋 Todo List Updated:
    ✅ Read Chapter 4 to understand the cliffhanger  
    ✅ Create Chapter 5 outline with action scene  
    ✅ Write the action scene  
    ✅ Write character development sections  
    ✅ Ensure smooth connection to Chapter 4  
    ✅ Review and refine Chapter 5  
    🔧 Create progress file documenting work  
    
    I'm creating a progress file to document this session's work...
    
    Progress file created: progress_session_20251005_143000.md
    ```

13. **Final Summary** (completion)
    ```
    ✅ Chapter 5 Complete!
    
    I've successfully written Chapter 5 with:
    - Action scene showing Kira's power revelation
    - Character development showing her acceptance
    - Smooth connection to Chapter 4's cliffhanger
    - ~3,500 words of polished prose
    
    Files created/modified:
    - chapter_05.md (new file)
    - progress_session_20251005_143000.md (progress tracking)
    
    Next suggested steps:
    - Review and edit Chapter 5
    - Write Chapter 6 outline
    - Update character profile for Kira with new powers
    ```

**Total Time:** ~5-8 minutes for complete chapter  
**User Interaction:** Minimal - mostly monitoring progress  
**Files Created:** 2 (chapter + progress file)  

---

### Scenario 2: Simple Question (No Todo List)

**User Request:**
> "What's a good name for my villain?"

**What the User Sees:**

1. **Immediate Response** (no todo list created)
   ```
   For a compelling villain name, consider the character's traits and 
   role in your story. Here are some suggestions:
   
   **For a sophisticated, calculating antagonist:**
   - Malachi Vex
   - Cassian Drake
   - Severus Thorne
   
   **For a mysterious, shadowy villain:**
   - The Shade
   - Cipher
   - Umbra
   
   **For a brutal, physical threat:**
   - Kael Ironfist
   - Thorne the Reaver
   - Draven Bloodhammer
   
   What type of personality and role does your villain have? That will 
   help me suggest more fitting names.
   ```

**Total Time:** < 5 seconds  
**User Interaction:** Question answered directly  
**Rationale:** Simple request doesn't need planning or todo tracking  

---

### Scenario 3: Complex Multi-Part Request

**User Request:**
> "Help me develop Act 2 of my novel. I need to outline the key plot points, develop the antagonist's motivations, and write the midpoint crisis scene."

**What the User Sees:**

1. **Analysis and Planning**
   ```
   I'll help you develop Act 2 comprehensively. This is a substantial 
   undertaking with multiple independent components, so I'll create a 
   plan and use specialized subagents for each part.
   
   📋 Todo List Created:
   ☐ Read Act 1 to understand established plot  
   ☐ Create Act 2 outline with key plot points  
   ☐ Develop antagonist's motivations deeply  
   ☐ Write midpoint crisis scene outline  
   ☐ Draft midpoint crisis scene  
   ☐ Review all elements for consistency  
   ☐ Create context notes for story decisions  
   ```

2. **Sequential Execution with Context Building**
   ```
   🔧 Reading Act 1...
   
   Act 1 establishes:
   - Protagonist Kira discovering her heritage
   - Antagonist Lord Vex hunting for ancient artifacts
   - The Emberstone as the MacGuffin
   - Alliance with Daren formed
   
   ✅ Act 1 context understood
   ```

3. **Parallel Subagent Delegation**
   ```
   Now I'll work on the three main components in parallel:
   
   1. Planning-agent: Creating Act 2 outline
   2. Writing-agent: Developing antagonist motivations
   3. Planning-agent: Outlining midpoint crisis
   
   All three agents are working simultaneously...
   ```

4. **Results Synthesis**
   ```
   All three subagents have completed their work. Let me synthesize 
   the results:
   
   ## Act 2 Structure
   [Detailed outline from planning-agent]
   
   ## Antagonist: Lord Vex
   [Deep character analysis from writing-agent]
   
   ## Midpoint Crisis: The Betrayal
   [Scene outline from planning-agent]
   
   These three elements work together cohesively...
   ```

5. **Follow-up Work**
   ```
   🔧 Drafting the midpoint crisis scene...
   
   [Writing-agent writes full scene]
   
   ✅ Midpoint scene drafted (2,800 words)
   ```

6. **Documentation and Continuity**
   ```
   🔧 Creating context notes for future sessions...
   
   Context notes created:
   - act2_structure.md (plot outline)
   - antagonist_development.md (Lord Vex deep dive)
   - midpoint_decisions.md (key story choices)
   
   Progress file created documenting all Act 2 development work.
   ```

7. **Completion Summary**
   ```
   ✅ Act 2 Development Complete!
   
   Delivered:
   - Complete Act 2 outline (15 chapters mapped)
   - Deep antagonist character development
   - Midpoint crisis scene (fully drafted, 2,800 words)
   - Context notes for continuity
   
   Files created:
   - act2_outline.md
   - antagonist_profile.md
   - chapter_midpoint.md
   - Various context notes
   
   This gives you a solid foundation for writing Act 2!
   ```

**Total Time:** ~12-18 minutes  
**User Interaction:** Monitoring progress, reading results  
**Parallelization:** Yes - multiple subagents worked simultaneously  

---

## Key UX Elements

### Real-Time Streaming

**What Users Experience:**
- Text appears word-by-word as agents think and work
- No long waits for complete responses
- Feels like watching the AI work
- Can interrupt if direction is wrong

**Implementation:**
- Chunks stream through IPC every ~50ms
- Frontend updates incrementally
- Smooth, natural text appearance

### Todo List Visibility

**What Users Experience:**
- Clear breakdown of complex tasks
- Real-time progress tracking
- Understanding of what's happening
- Confidence that nothing is forgotten

**States Shown:**
- ☐ Pending (gray)
- 🔧 In Progress (blue, pulsing)
- ✅ Completed (green)

**Updates:**
- Immediate as tasks complete
- Multiple tasks can be in progress simultaneously
- Removed if no longer relevant

### Subagent Transparency

**What Users Experience:**
- Told when subagents are being used
- Understand why delegation is happening
- See when subagents are working in parallel
- Notified when subagents complete

**Example Messages:**
```
"I'm delegating outline creation to the planning-agent who 
specializes in story structure..."

"Launching three writing-agent subagents in parallel to create 
backstories for each character..."

"The editing-agent has completed its review and found these 
improvements..."
```

### Progress Files

**What Users Experience:**
- Automatic documentation of work
- Easy to resume in next session
- Clear record of decisions made
- Confidence in continuity

**When Created:**
- End of complex multi-turn sessions
- After completing major milestones
- When wrapping up significant work

**Contents:**
- Summary of work completed
- Files modified/created
- Key decisions made
- Next steps suggested

---

## Error Handling

### When Things Go Wrong

**Scenario:** File not found

**What User Sees:**
```
I tried to read chapter_04.md but couldn't find it. 

Could you help me locate Chapter 4? It might be named differently 
or in a different folder.
```

**Scenario:** Subagent fails

**What User Sees:**
```
The writing-agent encountered an issue while drafting the scene. 
Let me try a different approach and write it directly.

[Continues work without user needing to do anything]
```

**Scenario:** Complex request is unclear

**What User Sees:**
```
I want to make sure I understand your request correctly. You mentioned 
writing Chapter 5 - should this:
1. Continue directly from Chapter 4's ending?
2. Include the action scene you outlined earlier?
3. Match the tone of the previous chapters?

Please clarify so I can deliver exactly what you need.
```

---

## Session Continuity

### Starting a New Session

**User Returns After Break:**

**What Happens:**
1. Agent automatically reads recent progress files
2. Understands context from previous session
3. Greets user with context awareness

**What User Sees:**
```
Welcome back! I see in our last session we completed Chapter 5 and 
created character profiles. The progress file suggests next steps are:
- Edit and refine Chapter 5
- Write Chapter 6 outline
- Update Kira's profile with new powers

What would you like to work on today?
```

---

## Performance Expectations

### Response Times

| Action | Expected Time | What User Sees |
|--------|---------------|----------------|
| Simple question | < 3 seconds | Immediate answer |
| Read files | 1-2 seconds | Quick read |
| Create outline | 30-60 seconds | Planning agent working |
| Write scene (500 words) | 60-90 seconds | Streaming prose |
| Write chapter (3000 words) | 5-8 minutes | Multiple stages, visible progress |
| Complex multi-part task | 10-20 minutes | Parallel agents, clear progress |

### Parallelization Benefits

**Sequential Processing:**
- 3 character backstories: 6-9 minutes total

**Parallel Processing:**
- 3 character backstories: 2-3 minutes total
- ⚡ 3x faster!

**User sees:**
```
Creating three character backstories in parallel for efficiency...

[Agent 1 working on Hero]
[Agent 2 working on Mentor]  
[Agent 3 working on Villain]

All three backstories completed in 2 minutes!
```

---

## Summary

The Author application provides a sophisticated agentic AI experience where:

✅ **Complex tasks are broken down** into clear, tracked steps  
✅ **Work happens in parallel** when possible for speed  
✅ **Progress is always visible** through todo lists and streaming  
✅ **Context is maintained** across sessions via progress files  
✅ **Quality is ensured** through specialized subagents  
✅ **Users stay informed** with clear communication  

The result is a **professional, efficient, transparent** writing assistant that handles complexity while keeping users informed and in control.
