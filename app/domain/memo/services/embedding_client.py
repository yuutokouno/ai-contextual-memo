from abc import ABC, abstractmethod


class IEmbeddingClient(ABC):
    """Interface for text-to-vector embedding operations."""

    @abstractmethod
    def embed(self, text: str) -> list[float]:
        """Convert text into a vector representation."""
        ...

    @abstractmethod
    def dimension(self) -> int:
        """Return the dimensionality of vectors produced by this client."""
        ...
