from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CreateMemoRequest(BaseModel):
    content: str


class MemoResponse(BaseModel):
    id: UUID
    content: str
    summary: str | None = None
    tags: list[str] = Field(default_factory=list)
    created_at: datetime


class UpdateMemoRequest(BaseModel):
    content: str


class SearchRequest(BaseModel):
    query: str


class SearchResponse(BaseModel):
    answer: str
    related_memo_ids: list[str] = Field(default_factory=list)


class GraphNodeResponse(BaseModel):
    id: str
    label: str
    tags: list[str] = Field(default_factory=list)


class GraphEdgeResponse(BaseModel):
    source: str
    target: str
    similarity: float


class GraphResponse(BaseModel):
    nodes: list[GraphNodeResponse] = Field(default_factory=list)
    edges: list[GraphEdgeResponse] = Field(default_factory=list)
