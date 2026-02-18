import pytest

from app.domain.ai_client_interface import (
    IAIClient,
    MemoAnalysisResult,
    SearchResult,
)
from app.domain.models import Memo


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


@pytest.fixture
def stub_ai_client() -> StubAIClient:
    return StubAIClient()


@pytest.fixture
def failing_ai_client() -> FailingAIClient:
    return FailingAIClient()
