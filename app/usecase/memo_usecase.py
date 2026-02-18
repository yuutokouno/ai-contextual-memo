import logging
from uuid import UUID

from app.domain.ai_client_interface import IAIClient, SearchResult
from app.domain.models import Memo
from app.domain.repository_interface import IMemoRepository

logger = logging.getLogger(__name__)


class MemoUsecase:
    """Application service for memo operations."""

    def __init__(
        self,
        repository: IMemoRepository,
        ai_client: IAIClient,
    ) -> None:
        self._repository = repository
        self._ai_client = ai_client

    def create_memo(self, content: str) -> Memo:
        memo = Memo(content=content)

        analysis = self._ai_client.analyze_memo(content)
        memo.summary = analysis.summary
        memo.tags = analysis.tags

        self._repository.save(memo)
        logger.info("Memo created: id=%s", memo.id)
        return memo

    def get_all_memos(self) -> list[Memo]:
        return self._repository.get_all()

    def get_memo_by_id(self, memo_id: UUID) -> Memo | None:
        return self._repository.get_by_id(memo_id)

    def search_memos(self, query: str) -> SearchResult:
        memos = self._repository.get_all()
        return self._ai_client.search_memos(query, memos)
