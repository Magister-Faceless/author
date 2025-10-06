"""
FastAPI server for Author backend with WebSocket streaming
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from services import AgentService
from config import HOST, PORT

# Create FastAPI app
app = FastAPI(
    title="Author Backend",
    description="DeepAgents-powered backend for Author application",
    version="1.0.0"
)

# CORS middleware for Electron app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global agent service (will be initialized per connection)
agent_services = {}


class MessageRequest(BaseModel):
    """Request model for sending messages"""
    message: str
    project_path: str
    thread_id: Optional[str] = None


class ProjectRequest(BaseModel):
    """Request model for changing project"""
    project_path: str


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Author Backend",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/api/project")
async def set_project(request: ProjectRequest):
    """Set the current project path"""
    try:
        # Validate project path exists
        project_path = Path(request.project_path)
        if not project_path.exists():
            raise HTTPException(status_code=404, detail="Project path not found")
        
        if not project_path.is_dir():
            raise HTTPException(status_code=400, detail="Project path must be a directory")
        
        return {
            "success": True,
            "project_path": str(project_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/agent")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time agent communication.
    
    Protocol:
    - Client sends: {"type": "init", "project_path": "...", "author_mode": "fiction"}
    - Client sends: {"type": "message", "content": "...", "thread_id": "..."}
    - Client sends: {"type": "change_mode", "mode": "non-fiction"}
    - Server sends: {"type": "stream-chunk", "content": "..."}
    - Server sends: {"type": "todos", "data": [...]}
    - Server sends: {"type": "complete"}
    - Server sends: {"type": "mode_changed", "mode": "..."}
    - Server sends: {"type": "error", "error": "..."}
    """
    await websocket.accept()
    print("[OK] WebSocket client connected")
    
    agent_service = None
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get("type")
            print(f"[WebSocket] Received message type: {message_type}")
            print(f"[WebSocket] Data: {data}")
            
            # Handle initialization
            if message_type == "init":
                project_path = data.get("project_path")
                author_mode = data.get("author_mode", "fiction")  # Default to fiction mode
                
                if not project_path:
                    await websocket.send_json({
                        "type": "error",
                        "error": "project_path is required for initialization"
                    })
                    continue
                
                # Create agent service with mode
                try:
                    agent_service = AgentService(project_path, author_mode=author_mode)
                    await websocket.send_json({
                        "type": "initialized",
                        "project_path": project_path,
                        "author_mode": author_mode
                    })
                    print(f"   Agent initialized for: {project_path}")
                    print(f"   Author mode: {author_mode}")
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "error": f"Failed to initialize agent: {str(e)}"
                    })
                    continue
            
            # Handle message
            elif message_type == "message":
                if not agent_service:
                    await websocket.send_json({
                        "type": "error",
                        "error": "Agent not initialized. Send 'init' first."
                    })
                    continue
                
                content = data.get("content", "")
                thread_id = data.get("thread_id")
                
                if not content:
                    await websocket.send_json({
                        "type": "error",
                        "error": "Message content is required"
                    })
                    continue
                
                # Send start event
                await websocket.send_json({
                    "type": "stream-start"
                })
                
                # Stream response
                try:
                    async for chunk in agent_service.stream_response(content, thread_id):
                        await websocket.send_json(chunk)
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "error": f"Agent error: {str(e)}"
                    })
            
            # Handle project change
            elif message_type == "change_project":
                if not agent_service:
                    await websocket.send_json({
                        "type": "error",
                        "error": "Agent not initialized"
                    })
                    continue
                
                new_project_path = data.get("project_path")
                if not new_project_path:
                    await websocket.send_json({
                        "type": "error",
                        "error": "project_path is required"
                    })
                    continue
                
                try:
                    agent_service.change_project(new_project_path)
                    await websocket.send_json({
                        "type": "project_changed",
                        "project_path": new_project_path
                    })
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "error": f"Failed to change project: {str(e)}"
                    })
            
            # Handle mode change
            elif message_type == "change_mode":
                if not agent_service:
                    await websocket.send_json({
                        "type": "error",
                        "error": "Agent not initialized"
                    })
                    continue
                
                new_mode = data.get("mode")
                if not new_mode:
                    await websocket.send_json({
                        "type": "error",
                        "error": "mode is required"
                    })
                    continue
                
                try:
                    agent_service.change_mode(new_mode)
                    await websocket.send_json({
                        "type": "mode_changed",
                        "mode": new_mode
                    })
                    print(f"   Author mode changed to: {new_mode}")
                except ValueError as e:
                    await websocket.send_json({
                        "type": "error",
                        "error": str(e)
                    })
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "error": f"Failed to change mode: {str(e)}"
                    })
            
            # Get current mode
            elif message_type == "get_mode":
                if not agent_service:
                    await websocket.send_json({
                        "type": "error",
                        "error": "Agent not initialized"
                    })
                    continue
                
                await websocket.send_json({
                    "type": "current_mode",
                    "mode": agent_service.get_current_mode()
                })
            
            else:
                await websocket.send_json({
                    "type": "error",
                    "error": f"Unknown message type: {message_type}"
                })
    
    except WebSocketDisconnect:
        print("❌ WebSocket client disconnected")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "error": str(e)
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


if __name__ == "__main__":
    import uvicorn
    
    print("=" * 50)
    print("  Author Backend Server")
    print("  Powered by DeepAgents & FastAPI")
    print("=" * 50)
    print(f"\nStarting server at http://{HOST}:{PORT}")
    print(f"WebSocket endpoint: ws://{HOST}:{PORT}/ws/agent")
    print("\nPress CTRL+C to stop\n")
    
    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        log_level="info"
    )
