from uuid import UUID

from sqlalchemy.orm import Session, sessionmaker

from app.domain.memo.entities.memo import Memo
from app.domain.memo.repositories.memo_repository import IMemoRepository
from app.infrastructure.memo.db.models.memo_model import MemoRow


class PostgresMemoRepository(IMemoRepository):
    """PostgreSQL implementation of IMemoRepository."""

    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def save(self, memo: Memo) -> None:
        with self._session_factory() as session:
            row = MemoRow(
                id=memo.id,
                content=memo.content,
                summary=memo.summary,
                tags=memo.tags,
                created_at=memo.created_at,
            )
            session.merge(row)
            session.commit()

    def get_all(self) -> list[Memo]:
        with self._session_factory() as session:
            rows = session.query(MemoRow).order_by(MemoRow.created_at.desc()).all()
            return [self._to_domain(row) for row in rows]

    def get_by_id(self, memo_id: UUID) -> Memo | None:
        with self._session_factory() as session:
            row = session.get(MemoRow, memo_id)
            if row is None:
                return None
            return self._to_domain(row)

    @staticmethod
    def _to_domain(row: MemoRow) -> Memo:
        return Memo(
            id=row.id,
            content=row.content,
            summary=row.summary,
            tags=row.tags,
            created_at=row.created_at,
        )
