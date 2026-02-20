from openai import OpenAI

from app.domain.memo.services.embedding_client import IEmbeddingClient

_DEFAULT_MODEL = "text-embedding-3-small"
_DIMENSION = 1536


class OpenAIEmbeddingClient(IEmbeddingClient):
    """OpenAI API implementation of IEmbeddingClient."""

    def __init__(
        self, api_key: str, model: str = _DEFAULT_MODEL
    ) -> None:
        self._client = OpenAI(api_key=api_key)
        self._model = model

    def embed(self, text: str) -> list[float]:
        response = self._client.embeddings.create(
            model=self._model,
            input=text,
        )
        return response.data[0].embedding

    def dimension(self) -> int:
        return _DIMENSION
