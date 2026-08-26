"""Agent base types."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class AgentResult:
    agent: str
    success: bool
    data: dict[str, Any] = field(default_factory=dict)
    message: str = ""
    error: str | None = None


class BaseAgent:
    name: str = "base"

    def run(self, payload: dict[str, Any], context: dict[str, Any] | None = None) -> AgentResult:
        raise NotImplementedError
