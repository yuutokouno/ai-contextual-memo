from fastapi import FastAPI

from app.di.container import container
from app.presentation.schemas import (
    CreateMemoRequest,
    MemoResponse,
    SearchRequest,
    SearchResponse,
)

app = FastAPI(
    title="AI-Contextual Memo (ACM)",
    description="AI-powered memo app with semantic search",
    version="0.1.0",
)

usecase = container.memo_usecase


@app.post("/memos", response_model=MemoResponse, status_code=201)
def create_memo(request: CreateMemoRequest) -> MemoResponse:
    memo = usecase.create_memo(request.content)
    return MemoResponse(
        id=memo.id,
        content=memo.content,
        summary=memo.summary,
        tags=memo.tags,
        created_at=memo.created_at,
    )


@app.get("/memos", response_model=list[MemoResponse])
def get_memos() -> list[MemoResponse]:
    memos = usecase.get_all_memos()
    return [
        MemoResponse(
            id=m.id,
            content=m.content,
            summary=m.summary,
            tags=m.tags,
            created_at=m.created_at,
        )
        for m in memos
    ]


@app.post("/memos/search", response_model=SearchResponse)
def search_memos(request: SearchRequest) -> SearchResponse:
    result = usecase.search_memos(request.query)
    return SearchResponse(
        answer=result.answer,
        related_memo_ids=result.related_memo_ids,
    )
