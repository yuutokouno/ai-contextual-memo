import math

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
def usecase(
    repository: InMemoryMemoRepository,
    stub_ai_client: StubAIClient,
    stub_embedding_client: StubEmbeddingClient,
) -> MemoUsecase:
    return MemoUsecase(
        repository=repository,
        ai_client=stub_ai_client,
        embedding_client=stub_embedding_client,
    )


def _unit_vector(angle_deg: float) -> list[float]:
    """Create a 3D unit vector at a given angle in the XY plane."""
    rad = math.radians(angle_deg)
    return [math.cos(rad), math.sin(rad), 0.0]


@pytest.mark.unit
class TestGraphData:
    def test_グラフデータが正しく生成される(
        self, repository: InMemoryMemoRepository, usecase: MemoUsecase
    ) -> None:
        # memo_a and memo_c are close (10 degrees apart, cos~0.985)
        # memo_b is far from both (90 degrees, cos~0.0)
        memo_a = Memo(content="Python basics", embedding=_unit_vector(0))
        memo_b = Memo(content="Cooking recipes", embedding=_unit_vector(90))
        memo_c = Memo(content="Python advanced", embedding=_unit_vector(10))
        repository.save(memo_a)
        repository.save(memo_b)
        repository.save(memo_c)

        graph = usecase.get_graph_data(threshold=0.7)

        assert len(graph.nodes) == 3
        node_ids = {n.id for n in graph.nodes}
        assert str(memo_a.id) in node_ids
        assert str(memo_b.id) in node_ids
        assert str(memo_c.id) in node_ids

        # Only memo_a <-> memo_c should have similarity >= 0.7
        assert len(graph.edges) == 1
        edge = graph.edges[0]
        edge_pair = {edge.source, edge.target}
        assert edge_pair == {str(memo_a.id), str(memo_c.id)}
        assert edge.similarity > 0.9

    def test_embeddingなしメモはノードに含まれない(
        self, repository: InMemoryMemoRepository, usecase: MemoUsecase
    ) -> None:
        memo_with = Memo(content="has embedding", embedding=[1.0, 0.0, 0.0])
        memo_without = Memo(content="no embedding")
        repository.save(memo_with)
        repository.save(memo_without)

        graph = usecase.get_graph_data(threshold=0.5)

        node_ids = {n.id for n in graph.nodes}
        assert str(memo_with.id) in node_ids
        assert str(memo_without.id) not in node_ids

    def test_メモが0件なら空のグラフ(self, usecase: MemoUsecase) -> None:
        graph = usecase.get_graph_data(threshold=0.7)

        assert graph.nodes == []
        assert graph.edges == []

    def test_類似度の閾値を変更できる(
        self, repository: InMemoryMemoRepository, usecase: MemoUsecase
    ) -> None:
        # Two vectors 30 degrees apart: cos(30) ~ 0.866
        memo_a = Memo(content="a", embedding=_unit_vector(0))
        memo_b = Memo(content="b", embedding=_unit_vector(30))
        repository.save(memo_a)
        repository.save(memo_b)

        # threshold=0.7 -> edge exists
        graph_low = usecase.get_graph_data(threshold=0.7)
        assert len(graph_low.edges) == 1

        # threshold=0.9 -> edge removed
        graph_high = usecase.get_graph_data(threshold=0.9)
        assert len(graph_high.edges) == 0
