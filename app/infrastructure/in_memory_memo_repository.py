from uuid import UUID

from app.domain.models import Memo
from app.domain.repository_interface import IMemoRepository


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
