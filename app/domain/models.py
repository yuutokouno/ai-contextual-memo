from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class Memo(BaseModel):
    """Memo entity representing a user's note with AI-generated metadata."""

    id: UUID = Field(default_factory=uuid4)
    content: str
    summary: str | None = None
    tags: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
