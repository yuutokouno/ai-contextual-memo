# AI-Contextual Memo (ACM)

メモの蓄積を「記録」から「活用可能な知識」へ昇華させる AI メモアプリのバックエンド API。

Claude AI がメモを自動で **要約・タグ付け** し、キーワード一致ではない **意味ベースの検索** を提供する。

## 機能

| エンドポイント | 説明 |
|---|---|
| `POST /memos` | メモを作成（AI が自動で要約・タグ付け） |
| `GET /memos` | メモ一覧を取得 |
| `POST /memos/search` | クエリに対して AI が文脈検索・回答生成 |

## アーキテクチャ

レイヤードアーキテクチャ + DDD を採用。DI 層により外部依存（AI・DB）の差し替えが可能。

```
app/
├── domain/          ビジネスルール（Entity, Interface）
├── usecase/         業務フロー（保存 → AI解析 → 永続化）
├── infrastructure/  外部接続（Claude API, PostgreSQL, InMemory）
├── di/              依存性注入
└── presentation/    FastAPI エンドポイント
```

## 前提条件

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Anthropic API Key](https://console.anthropic.com/)

ローカル実行の場合は追加で:
- Python 3.12+
- [uv](https://docs.astral.sh/uv/)

## セットアップ（Docker）

```bash
# 1. リポジトリをクローン
git clone https://github.com/yuutokouno/ai-contextual-memo.git
cd ai-contextual-memo

# 2. 環境変数を設定
cp .env.example .env
# .env を編集して ANTHROPIC_API_KEY を設定

# 3. Docker で起動
docker compose up -d

# 4. ログを確認
docker compose logs -f app
```

起動後 http://localhost:8000/docs で Swagger UI が開く。

### ローカル実行（Docker なし）

```bash
cp .env.example .env
# .env の ANTHROPIC_API_KEY を設定
# DATABASE_URL を空にするとインメモリ保存になる

make install
make run
```

## 使い方

### メモを作成

```bash
curl -X POST http://localhost:8000/memos \
  -H "Content-Type: application/json" \
  -d '{"content": "今日のミーティングでAWS移行の方針が決まった"}'
```

レスポンス例:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "今日のミーティングでAWS移行の方針が決まった",
  "summary": "AWS移行方針がミーティングで決定した",
  "tags": ["AWS", "インフラ", "ミーティング"],
  "created_at": "2026-02-18T12:00:00"
}
```

### メモ一覧を取得

```bash
curl http://localhost:8000/memos
```

### メモを検索（AI セマンティック検索）

```bash
curl -X POST http://localhost:8000/memos/search \
  -H "Content-Type: application/json" \
  -d '{"query": "インフラ関連の決定事項は？"}'
```

## データ保存

| モード | 条件 | 永続性 |
|---|---|---|
| PostgreSQL | `DATABASE_URL` が設定されている（Docker デフォルト） | サーバー再起動後も保持 |
| InMemory | `DATABASE_URL` が未設定 | サーバー再起動で消える |

## 現在の制限事項

- **フロントエンド未実装** — API + Swagger UI のみ
- **検索は全メモを AI に送信** — メモ数が増えるとコスト・レイテンシが増加

## 開発

```bash
make dev      # 開発用依存関係をインストール
make test     # テスト実行
make lint     # ruff + mypy
make format   # コード整形
make check    # lint + test 一括実行
```

## ロードマップ

- **Phase 1 (MVP)**: InMemory保存 + Claude AI 解析 + セマンティック検索
- **Phase 2**: PostgreSQL 永続化 + Docker 構成 ← **現在**
- **Phase 3**: ベクトル検索（Embeddings）
