import os

from dotenv import load_dotenv

from app.domain.repository_interface import IMemoRepository
from app.infrastructure.claude_client import ClaudeClient
from app.infrastructure.database import create_session_factory
from app.infrastructure.in_memory_memo_repository import InMemoryMemoRepository
from app.infrastructure.postgres_memo_repository import PostgresMemoRepository
from app.usecase.memo_usecase import MemoUsecase

load_dotenv()


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
