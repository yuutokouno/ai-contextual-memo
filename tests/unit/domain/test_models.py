from datetime import datetime
from uuid import UUID, uuid4

import pytest

from app.domain.models import Memo


@pytest.mark.unit
class TestMemo:
    def test_デフォルト値でメモが生成される(self) -> None:
        memo = Memo(content="test content")

        assert isinstance(memo.id, UUID)
        assert memo.content == "test content"
        assert memo.summary is None
        assert memo.tags == []
        assert isinstance(memo.created_at, datetime)

    def test_明示的な値でメモが生成される(self) -> None:
        memo_id = uuid4()
        now = datetime(2026, 2, 18, 12, 0, 0)

        memo = Memo(
            id=memo_id,
            content="explicit content",
            summary="explicit summary",
            tags=["tag1", "tag2"],
            created_at=now,
        )

        assert memo.id == memo_id
        assert memo.content == "explicit content"
        assert memo.summary == "explicit summary"
        assert memo.tags == ["tag1", "tag2"]
        assert memo.created_at == now

    def test_メモごとにユニークなIDが生成される(self) -> None:
        memo1 = Memo(content="first")
        memo2 = Memo(content="second")

        assert memo1.id != memo2.id

    def test_summaryとtagsが後から更新できる(self) -> None:
        memo = Memo(content="original")
        assert memo.summary is None
        assert memo.tags == []

        memo.summary = "updated summary"
        memo.tags = ["new-tag"]

        assert memo.summary == "updated summary"
        assert memo.tags == ["new-tag"]
