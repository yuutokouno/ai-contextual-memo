import pytest

from app.application.memo.memo_usecase import MemoUsecase
from app.domain.memo.entities.memo import Memo
from app.infrastructure.memo.db.repositories.in_memory_memo_repository import (
    InMemoryMemoRepository,
)
from tests.conftest import StubAIClient, StubEmbeddingClient


@pytest.fixture
def repository() -> InMemoryMemoRepository:
    return InMemoryMemoRepository()


@pytest.fixture
def embedding_client() -> StubEmbeddingClient:
    return StubEmbeddingClient()


@pytest.fixture
def usecase(
    repository: InMemoryMemoRepository,
    stub_ai_client: StubAIClient,
    embedding_client: StubEmbeddingClient,
) -> MemoUsecase:
    return MemoUsecase(
        repository=repository,
        ai_client=stub_ai_client,
        embedding_client=embedding_client,
    )


@pytest.mark.unit
class TestCreateMemoWithEmbedding:
    def test_作成時にembeddingが保存される(self, usecase: MemoUsecase) -> None:
        memo = usecase.create_memo("Python is great")

        assert memo.embedding is not None
        assert isinstance(memo.embedding, list)
        assert len(memo.embedding) == 384

    def test_更新時にembeddingが再生成される(self, usecase: MemoUsecase) -> None:
        memo = usecase.create_memo("original")
        original_embedding = memo.embedding

        updated = usecase.update_memo(memo.id, "updated content")

        assert updated is not None
        assert updated.embedding is not None
        assert updated.embedding != original_embedding


@pytest.mark.unit
class TestVectorSearch:
    def test_検索がベクトル検索を使っている(self, usecase: MemoUsecase) -> None:
        usecase.create_memo("Python tips")
        usecase.create_memo("Docker guide")

        result = usecase.search_memos("Python")

        assert result.answer is not None
        assert isinstance(result.related_memo_ids, list)

    def test_embeddingがNoneのメモは検索から除外される(
        self,
        repository: InMemoryMemoRepository,
        stub_ai_client: StubAIClient,
        embedding_client: StubEmbeddingClient,
    ) -> None:
        # Manually save a memo without embedding
        memo_no_vec = Memo(content="no vector")
        repository.save(memo_no_vec)

        # Save a memo with embedding via usecase
        usecase = MemoUsecase(
            repository=repository,
            ai_client=stub_ai_client,
            embedding_client=embedding_client,
        )
        usecase.create_memo("has vector")

        results = repository.search_by_vector(embedding_client.embed("query"), limit=10)

        ids = [m.id for m in results]
        assert memo_no_vec.id not in ids

    def test_InMemoryのコサイン類似度検索が正しく動く(
        self, repository: InMemoryMemoRepository
    ) -> None:
        # Create memos with known embeddings
        memo_a = Memo(content="a", embedding=[1.0, 0.0, 0.0])
        memo_b = Memo(content="b", embedding=[0.0, 1.0, 0.0])
        memo_c = Memo(content="c", embedding=[0.9, 0.1, 0.0])
        repository.save(memo_a)
        repository.save(memo_b)
        repository.save(memo_c)

        results = repository.search_by_vector([1.0, 0.0, 0.0], limit=2)

        assert len(results) == 2
        # memo_a (exact match) and memo_c (close) should be top 2
        result_ids = {m.id for m in results}
        assert memo_a.id in result_ids
        assert memo_c.id in result_ids

    def test_空リポジトリでベクトル検索は空リストを返す(
        self, repository: InMemoryMemoRepository
    ) -> None:
        results = repository.search_by_vector([1.0, 0.0, 0.0], limit=5)
        assert results == []
