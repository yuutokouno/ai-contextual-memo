from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.models import Memo


class IMemoRepository(ABC):
    """Interface for memo persistence operations."""

    @abstractmethod
    def save(self, memo: Memo) -> None: ...

    @abstractmethod
    def get_all(self) -> list[Memo]: ...

    @abstractmethod
    def get_by_id(self, memo_id: UUID) -> Memo | None: ...
