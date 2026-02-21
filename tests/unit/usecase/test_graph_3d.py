import math

import pytest

from app.application.memo.memo_usecase import MemoUsecase
from app.domain.memo.entities.memo import Memo
from app.infrastructure.memo.db.repositories.in_memory_memo_repository import (
    InMemoryMemoRepository,
)
from app.infrastructure.memo.external.pca_reducer import reduce_to_3d
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
class TestGraph3DData:
    def test_3Dノードにpositionが含まれる(
        self,
        repository: InMemoryMemoRepository,
        usecase: MemoUsecase,
    ) -> None:
        memo_a = Memo(content="Python basics", embedding=_unit_vector(0))
        memo_b = Memo(content="JavaScript", embedding=_unit_vector(90))
        repository.save(memo_a)
        repository.save(memo_b)

        graph = usecase.get_graph_3d_data(
            reduce_fn=reduce_to_3d,
            threshold=0.0,
        )

        assert len(graph.nodes) == 2
        for node in graph.nodes:
            assert hasattr(node, "position")
            assert hasattr(node.position, "x")
            assert hasattr(node.position, "y")
            assert hasattr(node.position, "z")

    def test_メモ1件の場合は原点に配置される(
        self,
        repository: InMemoryMemoRepository,
        usecase: MemoUsecase,
    ) -> None:
        memo = Memo(content="Single memo", embedding=[1.0, 0.0, 0.0])
        repository.save(memo)

        graph = usecase.get_graph_3d_data(
            reduce_fn=reduce_to_3d,
            threshold=0.0,
        )

        assert len(graph.nodes) == 1
        pos = graph.nodes[0].position
        assert pos.x == 0.0
        assert pos.y == 0.0
        assert pos.z == 0.0

    def test_座標がスケール範囲内に収まる(
        self,
        repository: InMemoryMemoRepository,
        usecase: MemoUsecase,
    ) -> None:
        for angle in range(0, 360, 30):
            memo = Memo(
                content=f"memo_{angle}",
                embedding=_unit_vector(angle),
            )
            repository.save(memo)

        graph = usecase.get_graph_3d_data(
            reduce_fn=reduce_to_3d,
            threshold=0.0,
        )

        for node in graph.nodes:
            assert -10.0 <= node.position.x <= 10.0
            assert -10.0 <= node.position.y <= 10.0
            assert -10.0 <= node.position.z <= 10.0
            # At least one coordinate reaches the boundary
        max_abs = max(
            max(abs(n.position.x), abs(n.position.y), abs(n.position.z))
            for n in graph.nodes
        )
        assert max_abs == pytest.approx(10.0, abs=0.01)

    def test_エッジが2Dグラフと一致する(
        self,
        repository: InMemoryMemoRepository,
        usecase: MemoUsecase,
    ) -> None:
        memo_a = Memo(content="Python basics", embedding=_unit_vector(0))
        memo_b = Memo(content="Cooking", embedding=_unit_vector(90))
        memo_c = Memo(content="Python advanced", embedding=_unit_vector(10))
        repository.save(memo_a)
        repository.save(memo_b)
        repository.save(memo_c)

        graph_2d = usecase.get_graph_data(threshold=0.7)
        graph_3d = usecase.get_graph_3d_data(
            reduce_fn=reduce_to_3d,
            threshold=0.7,
        )

        edges_2d = {
            (e.source, e.target, e.similarity) for e in graph_2d.edges
        }
        edges_3d = {
            (e.source, e.target, e.similarity) for e in graph_3d.edges
        }
        assert edges_2d == edges_3d
