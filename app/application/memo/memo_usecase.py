import logging
import os
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID

from app.domain.memo.entities.memo import Memo
from app.domain.memo.repositories.memo_repository import IMemoRepository
from app.domain.memo.services.ai_client import IAIClient, SearchResult
from app.domain.memo.services.embedding_client import IEmbeddingClient
from app.domain.memo.services.similarity import cosine_similarity

logger = logging.getLogger(__name__)

_MAX_LABEL_LENGTH = 30


@dataclass
class GraphNode:
    id: str
    label: str
    content: str
    created_at: datetime
    tags: list[str] = field(default_factory=list)


@dataclass
class GraphEdge:
    source: str
    target: str
    similarity: float


@dataclass
class GraphData:
    nodes: list[GraphNode] = field(default_factory=list)
    edges: list[GraphEdge] = field(default_factory=list)


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

    def get_graph_data(self, threshold: float | None = None) -> GraphData:
        if threshold is None:
            threshold = float(os.environ.get("GRAPH_SIMILARITY_THRESHOLD", "0.7"))

        all_memos = self._repository.get_all()
        memos_with_embedding = [m for m in all_memos if m.embedding is not None]

        nodes = [
            GraphNode(
                id=str(m.id),
                label=m.summary if m.summary else m.content[:_MAX_LABEL_LENGTH],
                content=m.content,
                created_at=m.created_at,
                tags=m.tags,
            )
            for m in memos_with_embedding
        ]

        edges: list[GraphEdge] = []
        for i, memo_a in enumerate(memos_with_embedding):
            for memo_b in memos_with_embedding[i + 1 :]:
                assert memo_a.embedding is not None  # noqa: S101
                assert memo_b.embedding is not None  # noqa: S101
                sim = cosine_similarity(memo_a.embedding, memo_b.embedding)
                if sim >= threshold:
                    edges.append(
                        GraphEdge(
                            source=str(memo_a.id),
                            target=str(memo_b.id),
                            similarity=round(sim, 4),
                        )
                    )

        return GraphData(nodes=nodes, edges=edges)
