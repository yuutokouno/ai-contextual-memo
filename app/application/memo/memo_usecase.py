import logging
from uuid import UUID

from app.domain.memo.entities.memo import Memo
from app.domain.memo.repositories.memo_repository import IMemoRepository
from app.domain.memo.services.ai_client import IAIClient, SearchResult
from app.domain.memo.services.embedding_client import IEmbeddingClient

logger = logging.getLogger(__name__)


class MemoUsecase:
    """Application service for memo operations."""

    def __init__(
        self,
        repository: IMemoRepository,
        ai_client: IAIClient,
        embedding_client: IEmbeddingClient | None = None,
    ) -> None:
        self._repository = repository
        self._ai_client = ai_client
        self._embedding_client = embedding_client

    def create_memo(self, content: str) -> Memo:
        memo = Memo(content=content)

        analysis = self._ai_client.analyze_memo(content)
        memo.summary = analysis.summary
        memo.tags = analysis.tags

        if self._embedding_client is not None:
            memo.embedding = self._embedding_client.embed(content)

        self._repository.save(memo)
        logger.info("Memo created: id=%s", memo.id)
        return memo

    def get_all_memos(self) -> list[Memo]:
        return self._repository.get_all()

    def get_memo_by_id(self, memo_id: UUID) -> Memo | None:
        return self._repository.get_by_id(memo_id)

    def update_memo(self, memo_id: UUID, content: str) -> Memo | None:
        memo = self._repository.get_by_id(memo_id)
        if memo is None:
            return None

        memo.content = content
        analysis = self._ai_client.analyze_memo(content)
        memo.summary = analysis.summary
        memo.tags = analysis.tags

        if self._embedding_client is not None:
            memo.embedding = self._embedding_client.embed(content)

        self._repository.save(memo)
        logger.info("Memo updated: id=%s", memo.id)
        return memo

    def delete_memo(self, memo_id: UUID) -> bool:
        deleted = self._repository.delete(memo_id)
        if deleted:
            logger.info("Memo deleted: id=%s", memo_id)
        return deleted

    def search_memos(self, query: str) -> SearchResult:
        if self._embedding_client is not None:
            query_embedding = self._embedding_client.embed(query)
            relevant_memos = self._repository.search_by_vector(query_embedding, limit=5)
        else:
            relevant_memos = self._repository.get_all()

        return self._ai_client.search_memos(query, relevant_memos)
