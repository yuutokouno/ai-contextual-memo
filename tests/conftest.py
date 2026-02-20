import pytest

from app.domain.memo.entities.memo import Memo
from app.domain.memo.services.ai_client import (
    IAIClient,
    MemoAnalysisResult,
    SearchResult,
)
from app.domain.memo.services.embedding_client import IEmbeddingClient


class StubAIClient(IAIClient):
    """Stub AI client that returns fixed responses for testing."""

    def analyze_memo(self, content: str) -> MemoAnalysisResult:
        return MemoAnalysisResult(
            summary=f"Summary of: {content[:20]}",
            tags=["test-tag"],
        )

    def search_memos(self, query: str, memos: list[Memo]) -> SearchResult:
        return SearchResult(
            answer=f"Search result for: {query}",
            related_memo_ids=[str(m.id) for m in memos[:2]],
        )


class FailingAIClient(IAIClient):
    """AI client that always raises an error for error handling tests."""

    def analyze_memo(self, content: str) -> MemoAnalysisResult:
        raise RuntimeError("AI service unavailable")

    def search_memos(self, query: str, memos: list[Memo]) -> SearchResult:
        raise RuntimeError("AI service unavailable")


class StubEmbeddingClient(IEmbeddingClient):
    """Stub embedding client that returns deterministic vectors for testing."""

    def embed(self, text: str) -> list[float]:
        # Produce a simple deterministic vector from text hash
        h = hash(text) % (2**32)
        base = [(h >> i & 0xFF) / 255.0 for i in range(0, 32, 8)]
        return (base * 96)[:384]

    def dimension(self) -> int:
        return 384


@pytest.fixture
def stub_ai_client() -> StubAIClient:
    return StubAIClient()


@pytest.fixture
def failing_ai_client() -> FailingAIClient:
    return FailingAIClient()


@pytest.fixture
def stub_embedding_client() -> StubEmbeddingClient:
    return StubEmbeddingClient()
