"""Model configuration using OpenRouter"""

import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from langchain_openai import ChatOpenAI
from config import (
    OPENROUTER_API_KEY,
    OPENAI_BASE_URL,
    PRIMARY_MODEL,
    SUBAGENT_MODEL,
    MAX_TOKENS
)


def get_default_model():
    """Get the primary model for the main agent (via OpenRouter)"""
    if not OPENROUTER_API_KEY:
        raise ValueError(
            "CLAUDE_API_KEY not found. Please set it in your .env file"
        )
    
    return ChatOpenAI(
        model=PRIMARY_MODEL,
        temperature=0.7,
        max_tokens=MAX_TOKENS,
        timeout=60,
        max_retries=2,
        base_url=OPENAI_BASE_URL,
        api_key=OPENROUTER_API_KEY,
    )


def get_subagent_model():
    """Get the model for subagents (via OpenRouter)"""
    if not OPENROUTER_API_KEY:
        raise ValueError(
            "CLAUDE_API_KEY not found. Please set it in your .env file"
        )
    
    return ChatOpenAI(
        model=SUBAGENT_MODEL,
        temperature=0.7,
        max_tokens=MAX_TOKENS,
        timeout=60,
        max_retries=2,
        base_url=OPENAI_BASE_URL,
        api_key=OPENROUTER_API_KEY,
    )
