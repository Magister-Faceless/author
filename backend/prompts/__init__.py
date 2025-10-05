"""Prompts for Author agents"""

from .main_agent import MAIN_AGENT_INSTRUCTIONS
from .subagents import (
    PLANNING_AGENT_CONFIG,
    WRITING_AGENT_CONFIG,
    EDITING_AGENT_CONFIG,
    get_all_subagents
)

__all__ = [
    "MAIN_AGENT_INSTRUCTIONS",
    "PLANNING_AGENT_CONFIG",
    "WRITING_AGENT_CONFIG",
    "EDITING_AGENT_CONFIG",
    "get_all_subagents",
]
