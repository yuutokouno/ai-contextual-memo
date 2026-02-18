import os

from dotenv import load_dotenv

from app.infrastructure.claude_client import ClaudeClient
from app.infrastructure.in_memory_memo_repository import InMemoryMemoRepository
from app.usecase.memo_usecase import MemoUsecase

load_dotenv()


class Container:
    """DI container that wires concrete implementations to interfaces."""

    def __init__(self) -> None:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")

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
