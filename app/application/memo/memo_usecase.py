import logging
import os
from collections.abc import Callable
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


@dataclass
class Position3D:
    x: float
    y: float
    z: float


@dataclass
class Graph3DNode:
    id: str
    label: str
    content: str
    created_at: datetime
    position: Position3D
    tags: list[str] = field(default_factory=list)


@dataclass
class Graph3DData:
    nodes: list[Graph3DNode] = field(default_factory=list)
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

    def _get_threshold(self, threshold: float | None) -> float:
        if threshold is not None:
            return threshold
        return float(os.environ.get("GRAPH_SIMILARITY_THRESHOLD", "0.7"))

    @staticmethod
    def _compute_edges(
        memos: list[Memo],
        threshold: float,
    ) -> list[GraphEdge]:
        edges: list[GraphEdge] = []
        for i, memo_a in enumerate(memos):
            for memo_b in memos[i + 1 :]:
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
        return edges

    def get_graph_data(self, threshold: float | None = None) -> GraphData:
        resolved_threshold = self._get_threshold(threshold)

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

        edges = self._compute_edges(memos_with_embedding, resolved_threshold)
        return GraphData(nodes=nodes, edges=edges)

    def get_graph_3d_data(
        self,
        reduce_fn: Callable[[list[list[float]]], list[dict[str, float]]],
        threshold: float | None = None,
    ) -> Graph3DData:
        resolved_threshold = self._get_threshold(threshold)

        all_memos = self._repository.get_all()
        memos_with_embedding = [m for m in all_memos if m.embedding is not None]

        if not memos_with_embedding:
            return Graph3DData()

        embeddings = [m.embedding for m in memos_with_embedding]
        # Type narrowing: embeddings are guaranteed non-None by the filter above
        positions = reduce_fn([e for e in embeddings if e is not None])

        nodes = [
            Graph3DNode(
                id=str(m.id),
                label=m.summary if m.summary else m.content[:_MAX_LABEL_LENGTH],
                content=m.content,
                created_at=m.created_at,
                tags=m.tags,
                position=Position3D(
                    x=pos["x"],
                    y=pos["y"],
                    z=pos["z"],
                ),
            )
            for m, pos in zip(memos_with_embedding, positions, strict=True)
        ]

        edges = self._compute_edges(memos_with_embedding, resolved_threshold)
        return Graph3DData(nodes=nodes, edges=edges)
