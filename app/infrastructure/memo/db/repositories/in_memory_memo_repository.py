import math
from uuid import UUID

from app.domain.memo.entities.memo import Memo
from app.domain.memo.repositories.memo_repository import IMemoRepository


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class InMemoryMemoRepository(IMemoRepository):
    """In-memory implementation of IMemoRepository using a dict."""

    def __init__(self) -> None:
        self._storage: dict[UUID, Memo] = {}

    def save(self, memo: Memo) -> None:
        self._storage[memo.id] = memo

    def get_all(self) -> list[Memo]:
        return list(self._storage.values())

    def get_by_id(self, memo_id: UUID) -> Memo | None:
        return self._storage.get(memo_id)

    def delete(self, memo_id: UUID) -> bool:
        if memo_id in self._storage:
            del self._storage[memo_id]
            return True
        return False

    def search_by_vector(
        self, query_embedding: list[float], limit: int = 5
    ) -> list[Memo]:
        scored = [
            (memo, _cosine_similarity(query_embedding, memo.embedding))
            for memo in self._storage.values()
            if memo.embedding is not None
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [memo for memo, _ in scored[:limit]]
