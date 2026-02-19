from uuid import uuid4

import pytest

from app.application.memo.memo_usecase import MemoUsecase
from app.domain.memo.repositories.memo_repository import IMemoRepository
from app.infrastructure.memo.db.repositories.in_memory_memo_repository import (
    InMemoryMemoRepository,
)
from tests.conftest import FailingAIClient, StubAIClient


@pytest.fixture
def repository() -> InMemoryMemoRepository:
    return InMemoryMemoRepository()


@pytest.fixture
def usecase(repository: IMemoRepository, stub_ai_client: StubAIClient) -> MemoUsecase:
    return MemoUsecase(repository=repository, ai_client=stub_ai_client)


@pytest.mark.unit
class TestCreateMemo:
    def test_メモ作成時にAI解析結果が反映される(self, usecase: MemoUsecase) -> None:
        memo = usecase.create_memo("Python is great")

        assert memo.content == "Python is great"
        assert memo.summary is not None
        assert len(memo.tags) > 0

    def test_メモ作成後にリポジトリに保存される(
        self, usecase: MemoUsecase, repository: InMemoryMemoRepository
    ) -> None:
        memo = usecase.create_memo("saved content")

        stored = repository.get_by_id(memo.id)
        assert stored is not None
        assert stored.content == "saved content"

    def test_AI障害時にエラーが伝播する(
        self,
        repository: InMemoryMemoRepository,
        failing_ai_client: FailingAIClient,
    ) -> None:
        usecase = MemoUsecase(repository=repository, ai_client=failing_ai_client)

        with pytest.raises(RuntimeError, match="AI service unavailable"):
            usecase.create_memo("will fail")

        assert repository.get_all() == []


@pytest.mark.unit
class TestGetMemos:
    def test_メモ一覧が取得できる(self, usecase: MemoUsecase) -> None:
        usecase.create_memo("first")
        usecase.create_memo("second")

        memos = usecase.get_all_memos()
        assert len(memos) == 2

    def test_メモが空の場合は空リストを返す(self, usecase: MemoUsecase) -> None:
        memos = usecase.get_all_memos()
        assert memos == []

    def test_IDでメモを取得できる(self, usecase: MemoUsecase) -> None:
        created = usecase.create_memo("find me")

        found = usecase.get_memo_by_id(created.id)
        assert found is not None
        assert found.content == "find me"

    def test_存在しないIDはNoneを返す(self, usecase: MemoUsecase) -> None:
        result = usecase.get_memo_by_id(uuid4())
        assert result is None


@pytest.mark.unit
class TestUpdateMemo:
    def test_メモ内容を更新するとAI再解析される(self, usecase: MemoUsecase) -> None:
        memo = usecase.create_memo("original")

        updated = usecase.update_memo(memo.id, "updated content")

        assert updated is not None
        assert updated.content == "updated content"
        assert updated.summary is not None

    def test_存在しないIDの更新はNoneを返す(self, usecase: MemoUsecase) -> None:
        result = usecase.update_memo(uuid4(), "content")
        assert result is None


@pytest.mark.unit
class TestDeleteMemo:
    def test_メモを削除できる(
        self, usecase: MemoUsecase, repository: InMemoryMemoRepository
    ) -> None:
        memo = usecase.create_memo("delete me")

        deleted = usecase.delete_memo(memo.id)

        assert deleted is True
        assert repository.get_by_id(memo.id) is None

    def test_存在しないIDの削除はFalseを返す(self, usecase: MemoUsecase) -> None:
        result = usecase.delete_memo(uuid4())
        assert result is False


@pytest.mark.unit
class TestSearchMemos:
    def test_検索クエリでAI検索結果が返る(self, usecase: MemoUsecase) -> None:
        usecase.create_memo("Python tips")
        usecase.create_memo("Docker guide")

        result = usecase.search_memos("Python")

        assert "Python" in result.answer
        assert isinstance(result.related_memo_ids, list)

    def test_メモが空でも検索は実行できる(self, usecase: MemoUsecase) -> None:
        result = usecase.search_memos("anything")

        assert result.answer is not None

    def test_AI障害時に検索もエラーが伝播する(
        self,
        repository: InMemoryMemoRepository,
        failing_ai_client: FailingAIClient,
    ) -> None:
        usecase = MemoUsecase(repository=repository, ai_client=failing_ai_client)

        with pytest.raises(RuntimeError, match="AI service unavailable"):
            usecase.search_memos("query")
