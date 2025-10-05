# Author Backend - DeepAgents Integration

This is the Python backend for the Author desktop application, powered by DeepAgents framework.

## Features

- ✅ **DeepAgents Framework**: Sophisticated agent orchestration with planning and subagents
- ✅ **FastAPI Server**: High-performance WebSocket streaming
- ✅ **Real File Operations**: Actual file system integration (not virtual)
- ✅ **OpenRouter Support**: Use any LLM provider
- ✅ **Production Prompts**: Ported from TypeScript implementation
- ✅ **Three Specialized Subagents**: Planning, Writing, Editing

## Quick Start

### 1. Setup

```bash
cd backend
python setup.py
```

This will:
- Create a virtual environment
- Install all dependencies
- Configure DeepAgents for OpenRouter

### 2. Configuration

Make sure your `.env` file (in project root) has:

```env
# OpenRouter Configuration
CLAUDE_API_KEY=sk-or-v1-your-key-here
CLAUDE_API_BASE_URL=https://openrouter.ai/api/v1
CLAUDE_MODEL=x-ai/grok-4-fast
SUBAGENT_MODEL=alibaba/tongyi-deepresearch-30b-a3b

# Enable DeepAgents
USE_DEEPAGENTS=true

# Backend Configuration (optional)
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8765
```

### 3. Test Backend

```bash
# Activate venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Start server
python main.py
```

You should see:
```
╔══════════════════════════════════════════════╗
║          Author Backend Server               ║
║      Powered by DeepAgents & FastAPI         ║
╚══════════════════════════════════════════════╝

Starting server at http://127.0.0.1:8765
WebSocket endpoint: ws://127.0.0.1:8765/ws/agent
```

### 4. Test WebSocket

Open another terminal and test:

```bash
# Install wscat if you don't have it
npm install -g wscat

# Connect to WebSocket
wscat -c ws://127.0.0.1:8765/ws/agent

# Send initialization
{"type": "init", "project_path": "C:\\path\\to\\your\\book\\project"}

# Send a message
{"type": "message", "content": "Hello! Help me plan a fantasy novel."}
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Electron Frontend (TS)           │
└────────────────┬────────────────────────┘
                 │ WebSocket
                 ↓
┌─────────────────────────────────────────┐
│    FastAPI Backend (main.py)             │
│  - WebSocket handler                     │
│  - Session management                    │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│   AgentService (services/agent_service.py│
│  - DeepAgent orchestration               │
│  - Streaming responses                   │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        ↓                 ↓
┌──────────────┐  ┌──────────────┐
│ DeepAgents   │  │ Real Files   │
│ - Planning   │  │ - Chapters   │
│ - Writing    │  │ - Characters │
│ - Editing    │  │ - Outlines   │
│ - Todos      │  │ - Research   │
└──────────────┘  └──────────────┘
```

## Project Structure

```
backend/
├── main.py                 # FastAPI server entry point
├── config.py              # Configuration
├── requirements.txt       # Python dependencies
├── setup.py              # Setup script
│
├── models/
│   ├── __init__.py
│   └── model_config.py   # OpenRouter model configuration
│
├── prompts/
│   ├── __init__.py
│   ├── main_agent.py     # Main agent prompt
│   └── subagents.py      # Subagent prompts (Planning, Writing, Editing)
│
├── services/
│   ├── __init__.py
│   └── agent_service.py  # DeepAgent wrapper
│
└── tools/
    ├── __init__.py
    └── file_tools.py     # Real file operation tools
```

## API Reference

### WebSocket Protocol

**Connect**: `ws://127.0.0.1:8765/ws/agent`

#### Client → Server Messages

1. **Initialize Agent**
```json
{
  "type": "init",
  "project_path": "/absolute/path/to/project"
}
```

2. **Send Message**
```json
{
  "type": "message",
  "content": "Your prompt here",
  "thread_id": "optional-thread-id"
}
```

3. **Change Project**
```json
{
  "type": "change_project",
  "project_path": "/new/project/path"
}
```

#### Server → Client Messages

1. **Initialized**
```json
{
  "type": "initialized",
  "project_path": "/path/to/project"
}
```

2. **Stream Start**
```json
{
  "type": "stream-start"
}
```

3. **Stream Chunk**
```json
{
  "type": "stream-chunk",
  "content": "Partial text content...",
  "role": "assistant"
}
```

4. **Todo List Update**
```json
{
  "type": "todos",
  "data": [
    {"content": "Task 1", "status": "completed"},
    {"content": "Task 2", "status": "in_progress"},
    {"content": "Task 3", "status": "pending"}
  ]
}
```

5. **Complete**
```json
{
  "type": "complete",
  "message": "Agent finished processing"
}
```

6. **Error**
```json
{
  "type": "error",
  "error": "Error message"
}
```

## Development

### Running in Development

```bash
# With auto-reload
uvicorn main:app --reload --host 127.0.0.1 --port 8765
```

### Adding New Tools

1. Create tool function in `tools/`:
```python
from langchain_core.tools import tool

@tool
def my_custom_tool(arg1: str, arg2: int) -> str:
    """Tool description"""
    # Your logic here
    return result
```

2. Add to `create_file_tools()` or create new tool module

3. Tool will automatically be available to agents

### Adding New Subagents

1. Add prompt in `prompts/subagents.py`:
```python
MY_AGENT_PROMPT = """Your specialized prompt..."""

MY_AGENT_CONFIG = {
    "name": "my-agent",
    "description": "When to use this agent",
    "prompt": MY_AGENT_PROMPT,
    "tools": ["read_real_file", "write_real_file"],
}
```

2. Add to `get_all_subagents()` function

3. Subagent will be available to main agent

## Troubleshooting

### Backend won't start

**Problem**: `ModuleNotFoundError: No module named 'deepagents'`
**Solution**: Run `python setup.py` to install dependencies

**Problem**: `ValueError: CLAUDE_API_KEY not found`
**Solution**: Add API key to `.env` file

### WebSocket connection fails

**Problem**: `Connection refused`
**Solution**: Make sure backend is running (`python main.py`)

**Problem**: `Agent not initialized`
**Solution**: Send `{"type": "init", "project_path": "..."}` first

### File operations fail

**Problem**: `Error: Path ... is outside project directory`
**Solution**: All file paths must be within the project directory for security

**Problem**: `Error: File not found`
**Solution**: Use relative paths from project root (e.g., `chapters/chapter_01.md`)

## Performance

- **Simple query**: 1-3 seconds
- **Chapter outline**: 30-60 seconds
- **Write scene (500 words)**: 60-90 seconds
- **Complex multi-part**: 5-15 minutes with parallel subagents

## Security

- ✅ **Path validation**: All file operations are sandboxed to project directory
- ✅ **Input validation**: Pydantic models validate all inputs
- ✅ **CORS configured**: Only allows connections from Electron app
- ⚠️ **Development mode**: CORS set to `*` for development, restrict in production

## License

Same as parent Author project.
