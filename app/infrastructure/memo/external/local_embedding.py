from sentence_transformers import SentenceTransformer

from app.domain.memo.services.embedding_client import IEmbeddingClient

_DEFAULT_MODEL = "all-MiniLM-L6-v2"
_DIMENSION = 384


class LocalEmbeddingClient(IEmbeddingClient):
    """Offline embedding using sentence-transformers."""

    def __init__(self, model_name: str = _DEFAULT_MODEL) -> None:
        self._model = SentenceTransformer(model_name)

    def embed(self, text: str) -> list[float]:
        vector = self._model.encode(text)
        return vector.tolist()

    def dimension(self) -> int:
        return _DIMENSION
