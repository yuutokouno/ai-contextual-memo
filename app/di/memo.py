import os

from dotenv import load_dotenv

from app.application.memo.memo_usecase import MemoUsecase
from app.domain.memo.repositories.memo_repository import IMemoRepository
from app.infrastructure.memo.db.database import create_session_factory
from app.infrastructure.memo.db.repositories.in_memory_memo_repository import (
    InMemoryMemoRepository,
)
from app.infrastructure.memo.db.repositories.memo_repository_impl import (
    PostgresMemoRepository,
)
from app.infrastructure.memo.external.claude_client import ClaudeClient

load_dotenv(override=True)


class Container:
    """DI container that wires concrete implementations to interfaces."""

    def __init__(self) -> None:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        database_url = os.environ.get("DATABASE_URL", "")

        self._repository: IMemoRepository
        if database_url:
            session_factory = create_session_factory(database_url)
            self._repository = PostgresMemoRepository(session_factory)
        else:
            self._repository = InMemoryMemoRepository()

        self._ai_client = ClaudeClient(api_key=api_key)
        self._memo_usecase = MemoUsecase(
            repository=self._repository,
            ai_client=self._ai_client,
        )

    @property
    def memo_usecase(self) -> MemoUsecase:
        return self._memo_usecase


container = Container()
