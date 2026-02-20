# feature/vector-search 実装仕様書

## 概要

全メモをAIに送信する現在の検索方式を、ベクトル類似度検索に置き換える。
Embedding生成はAPI版（OpenAI）とローカル版（sentence-transformers）の両方をサポートし、DIで切り替え可能にする。

## 変更対象ファイルと作業内容

### 1. Domain層

#### `app/domain/memo/embedding_client.py`（新規作成）

```python
from abc import ABC, abstractmethod


class EmbeddingClient(ABC):
    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """テキストをベクトルに変換する"""
        ...

    @abstractmethod
    def dimension(self) -> int:
        """このクライアントが生成するベクトルの次元数を返す"""
        ...
```

#### `app/domain/memo/entity.py`（変更）

Memoエンティティに `embedding` フィールドを追加する。

```python
@dataclass
class Memo:
    id: str
    content: str
    summary: str
    tags: list[str]
    embedding: list[float] | None  # 追加
    created_at: datetime
```

#### `app/domain/memo/repository.py`（変更）

MemoRepositoryに `search_by_vector` メソッドを追加する。

```python
@abstractmethod
async def search_by_vector(
    self, query_embedding: list[float], limit: int = 5
) -> list[Memo]:
    """ベクトル類似度で上位N件を返す"""
    ...
```

### 2. Infrastructure層

#### `app/infrastructure/memo/openai_embedding.py`（新規作成）

OpenAI API を使った Embedding 実装。

```python
import openai
from app.domain.memo.embedding_client import EmbeddingClient


class OpenAIEmbeddingClient(EmbeddingClient):
    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = model

    async def embed(self, text: str) -> list[float]:
        response = await self.client.embeddings.create(
            model=self.model,
            input=text,
        )
        return response.data[0].embedding

    def dimension(self) -> int:
        return 1536  # text-embedding-3-small
```

#### `app/infrastructure/memo/local_embedding.py`（新規作成）

sentence-transformers を使ったローカル Embedding 実装。
API不要、オフライン動作可能。

```python
from sentence_transformers import SentenceTransformer
from app.domain.memo.embedding_client import EmbeddingClient


class LocalEmbeddingClient(EmbeddingClient):
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)

    async def embed(self, text: str) -> list[float]:
        # sentence-transformersは同期なのでそのまま呼ぶ
        # 必要なら asyncio.to_thread で非同期化
        vector = self.model.encode(text)
        return vector.tolist()

    def dimension(self) -> int:
        return 384  # all-MiniLM-L6-v2
```

#### `app/infrastructure/memo/models.py`（変更）

SQLAlchemyモデルに vector カラムを追加。

```python
from pgvector.sqlalchemy import Vector

class MemoModel(Base):
    __tablename__ = "memos"
    id = Column(String, primary_key=True)
    content = Column(Text, nullable=False)
    summary = Column(Text)
    tags = Column(ARRAY(String))
    embedding = Column(Vector(1536))  # 追加。次元数は要注意（後述）
    created_at = Column(DateTime, nullable=False)
```

**注意:** Vector の次元数は Embedding モデルに依存する。
- OpenAI text-embedding-3-small → 1536
- all-MiniLM-L6-v2 → 384
- 環境変数 `EMBEDDING_DIMENSION` で設定可能にするか、
  マイグレーション時に決定する設計にすること。
- 一つのDBで複数の次元を混在させないこと。

#### `app/infrastructure/memo/postgres_repository.py`（変更）

`search_by_vector` メソッドを実装する。

```python
async def search_by_vector(
    self, query_embedding: list[float], limit: int = 5
) -> list[Memo]:
    stmt = (
        select(MemoModel)
        .filter(MemoModel.embedding.isnot(None))
        .order_by(MemoModel.embedding.cosine_distance(query_embedding))
        .limit(limit)
    )
    result = await self.session.execute(stmt)
    return [self._to_entity(row) for row in result.scalars()]
```

#### `app/infrastructure/memo/inmemory_repository.py`（変更）

InMemory版にも `search_by_vector` を実装する（コサイン類似度を手計算）。

```python
import math

async def search_by_vector(
    self, query_embedding: list[float], limit: int = 5
) -> list[Memo]:
    def cosine_similarity(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    scored = [
        (memo, cosine_similarity(query_embedding, memo.embedding or []))
        for memo in self.memos.values()
        if memo.embedding is not None
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [memo for memo, _ in scored[:limit]]
```

### 3. Application層

#### `app/application/memo/create_memo.py`（変更）

EmbeddingClientを注入し、メモ作成時にベクトル化する。

```python
class CreateMemoUseCase:
    def __init__(
        self,
        repo: MemoRepository,
        ai_client: AIClient,
        embedding_client: EmbeddingClient,  # 追加
    ):
        self.repo = repo
        self.ai_client = ai_client
        self.embedding_client = embedding_client

    async def execute(self, content: str) -> Memo:
        # 1. Claudeで要約・タグ付け（既存）
        analysis = await self.ai_client.analyze(content)

        # 2. Embeddingでベクトル化（新規）
        embedding = await self.embedding_client.embed(content)

        # 3. 保存
        memo = Memo(
            id=str(uuid4()),
            content=content,
            summary=analysis.summary,
            tags=analysis.tags,
            embedding=embedding,
            created_at=datetime.now(),
        )
        return await self.repo.save(memo)
```

#### `app/application/memo/search_memo.py`（変更）

全メモ送信 → ベクトル検索 + 上位N件のみAIに渡す方式に変更。

```python
class SearchMemoUseCase:
    def __init__(
        self,
        repo: MemoRepository,
        ai_client: AIClient,
        embedding_client: EmbeddingClient,  # 追加
    ):
        self.repo = repo
        self.ai_client = ai_client
        self.embedding_client = embedding_client

    async def execute(self, query: str) -> SearchResult:
        # 1. クエリをベクトル化（新規）
        query_embedding = await self.embedding_client.embed(query)

        # 2. 類似メモを取得（変更：全件 → 上位5件）
        relevant_memos = await self.repo.search_by_vector(
            query_embedding, limit=5
        )

        # 3. 関連メモだけClaudeに渡して回答生成（既存ロジック流用）
        answer = await self.ai_client.generate_answer(query, relevant_memos)
        return answer
```

### 4. DI層

#### `app/di/container.py`（変更）

環境変数でEmbeddingClientを切り替える。

```python
import os
from app.domain.memo.embedding_client import EmbeddingClient

def create_embedding_client() -> EmbeddingClient:
    provider = os.getenv("EMBEDDING_PROVIDER", "local")

    if provider == "openai":
        from app.infrastructure.memo.openai_embedding import OpenAIEmbeddingClient
        return OpenAIEmbeddingClient(
            api_key=os.environ["OPENAI_API_KEY"],
        )
    else:
        from app.infrastructure.memo.local_embedding import LocalEmbeddingClient
        return LocalEmbeddingClient()
```

### 5. Docker / インフラ

#### `docker-compose.yml`（変更）

```yaml
services:
  db:
    image: pgvector/pgvector:pg16  # postgres → pgvector に変更
    # 他はそのまま
```

DB初期化SQLまたはSQLAlchemyマイグレーションで以下を実行:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### `pyproject.toml`（変更）

依存関係を追加:

```toml
[project]
dependencies = [
    # 既存のものに追加
    "openai",
    "pgvector",
    "sentence-transformers",
]
```

### 6. 環境変数

`.env.example` に追加:

```env
# Embedding設定
EMBEDDING_PROVIDER=local          # "local" or "openai"
OPENAI_API_KEY=sk-xxx             # openai使用時のみ必要
EMBEDDING_DIMENSION=384           # local=384, openai=1536
```

## テスト計画

### Unit Tests（追加）

| テスト | 内容 |
|---|---|
| `test_local_embedding_returns_vector` | LocalEmbeddingClientがlist[float]を返す |
| `test_local_embedding_dimension` | 返り値の次元数が384 |
| `test_openai_embedding_returns_vector` | OpenAIEmbeddingClient（モック使用） |
| `test_inmemory_search_by_vector` | InMemoryRepositoryのコサイン類似度検索 |
| `test_inmemory_search_by_vector_empty` | embeddingがNoneのメモを除外する |
| `test_create_memo_with_embedding` | 作成時にembeddingが保存される |
| `test_search_uses_vector` | 検索がベクトル検索を使っている |

### Integration Tests（追加）

| テスト | 内容 |
|---|---|
| `test_postgres_search_by_vector` | pgvectorでの実際の類似度検索 |
| `test_memo_roundtrip_with_embedding` | 保存→ベクトル検索→取得の一連の流れ |

## 実装順序

1. `pyproject.toml` に依存関係追加 + `uv sync`
2. Domain層の変更（entity, repository, embedding_client）
3. Infrastructure層: `LocalEmbeddingClient` 実装
4. Infrastructure層: `InMemoryRepository.search_by_vector` 実装
5. Application層の変更（create, search ユースケース）
6. DI層の配線
7. Unit Tests 作成・実行
8. Docker: pgvector イメージに切り替え
9. Infrastructure層: SQLAlchemy モデル変更 + `PostgresRepository.search_by_vector`
10. Infrastructure層: `OpenAIEmbeddingClient` 実装
11. Integration Tests 作成・実行
12. `.env.example` 更新、README更新

## 既存コードを壊さないための注意点

- `embedding` フィールドは `Optional`（`list[float] | None`）にする
- InMemory 実装を必ず維持する（DB無し動作を保証）
- 既存の30件のテストが全てパスすることを確認してからマージ
- Memo entity の変更により既存テストのフィクスチャに `embedding=None` の追加が必要になる可能性がある
