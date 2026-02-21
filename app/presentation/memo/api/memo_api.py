from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.application.memo.memo_usecase import MemoUsecase
from app.di.memo import container
from app.infrastructure.memo.external.pca_reducer import reduce_to_3d
from app.presentation.memo.schemas.memo_schemas import (
    CreateMemoRequest,
    Graph3DNodeResponse,
    Graph3DResponse,
    GraphEdgeResponse,
    GraphNodeResponse,
    GraphResponse,
    MemoResponse,
    Position3DResponse,
    SearchRequest,
    SearchResponse,
    UpdateMemoRequest,
)

app = FastAPI(
    title="AI-Contextual Memo (ACM)",
    description="AI-powered memo app with semantic search",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
        "http://127.0.0.1:1420",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_memo_usecase() -> MemoUsecase:
    return container.memo_usecase


@app.post("/memos", response_model=MemoResponse, status_code=201)
def create_memo(
    request: CreateMemoRequest,
    usecase: MemoUsecase = Depends(get_memo_usecase),
) -> MemoResponse:
    memo = usecase.create_memo(request.content)
    return MemoResponse(
        id=memo.id,
        content=memo.content,
        summary=memo.summary,
        tags=memo.tags,
        created_at=memo.created_at,
    )


@app.get("/memos", response_model=list[MemoResponse])
def get_memos(
    usecase: MemoUsecase = Depends(get_memo_usecase),
) -> list[MemoResponse]:
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


@app.get("/memos/graph", response_model=GraphResponse)
def get_graph(
    usecase: MemoUsecase = Depends(get_memo_usecase),
) -> GraphResponse:
    graph = usecase.get_graph_data()
    return GraphResponse(
        nodes=[
            GraphNodeResponse(
                id=n.id,
                label=n.label,
                content=n.content,
                tags=n.tags,
                created_at=n.created_at,
            )
            for n in graph.nodes
        ],
        edges=[
            GraphEdgeResponse(source=e.source, target=e.target, similarity=e.similarity)
            for e in graph.edges
        ],
    )


@app.get("/memos/graph/3d", response_model=Graph3DResponse)
def get_graph_3d(
    usecase: MemoUsecase = Depends(get_memo_usecase),
) -> Graph3DResponse:
    graph = usecase.get_graph_3d_data(reduce_fn=reduce_to_3d)
    return Graph3DResponse(
        nodes=[
            Graph3DNodeResponse(
                id=n.id,
                label=n.label,
                content=n.content,
                tags=n.tags,
                created_at=n.created_at,
                position=Position3DResponse(
                    x=n.position.x,
                    y=n.position.y,
                    z=n.position.z,
                ),
            )
            for n in graph.nodes
        ],
        edges=[
            GraphEdgeResponse(source=e.source, target=e.target, similarity=e.similarity)
            for e in graph.edges
        ],
    )


@app.patch("/memos/{memo_id}", response_model=MemoResponse)
def update_memo(
    memo_id: UUID,
    request: UpdateMemoRequest,
    usecase: MemoUsecase = Depends(get_memo_usecase),
) -> MemoResponse:
    memo = usecase.update_memo(memo_id, request.content)
    if memo is None:
        raise HTTPException(status_code=404, detail="Memo not found")
    return MemoResponse(
        id=memo.id,
        content=memo.content,
        summary=memo.summary,
        tags=memo.tags,
        created_at=memo.created_at,
    )


@app.delete("/memos/{memo_id}", status_code=204)
def delete_memo(
    memo_id: UUID,
    usecase: MemoUsecase = Depends(get_memo_usecase),
) -> None:
    deleted = usecase.delete_memo(memo_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Memo not found")


@app.post("/memos/search", response_model=SearchResponse)
def search_memos(
    request: SearchRequest,
    usecase: MemoUsecase = Depends(get_memo_usecase),
) -> SearchResponse:
    result = usecase.search_memos(request.query)
    return SearchResponse(
        answer=result.answer,
        related_memo_ids=result.related_memo_ids,
    )
