import os

from dotenv import load_dotenv

from app.application.memo.memo_usecase import MemoUsecase
from app.domain.memo.repositories.memo_repository import IMemoRepository
from app.domain.memo.services.embedding_client import IEmbeddingClient
from app.infrastructure.memo.db.database import create_session_factory
from app.infrastructure.memo.db.repositories.in_memory_memo_repository import (
    InMemoryMemoRepository,
)
from app.infrastructure.memo.db.repositories.memo_repository_impl import (
    PostgresMemoRepository,
)
from app.infrastructure.memo.external.claude_client import ClaudeClient

load_dotenv(override=True)


def _create_embedding_client() -> IEmbeddingClient | None:
    provider = os.environ.get("EMBEDDING_PROVIDER", "")
    if not provider:
        return None

    if provider == "openai":
        from app.infrastructure.memo.external.openai_embedding import (
            OpenAIEmbeddingClient,
        )

        return OpenAIEmbeddingClient(
            api_key=os.environ["OPENAI_API_KEY"],
        )

    from app.infrastructure.memo.external.local_embedding import (
        LocalEmbeddingClient,
    )

    return LocalEmbeddingClient()


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
        self._embedding_client = _create_embedding_client()
        self._memo_usecase = MemoUsecase(
            repository=self._repository,
            ai_client=self._ai_client,
            embedding_client=self._embedding_client,
        )

    @property
    def memo_usecase(self) -> MemoUsecase:
        return self._memo_usecase


container = Container()
