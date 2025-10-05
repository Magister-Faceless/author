# DeepAgents Integration Plan for Author Application

**Date**: 2025-10-05 15:54  
**Status**: ✅ **HIGHLY RECOMMENDED** - Much Better Than Claude SDK  
**Framework**: DeepAgents (Python) + Electron (TypeScript)  

---

## Executive Summary

**DeepAgents is the PERFECT solution for our needs!**

### Why DeepAgents > Claude SDK

| Feature | Claude SDK | DeepAgents |
|---------|------------|------------|
| **Multiple Providers** | ❌ Anthropic only | ✅ Any (LangChain) |
| **Desktop App Required** | ❌ Yes (Claude CLI) | ✅ No |
| **Language** | TypeScript | Python |
| **Built-in Planning** | ✅ Yes | ✅ Yes |
| **Built-in Subagents** | ✅ Yes | ✅ Yes |
| **Real File Operations** | ✅ Yes | ❌ Virtual only |
| **Streaming** | ✅ Yes | ✅ Yes (LangGraph) |
| **MCP Support** | ✅ Yes | ✅ Yes |
| **Cost** | Anthropic subscription | **FREE + Your API keys** |
| **Customization** | Limited | **Full control** |

**Winner**: DeepAgents - More flexible, no subscription, supports all providers!

---

## What DeepAgents Provides Out-of-the-Box

### 1. Built-in Planning Tool ✅
```python
# Automatic todo list tracking
write_todos(todos: list[Todo])
```

### 2. Virtual File System Tools ✅
```python
ls()  # List files
read_file(file_path)  # Read file
write_file(file_path, content)  # Write file
edit_file(file_path, old_string, new_string)  # Edit file
```

**NOTE**: These are VIRTUAL files (stored in state), not real files

### 3. Subagents ✅
```python
subagents = [
    {
        "name": "planning-agent",
        "description": "Expert at outlines and plot structures",
        "prompt": PLANNING_AGENT_PROMPT,
        "tools": [internet_search],
    },
    {
        "name": "writing-agent",
        "description": "Specialized in prose and dialogue",
        "prompt": WRITING_AGENT_PROMPT,
    }
]
```

### 4. Model Flexibility ✅
```python
# Use ANY LangChain-supported model
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

# OpenAI via OpenRouter
model = ChatOpenAI(
    api_key="your-openrouter-key",
    base_url="https://openrouter.ai/api/v1",
    model="x-ai/grok-4-fast"
)

# Or Anthropic
model = ChatAnthropic(model="claude-3-5-sonnet")

# Or any other provider!
agent = create_deep_agent(tools, instructions, model=model)
```

### 5. Streaming ✅
```python
# Built-in streaming via LangGraph
async for chunk in agent.astream(
    {"messages": [{"role": "user", "content": "..."}]},
    stream_mode="values"
):
    if "messages" in chunk:
        chunk["messages"][-1].pretty_print()
```

---

## Architecture: Python Backend + Electron Frontend

### Overview

```
┌─────────────────────────────────────────┐
│         Electron Frontend (TypeScript)   │
│  - React UI (existing)                   │
│  - ChatPanel, FileExplorer, etc.        │
└────────────────┬────────────────────────┘
                 │ WebSocket / REST API
                 ↓
┌─────────────────────────────────────────┐
│    Python Backend (FastAPI/Flask)        │
│  - DeepAgents orchestration              │
│  - Real file operations (custom tools)   │
│  - Database integration (SQLite)         │
│  - Session management                    │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        ↓                 ↓
┌──────────────┐  ┌──────────────┐
│ DeepAgents   │  │ Real Files   │
│ - Planning   │  │ - Chapters   │
│ - Subagents  │  │ - Characters │
│ - Virtual FS │  │ - Outlines   │
└──────────────┘  └──────────────┘
```

### Communication Flow

```
User sends message in Electron UI
    ↓
WebSocket → Python Backend
    ↓
DeepAgent processes (with streaming)
    ↓
Stream chunks back via WebSocket
    ↓
React UI updates in real-time
```

---

## Implementation Plan

### Phase 1: Python Backend Setup

#### Step 1.1: Install Dependencies
```bash
cd author
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install deepagents
pip install fastapi uvicorn
pip install websockets
pip install langchain langchain-openai
pip install python-dotenv
```

#### Step 1.2: Create Backend Structure
```
author/
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── agent_service.py     # DeepAgents wrapper
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── file_tools.py    # Real file operations
│   │   └── db_tools.py      # Database operations
│   ├── prompts/
│   │   ├── __init__.py
│   │   ├── main_agent.py    # Use our production prompts!
│   │   └── subagents.py
│   └── models/
│       ├── __init__.py
│       └── schemas.py
```

#### Step 1.3: Create FastAPI Server
```python
# backend/main.py
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json

app = FastAPI()

# CORS for Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/agent")
async def agent_websocket(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Receive message from Electron
            data = await websocket.receive_json()
            
            # Process with DeepAgent
            async for chunk in process_with_agent(data):
                await websocket.send_json(chunk)
                
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
    finally:
        await websocket.close()

async def process_with_agent(data):
    # Will implement with DeepAgents
    pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765)
```

### Phase 2: DeepAgents Integration

#### Step 2.1: Create Agent Service
```python
# backend/agent_service.py
from deepagents import async_create_deep_agent
from langchain_openai import ChatOpenAI
from backend.tools.file_tools import create_file_tools
from backend.prompts.main_agent import MAIN_AGENT_PROMPT
from backend.prompts.subagents import SUBAGENT_CONFIGS
import os

class AgentService:
    def __init__(self, project_path: str):
        self.project_path = project_path
        
        # Initialize model (OpenRouter)
        self.model = ChatOpenAI(
            api_key=os.getenv("CLAUDE_API_KEY"),
            base_url=os.getenv("CLAUDE_API_BASE_URL"),
            model=os.getenv("CLAUDE_MODEL"),
        )
        
        # Create custom tools for real file operations
        self.tools = create_file_tools(project_path)
        
        # Create agent with our production prompts
        self.agent = async_create_deep_agent(
            tools=self.tools,
            instructions=MAIN_AGENT_PROMPT,  # Use our prompts!
            model=self.model,
            subagents=SUBAGENT_CONFIGS,  # Our subagents
        )
    
    async def stream_response(self, user_message: str):
        """Stream agent response"""
        async for chunk in self.agent.astream(
            {
                "messages": [
                    {"role": "user", "content": user_message}
                ]
            },
            stream_mode="values"
        ):
            # Extract and yield relevant data
            if "messages" in chunk:
                last_message = chunk["messages"][-1]
                yield {
                    "type": "message",
                    "content": last_message.content,
                    "role": last_message.type
                }
            
            if "todos" in chunk:
                yield {
                    "type": "todos",
                    "data": chunk["todos"]
                }
```

#### Step 2.2: Create Real File Tools
```python
# backend/tools/file_tools.py
from langchain_core.tools import tool
import os
from pathlib import Path

def create_file_tools(project_path: str):
    """Create tools for real file operations"""
    
    @tool
    def read_real_file(file_path: str) -> str:
        """Read a real file from the project"""
        full_path = os.path.join(project_path, file_path)
        if not os.path.exists(full_path):
            return f"Error: File '{file_path}' not found"
        
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    @tool
    def write_real_file(file_path: str, content: str) -> str:
        """Write to a real file in the project"""
        full_path = os.path.join(project_path, file_path)
        
        # Create directory if needed
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return f"Successfully wrote to {file_path}"
    
    @tool
    def list_real_files(directory: str = ".") -> list[str]:
        """List real files in a directory"""
        full_path = os.path.join(project_path, directory)
        if not os.path.exists(full_path):
            return []
        
        return os.listdir(full_path)
    
    @tool
    def edit_real_file(
        file_path: str,
        old_string: str,
        new_string: str,
        replace_all: bool = False
    ) -> str:
        """Edit a real file"""
        full_path = os.path.join(project_path, file_path)
        
        if not os.path.exists(full_path):
            return f"Error: File '{file_path}' not found"
        
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if old_string not in content:
            return f"Error: String not found in file"
        
        if replace_all:
            new_content = content.replace(old_string, new_string)
        else:
            new_content = content.replace(old_string, new_string, 1)
        
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        return f"Successfully edited {file_path}"
    
    return [
        read_real_file,
        write_real_file,
        list_real_files,
        edit_real_file
    ]
```

#### Step 2.3: Use Our Production Prompts
```python
# backend/prompts/main_agent.py
# Copy from src/agents/prompts/main-agent-prompt.ts
# Convert to Python string

MAIN_AGENT_PROMPT = """You are an expert AI writing assistant specialized in helping authors create books...

[EXACT SAME CONTENT AS OUR TYPESCRIPT VERSION]
"""

# backend/prompts/subagents.py
PLANNING_AGENT_PROMPT = """..."""  # Our planning prompt
WRITING_AGENT_PROMPT = """..."""   # Our writing prompt
EDITING_AGENT_PROMPT = """..."""   # Our editing prompt

SUBAGENT_CONFIGS = [
    {
        "name": "planning-agent",
        "description": "Expert at creating book outlines...",
        "prompt": PLANNING_AGENT_PROMPT,
        "tools": ["read_real_file", "write_real_file"],
    },
    {
        "name": "writing-agent",
        "description": "Specialized in writing prose...",
        "prompt": WRITING_AGENT_PROMPT,
        "tools": ["read_real_file", "write_real_file", "edit_real_file"],
    },
    {
        "name": "editing-agent",
        "description": "Expert editor for refining...",
        "prompt": EDITING_AGENT_PROMPT,
        "tools": ["read_real_file", "edit_real_file"],
    }
]
```

### Phase 3: Electron Integration

#### Step 3.1: Spawn Python Backend
```typescript
// src/main/services/python-backend-manager.ts
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

export class PythonBackendManager {
  private process: ChildProcess | null = null;
  private port = 8765;

  async start(): Promise<void> {
    const pythonPath = path.join(__dirname, '../../backend/venv/Scripts/python.exe');
    const scriptPath = path.join(__dirname, '../../backend/main.py');

    this.process = spawn(pythonPath, [scriptPath], {
      stdio: 'pipe',
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'
      }
    });

    this.process.stdout?.on('data', (data) => {
      console.log(`Python: ${data}`);
    });

    this.process.stderr?.on('data', (data) => {
      console.error(`Python Error: ${data}`);
    });

    // Wait for server to start
    await this.waitForServer();
  }

  private async waitForServer(): Promise<void> {
    // Poll until server responds
    for (let i = 0; i < 30; i++) {
      try {
        const response = await fetch(`http://127.0.0.1:${this.port}/health`);
        if (response.ok) return;
      } catch (e) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Python backend failed to start');
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}
```

#### Step 3.2: WebSocket Client
```typescript
// src/main/services/deepagent-service.ts
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { AgentMessage } from '@shared/types';

export class DeepAgentService extends EventEmitter {
  private ws: WebSocket | null = null;
  private wsUrl = 'ws://127.0.0.1:8765/ws/agent';

  async connect(): Promise<void> {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.on('open', () => {
      console.log('Connected to Python backend');
      this.emit('connected');
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleMessage(message);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    this.ws.on('close', () => {
      console.log('Disconnected from Python backend');
      this.emit('disconnected');
    });
  }

  async sendMessage(prompt: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to backend');
    }

    this.ws.send(JSON.stringify({
      type: 'message',
      content: prompt
    }));
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'message':
        this.emit('message', {
          content: message.content,
          role: message.role
        });
        break;
      
      case 'stream-chunk':
        this.emit('stream-chunk', { content: message.content });
        break;
      
      case 'todos':
        this.emit('todos', message.data);
        break;
      
      case 'error':
        this.emit('error', new Error(message.message));
        break;
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

#### Step 3.3: Update AgentManager
```typescript
// src/main/services/agent-manager.ts
import { DeepAgentService } from './deepagent-service';

export class AgentManager {
  private agentService: DeepAgentService;
  private pythonBackend: PythonBackendManager;

  constructor(
    virtualFileManager: VirtualFileManager,
    databaseManager: DatabaseManager
  ) {
    this.pythonBackend = new PythonBackendManager();
    this.agentService = new DeepAgentService();
    
    // Setup event listeners (same as before)
    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    // Start Python backend
    await this.pythonBackend.start();
    
    // Connect to WebSocket
    await this.agentService.connect();
  }

  async executeQuery(prompt: string): Promise<void> {
    await this.agentService.sendMessage(prompt);
  }

  async shutdown(): Promise<void> {
    this.agentService.disconnect();
    this.pythonBackend.stop();
  }
}
```

---

## Benefits of This Approach

### ✅ Advantages

1. **No Subscription Required**
   - Use ANY model provider
   - OpenRouter, OpenAI, Anthropic, Groq, etc.
   - Full control over costs

2. **Full Customization**
   - Modify agents however you want
   - Add custom tools easily
   - Complete control over behavior

3. **Real File Operations**
   - Custom tools for actual file system
   - Not limited to virtual files
   - Full integration with project files

4. **Production Prompts Still Work**
   - Copy our TypeScript prompts to Python
   - Same quality, same patterns
   - Nothing wasted!

5. **Keep Existing Frontend**
   - No changes to React UI
   - No changes to Electron structure
   - Just connect to Python backend

6. **Better Than Claude SDK**
   - No desktop app dependency
   - More flexible
   - More powerful

### ⚠️ Challenges

1. **Python Dependency**
   - Need Python runtime
   - Package with Electron app

2. **Cross-Language Communication**
   - WebSocket adds complexity
   - But it's well-documented

3. **Deployment**
   - Need to bundle Python with Electron
   - Use `pyinstaller` or similar

---

## Deployment Strategy

### Option 1: Bundle Python with Electron
```javascript
// Use electron-builder to package Python
{
  "extraResources": [
    {
      "from": "backend/dist",
      "to": "python",
      "filter": ["**/*"]
    }
  ]
}
```

### Option 2: Require Python Installation
- User installs Python separately
- Simpler build process
- More maintenance for users

### Option 3: Use PyInstaller
```bash
# Create standalone executable
cd backend
pyinstaller --onefile main.py
```

---

## Migration Path

### Phase 1: Setup (1-2 days)
- [ ] Create Python backend structure
- [ ] Install DeepAgents
- [ ] Create FastAPI server
- [ ] Test WebSocket communication

### Phase 2: Agent Implementation (2-3 days)
- [ ] Port production prompts to Python
- [ ] Create real file tools
- [ ] Integrate DeepAgents
- [ ] Test agent behavior

### Phase 3: Frontend Integration (1-2 days)
- [ ] Update AgentManager
- [ ] Implement WebSocket client
- [ ] Test streaming
- [ ] Test todo lists

### Phase 4: Testing & Polish (2-3 days)
- [ ] End-to-end testing
- [ ] Error handling
- [ ] Performance optimization
- [ ] Documentation

**Total Estimate: 1-2 weeks**

---

## Recommendation

✅ **PROCEED WITH DEEPAGENTS**

**Why:**
1. More flexible than Claude SDK
2. No subscription required
3. Supports all LLM providers
4. Our prompts are still valuable
5. Better long-term solution
6. Active development and community

**Next Steps:**
1. Create Python backend structure
2. Install DeepAgents and dependencies
3. Port our production prompts
4. Create custom file tools
5. Integrate with Electron

**This gives us the best of both worlds:**
- Keep our Electron frontend
- Get sophisticated agent behavior
- Use any model provider
- Full control and customization

---

## Questions?

1. **Does this maintain all current features?**
   ✅ Yes! Even better - adds subagents and planning

2. **Can we use OpenRouter?**
   ✅ Yes! LangChain supports all providers

3. **Is streaming supported?**
   ✅ Yes! Built-in with LangGraph

4. **Can we add custom tools?**
   ✅ Yes! Easy to add any Python function

5. **Do our prompts work?**
   ✅ Yes! Just port to Python strings

**Ready to start implementing?**
