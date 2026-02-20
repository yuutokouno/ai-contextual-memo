from uuid import uuid4

import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.domain.memo.entities.memo import Memo
from app.infrastructure.memo.db.repositories.memo_repository_impl import (
    PostgresMemoRepository,
)


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

    def test_メモを削除できる(self, repository: PostgresMemoRepository) -> None:
        memo = Memo(content="delete me")
        repository.save(memo)

        deleted = repository.delete(memo.id)

        assert deleted is True
        assert repository.get_by_id(memo.id) is None

    def test_存在しないIDの削除はFalseを返す(
        self, repository: PostgresMemoRepository
    ) -> None:
        result = repository.delete(uuid4())
        assert result is False

    def test_空のリポジトリからget_allは空リストを返す(
        self, repository: PostgresMemoRepository
    ) -> None:
        result = repository.get_all()
        assert result == []

    def test_embeddingを保存して取得できる(
        self, repository: PostgresMemoRepository
    ) -> None:
        embedding = [0.1] * 384
        memo = Memo(content="with vector", embedding=embedding)
        repository.save(memo)

        found = repository.get_by_id(memo.id)
        assert found is not None
        assert found.embedding is not None
        assert len(found.embedding) == 384

    def test_pgvectorでベクトル類似度検索ができる(
        self, repository: PostgresMemoRepository
    ) -> None:
        memo_a = Memo(content="a", embedding=[1.0] + [0.0] * 383)
        memo_b = Memo(content="b", embedding=[0.0] + [1.0] + [0.0] * 382)
        memo_c = Memo(content="c", embedding=[0.9] + [0.1] + [0.0] * 382)
        repository.save(memo_a)
        repository.save(memo_b)
        repository.save(memo_c)

        query_vec = [1.0] + [0.0] * 383
        results = repository.search_by_vector(query_vec, limit=2)

        assert len(results) == 2
        # memo_a should be the closest match
        assert results[0].content == "a"

    def test_embeddingがNoneのメモはベクトル検索から除外される(
        self, repository: PostgresMemoRepository
    ) -> None:
        memo_with = Memo(content="has vector", embedding=[0.5] * 384)
        memo_without = Memo(content="no vector")
        repository.save(memo_with)
        repository.save(memo_without)

        results = repository.search_by_vector([0.5] * 384, limit=10)

        ids = [m.id for m in results]
        assert memo_with.id in ids
        assert memo_without.id not in ids
