import os
from dataclasses import dataclass
from typing import Protocol


class AIBackendError(RuntimeError):
    """Raised when a configured AI provider cannot complete a request."""


class GroundedAnswerBackend(Protocol):
    name: str

    def answer(self, question: str, evidence: list[str]) -> str:
        """Return an answer using only the supplied evidence."""


@dataclass
class LocalTestBackend:
    """Deterministic test double; it never calls a paid provider."""

    name: str = "test-double"

    def answer(self, question: str, evidence: list[str]) -> str:
        if not evidence:
            return "I do not have enough evidence to answer safely."
        return f"Based on the knowledge articles: {evidence[0]}"


class ClaudeBackend:
    name = "claude"

    def __init__(self) -> None:
        try:
            import anthropic
        except ImportError as error:  # pragma: no cover - depends on environment
            raise AIBackendError("Install the anthropic package to use Claude.") from error
        self._client = anthropic.Anthropic()

    def answer(self, question: str, evidence: list[str]) -> str:
        if not evidence:
            return "I do not have enough evidence to answer safely."
        prompt = (
            "You are a careful product-support assistant. Answer the question using only the "
            "evidence below. Do not invent facts. If the evidence is insufficient, say so.\n\n"
            f"Question: {question}\n\nEvidence:\n- " + "\n- ".join(evidence)
        )
        try:
            message = self._client.messages.create(
                model=os.getenv("CLAUDE_MODEL", "claude-haiku-4-5"),
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception as error:  # provider errors include billing and auth failures
            raise AIBackendError(f"Claude request failed: {error}") from error
        text_blocks = [block.text for block in message.content if getattr(block, "type", None) == "text"]
        if not text_blocks:
            raise AIBackendError("Claude returned no text content.")
        return "\n".join(text_blocks).strip()


def get_backend() -> GroundedAnswerBackend:
    configured = os.getenv("AI_BACKEND", "test").lower()
    if configured == "claude":
        return ClaudeBackend()
    return LocalTestBackend()
