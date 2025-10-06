"""Agent service using DeepAgents framework"""

import asyncio
from typing import AsyncIterator, Dict, Any, Optional
from pathlib import Path

from deepagents import async_create_deep_agent
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage

import sys
from pathlib import Path as PathLib
sys.path.insert(0, str(PathLib(__file__).parent.parent))

from models import get_default_model
from tools.file_tools import create_file_tools
from prompts.prompt_templates import get_main_agent_prompt, get_subagent_configs, get_available_modes
from config import MAX_TURNS, STREAM_DELAY


class AgentService:
    """
    Service for managing DeepAgent instances and streaming responses.
    """
    
    def __init__(self, project_path: str, author_mode: str = 'fiction'):
        """
        Initialize the agent service.
        
        Args:
            project_path: Absolute path to the project directory
            author_mode: Author mode (fiction, non-fiction, academic)
        """
        self.project_path = Path(project_path).resolve()
        self.author_mode = author_mode
        self.agent = None
        self._initialize_agent()
    
    def _initialize_agent(self):
        """Initialize the DeepAgent with all tools and subagents"""
        # Create file tools scoped to project
        file_tools = create_file_tools(str(self.project_path))
        
        # Create tool name mapping
        tool_map = {tool.name: tool for tool in file_tools}
        
        # Get model
        model = get_default_model()
        
        # Get mode-specific prompts
        main_agent_prompt = get_main_agent_prompt(self.author_mode)
        subagent_configs = get_subagent_configs(self.author_mode)
        
        # Convert tool name strings to actual tool objects for subagents
        subagents = []
        for config in subagent_configs:
            # Convert tool name strings to actual tool objects
            tool_names = config.get("tools", [])
            tools = [tool_map[name] for name in tool_names if name in tool_map]
            
            subagents.append({
                "name": config["name"],
                "description": config["description"],
                "prompt": config["prompt"],
                "tools": tools,
            })
        
        # Create the deep agent with mode-specific prompts
        # Set high recursion limit for complex, long-running book writing tasks
        self.agent = async_create_deep_agent(
            tools=file_tools,
            instructions=main_agent_prompt,
            model=model,
            subagents=subagents,
            recursion_limit=500,  # Allow deep agent-subagent collaboration for complex tasks
        )
        
        print(f"[OK] Agent initialized for project: {self.project_path}")
        print(f"   Mode: {self.author_mode}")
        print(f"   Tools: {len(file_tools)} file operations")
        print(f"   Subagents: {len(subagents)} specialized agents")
    
    async def stream_response(
        self,
        user_message: str,
        thread_id: Optional[str] = None
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Stream agent response in real-time with incremental deltas.
        
        Args:
            user_message: User's input message
            thread_id: Optional thread ID for conversation continuity
            
        Yields:
            Dict containing message chunks, todos, or other events
        """
        if not self.agent:
            raise RuntimeError("Agent not initialized")
        
        # Prepare configuration
        config = {}
        if thread_id:
            config["configurable"] = {"thread_id": thread_id}
        
        # Initial state
        initial_state = {
            "messages": [{"role": "user", "content": user_message}]
        }
        
        # Track what we've already sent to only send deltas
        last_ai_content = ""
        last_todos = []
        last_files = []
        current_tool_calls = []
        
        try:
            # Stream the agent response
            async for chunk in self.agent.astream(
                initial_state,
                config=config,
                stream_mode="values"
            ):
                # Messages (streaming text with deltas)
                if "messages" in chunk:
                    last_message = chunk["messages"][-1]
                    
                    if isinstance(last_message, AIMessage):
                        current_content = last_message.content if isinstance(last_message.content, str) else ""
                        
                        # Only send the new content (delta)
                        if current_content != last_ai_content:
                            delta = current_content[len(last_ai_content):]
                            if delta:
                                yield {
                                    "type": "stream-chunk",
                                    "content": delta,
                                    "fullContent": current_content,
                                    "role": "assistant"
                                }
                            last_ai_content = current_content
                        
                        # Check for tool calls in the message
                        if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                            for tool_call in last_message.tool_calls:
                                tool_id = tool_call.get('id', '')
                                if tool_id not in [tc.get('id', '') for tc in current_tool_calls]:
                                    current_tool_calls.append(tool_call)
                                    yield {
                                        "type": "tool-call",
                                        "tool": tool_call.get('name', 'unknown'),
                                        "args": tool_call.get('args', {}),
                                        "id": tool_id,
                                        "status": "pending"
                                    }
                
                # Tool results (when tool execution completes)
                if "messages" in chunk:
                    for msg in chunk["messages"]:
                        if hasattr(msg, 'type') and msg.type == 'tool':
                            tool_call_id = getattr(msg, 'tool_call_id', None)
                            if tool_call_id:
                                yield {
                                    "type": "tool-result",
                                    "id": tool_call_id,
                                    "result": msg.content if hasattr(msg, 'content') else "",
                                    "status": "completed"
                                }
                
                # Todo list updates (only send if changed)
                if "todos" in chunk:
                    current_todos = chunk["todos"]
                    if current_todos != last_todos:
                        yield {
                            "type": "todos",
                            "data": current_todos
                        }
                        last_todos = current_todos
                
                # File operations (only send if changed)
                if "files" in chunk:
                    current_files = list(chunk["files"].keys())
                    if current_files != last_files:
                        yield {
                            "type": "files",
                            "data": current_files
                        }
                        last_files = current_files
                
                # Small delay for smooth streaming
                await asyncio.sleep(STREAM_DELAY)
            
            # Send completion event with full content
            yield {
                "type": "complete",
                "message": "Agent finished processing",
                "fullContent": last_ai_content
            }
            
        except Exception as e:
            yield {
                "type": "error",
                "error": str(e)
            }
    
    async def invoke(
        self,
        user_message: str,
        thread_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Invoke agent and wait for complete response (non-streaming).
        
        Args:
            user_message: User's input message
            thread_id: Optional thread ID for conversation continuity
            
        Returns:
            Complete response from agent
        """
        if not self.agent:
            raise RuntimeError("Agent not initialized")
        
        # Prepare configuration
        config = {}
        if thread_id:
            config["configurable"] = {"thread_id": thread_id}
        
        # Initial state
        initial_state = {
            "messages": [{"role": "user", "content": user_message}]
        }
        
        try:
            result = await self.agent.ainvoke(initial_state, config=config)
            
            # Extract final message
            final_message = result["messages"][-1] if result["messages"] else None
            
            return {
                "success": True,
                "message": final_message.content if final_message else "",
                "todos": result.get("todos", []),
                "files": list(result.get("files", {}).keys())
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def change_project(self, new_project_path: str):
        """
        Change the project path and reinitialize agent.
        
        Args:
            new_project_path: Path to new project directory
        """
        self.project_path = Path(new_project_path).resolve()
        self._initialize_agent()
    
    def change_mode(self, new_mode: str):
        """
        Change the author mode and reinitialize agent with new prompts.
        
        Args:
            new_mode: New author mode (fiction, non-fiction, academic)
        """
        available_modes = get_available_modes()
        if new_mode not in available_modes:
            raise ValueError(f"Invalid mode '{new_mode}'. Available modes: {available_modes}")
        
        self.author_mode = new_mode
        self._initialize_agent()
        print(f"[OK] Author mode changed to: {self.author_mode}")
    
    def get_current_mode(self) -> str:
        """Get the current author mode."""
        return self.author_mode
