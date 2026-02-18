from uuid import uuid4

import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.domain.models import Memo
from app.infrastructure.postgres_memo_repository import PostgresMemoRepository


@pytest.fixture
def repository(
    test_session_factory: sessionmaker[Session],
) -> PostgresMemoRepository:
    return PostgresMemoRepository(test_session_factory)


@pytest.mark.integration
class TestPostgresMemoRepository:
    def test_メモを保存してIDで取得できる(
        self, repository: PostgresMemoRepository
    ) -> None:
        memo = Memo(content="persist me", summary="summary", tags=["db"])
        repository.save(memo)

        found = repository.get_by_id(memo.id)

        assert found is not None
        assert found.id == memo.id
        assert found.content == "persist me"
        assert found.summary == "summary"
        assert found.tags == ["db"]

    def test_メモ一覧を作成日時の降順で取得できる(
        self, repository: PostgresMemoRepository
    ) -> None:
        memo1 = Memo(content="first")
        memo2 = Memo(content="second")
        repository.save(memo1)
        repository.save(memo2)

        all_memos = repository.get_all()

        assert len(all_memos) == 2
        assert all_memos[0].created_at >= all_memos[1].created_at

    def test_存在しないIDはNoneを返す(self, repository: PostgresMemoRepository) -> None:
        result = repository.get_by_id(uuid4())
        assert result is None

    def test_同じIDで保存すると上書きされる(
        self, repository: PostgresMemoRepository
    ) -> None:
        memo = Memo(content="original")
        repository.save(memo)

        memo.summary = "updated summary"
        memo.tags = ["updated"]
        repository.save(memo)

        found = repository.get_by_id(memo.id)
        assert found is not None
        assert found.summary == "updated summary"
        assert found.tags == ["updated"]

    def test_空のタグリストが正しく保存される(
        self, repository: PostgresMemoRepository
    ) -> None:
        memo = Memo(content="no tags")
        repository.save(memo)

        found = repository.get_by_id(memo.id)
        assert found is not None
        assert found.tags == []

    def test_空のリポジトリからget_allは空リストを返す(
        self, repository: PostgresMemoRepository
    ) -> None:
        result = repository.get_all()
        assert result == []
