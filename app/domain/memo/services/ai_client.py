from abc import ABC, abstractmethod

from pydantic import BaseModel, Field

from app.domain.memo.entities.memo import Memo


class MemoAnalysisResult(BaseModel):
    """Value object for AI-generated memo analysis."""

    summary: str
    tags: list[str] = Field(default_factory=list)


class SearchResult(BaseModel):
    """Value object for AI-powered search response."""

    answer: str
    related_memo_ids: list[str] = Field(default_factory=list)


class IAIClient(ABC):
    """Interface for AI analysis operations."""

    @abstractmethod
    def analyze_memo(self, content: str) -> MemoAnalysisResult: ...

    @abstractmethod
    def search_memos(self, query: str, memos: list[Memo]) -> SearchResult: ...
