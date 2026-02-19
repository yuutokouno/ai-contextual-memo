import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.application.memo.memo_usecase import MemoUsecase
from app.infrastructure.memo.db.repositories.memo_repository_impl import (
    PostgresMemoRepository,
)
from app.presentation.memo.api.memo_api import app, get_memo_usecase
from tests.conftest import FailingAIClient, StubAIClient


@pytest.fixture
def client(
    test_session_factory: sessionmaker[Session],
    stub_ai_client: StubAIClient,
) -> TestClient:
    """TestClient with real DB + stub AI client."""
    repository = PostgresMemoRepository(test_session_factory)
    usecase = MemoUsecase(repository=repository, ai_client=stub_ai_client)

    app.dependency_overrides[get_memo_usecase] = lambda: usecase
    client = TestClient(app)

    yield client

    app.dependency_overrides.clear()


@pytest.fixture
def failing_client(
    test_session_factory: sessionmaker[Session],
    failing_ai_client: FailingAIClient,
) -> TestClient:
    """TestClient with real DB + failing AI client for error tests."""
    repository = PostgresMemoRepository(test_session_factory)
    usecase = MemoUsecase(repository=repository, ai_client=failing_ai_client)

    app.dependency_overrides[get_memo_usecase] = lambda: usecase
    client = TestClient(app, raise_server_exceptions=False)

    yield client

    app.dependency_overrides.clear()


@pytest.mark.integration
class TestCreateMemoAPI:
    def test_メモ作成で201とレスポンスボディが返る(self, client: TestClient) -> None:
        response = client.post("/memos", json={"content": "API test memo"})

        assert response.status_code == 201
        data = response.json()
        assert data["content"] == "API test memo"
        assert data["summary"] is not None
        assert "id" in data
        assert "created_at" in data

    def test_contentが空文字でも作成できる(self, client: TestClient) -> None:
        response = client.post("/memos", json={"content": ""})
        assert response.status_code == 201

    def test_contentフィールドがない場合は422を返す(self, client: TestClient) -> None:
        response = client.post("/memos", json={})
        assert response.status_code == 422

    def test_リクエストボディが空の場合は422を返す(self, client: TestClient) -> None:
        response = client.post("/memos")
        assert response.status_code == 422


@pytest.mark.integration
class TestGetMemosAPI:
    def test_メモ一覧が取得できる(self, client: TestClient) -> None:
        client.post("/memos", json={"content": "memo 1"})
        client.post("/memos", json={"content": "memo 2"})

        response = client.get("/memos")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_メモが空の場合は空リストを返す(self, client: TestClient) -> None:
        response = client.get("/memos")

        assert response.status_code == 200
        assert response.json() == []


@pytest.mark.integration
class TestSearchMemosAPI:
    def test_検索クエリで結果が返る(self, client: TestClient) -> None:
        client.post("/memos", json={"content": "Python tips"})

        response = client.post("/memos/search", json={"query": "Python"})

        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "related_memo_ids" in data

    def test_queryフィールドがない場合は422を返す(self, client: TestClient) -> None:
        response = client.post("/memos/search", json={})
        assert response.status_code == 422


@pytest.mark.integration
class TestUpdateMemoAPI:
    def test_メモ内容を更新できる(self, client: TestClient) -> None:
        create_resp = client.post("/memos", json={"content": "original"})
        memo_id = create_resp.json()["id"]

        response = client.patch(f"/memos/{memo_id}", json={"content": "updated"})

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "updated"
        assert data["summary"] is not None

    def test_存在しないIDの更新は404を返す(self, client: TestClient) -> None:
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.patch(f"/memos/{fake_id}", json={"content": "x"})
        assert response.status_code == 404


@pytest.mark.integration
class TestDeleteMemoAPI:
    def test_メモを削除できる(self, client: TestClient) -> None:
        create_resp = client.post("/memos", json={"content": "delete me"})
        memo_id = create_resp.json()["id"]

        response = client.delete(f"/memos/{memo_id}")
        assert response.status_code == 204

        get_resp = client.get("/memos")
        assert len(get_resp.json()) == 0

    def test_存在しないIDの削除は404を返す(self, client: TestClient) -> None:
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.delete(f"/memos/{fake_id}")
        assert response.status_code == 404


@pytest.mark.integration
class TestErrorHandling:
    def test_AI障害時にメモ作成は500を返す(self, failing_client: TestClient) -> None:
        response = failing_client.post("/memos", json={"content": "will fail"})
        assert response.status_code == 500

    def test_AI障害時に検索は500を返す(self, failing_client: TestClient) -> None:
        response = failing_client.post("/memos/search", json={"query": "will fail"})
        assert response.status_code == 500
