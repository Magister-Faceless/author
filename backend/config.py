"""Configuration for the backend service"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Configuration
OPENROUTER_API_KEY = os.getenv("CLAUDE_API_KEY", "")
OPENAI_BASE_URL = os.getenv("CLAUDE_API_BASE_URL", "https://openrouter.ai/api/v1")
PRIMARY_MODEL = os.getenv("CLAUDE_MODEL", "x-ai/grok-4-fast")
SUBAGENT_MODEL = os.getenv("SUBAGENT_MODEL", "alibaba/tongyi-deepresearch-30b-a3b")

# Server Configuration
HOST = os.getenv("BACKEND_HOST", "127.0.0.1")
PORT = int(os.getenv("BACKEND_PORT", "8765"))

# Paths
BACKEND_DIR = Path(__file__).parent
PROJECT_ROOT = BACKEND_DIR.parent

# Limits
MAX_TURNS = 20
MAX_TOKENS = 8192
STREAM_DELAY = 0  # No delay for instant streaming
