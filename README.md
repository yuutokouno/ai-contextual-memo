# AI-Contextual Memo (ACM)

メモの蓄積を「記録」から「活用可能な知識」へ昇華させる AI メモアプリ。

Claude AI がメモを自動で **要約・タグ付け** し、キーワード一致ではない **意味ベースの検索** を提供する。

## 機能

| エンドポイント | 説明 |
|---|---|
| `POST /memos` | メモを作成（AI が自動で要約・タグ付け） |
| `GET /memos` | メモ一覧を取得 |
| `POST /memos/search` | クエリに対して AI が文脈検索・回答生成 |

## アーキテクチャ

### Backend: オニオンアーキテクチャ

```
app/
├── domain/memo/          ビジネスルール（Entity, Repository Interface, AI Client Interface）
├── application/memo/     ユースケース（メモ作成・検索のフロー）
├── infrastructure/memo/  外部接続（Claude API, PostgreSQL, InMemory）
├── presentation/memo/    FastAPI エンドポイント + スキーマ
└── di/                   依存性注入
```

### Frontend: FSD (Feature-Sliced Design) + Tauri

```
frontend/src/
├── app/              QueryClientProvider
├── pages/memo/       メモページ（作成・一覧・検索を統合）
├── features/memo/    ユースケース hooks（create / list / search）
├── entities/memo/    型定義 + API クライアント
└── shared/api/       axios ベースの HTTP クライアント
```

## 前提条件

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Anthropic API Key](https://console.anthropic.com/)
- [Node.js](https://nodejs.org/) 20+（フロントエンド）
- [Rust](https://www.rust-lang.org/tools/install)（Tauri デスクトップアプリ）

ローカル実行の場合は追加で:
- Python 3.12+
- [uv](https://docs.astral.sh/uv/)

## セットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/yuutokouno/ai-contextual-memo.git
cd ai-contextual-memo

# 2. 環境変数を設定
cp .env.example .env
# .env を編集して ANTHROPIC_API_KEY を設定

# 3. バックエンド依存関係をインストール
make install

# 4. フロントエンド依存関係をインストール
make front-install
```

## 起動方法

### バックエンド + フロントエンドを一括起動

```bash
make up
```

バックエンド（http://localhost:8000）とフロントエンド（http://localhost:1420）が同時に起動する。

### 個別に起動

```bash
make run           # バックエンドのみ（FastAPI, port 8000）
make front-dev     # フロントエンドのみ（Vite dev server, port 1420）
make front-tauri   # Tauri デスクトップアプリとして起動
```

### Docker で起動（バックエンド + DB）

```bash
docker compose up -d
docker compose logs -f app
```

起動後 http://localhost:8000/docs で Swagger UI が開く。

## make コマンド一覧

### Backend

| コマンド | 説明 |
|---|---|
| `make install` | Python 依存関係インストール |
| `make dev` | 開発用依存関係をインストール |
| `make run` | バックエンド起動 (port 8000) |
| `make test` | テスト全実行 |
| `make test-unit` | ユニットテストのみ |
| `make test-integration` | 結合テストのみ（PostgreSQL 必要） |
| `make test-cov` | カバレッジ付きテスト |
| `make lint` | ruff + mypy |
| `make format` | コード整形 |
| `make check` | lint + test 一括 |

### Frontend

| コマンド | 説明 |
|---|---|
| `make front-install` | npm install |
| `make front-dev` | Vite dev server 起動 (port 1420) |
| `make front-build` | プロダクションビルド |
| `make front-tauri` | Tauri デスクトップアプリ起動 |

### All-in-one

| コマンド | 説明 |
|---|---|
| `make up` | バックエンド + フロントエンドを一括起動 |

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

## 技術スタック

| 層 | 技術 |
|---|---|
| Backend | Python 3.12 / FastAPI / SQLAlchemy / PostgreSQL |
| AI | Anthropic Claude API |
| Frontend | React 19 / TypeScript / Vite / Tailwind CSS v4 |
| Desktop | Tauri v2 |
| テスト | pytest (30 tests / unit + integration) |
| 品質管理 | ruff / mypy |
| パッケージ管理 | uv (Backend) / npm (Frontend) |

## 現在の制限事項

- **検索は全メモを AI に送信** — メモ数が増えるとコスト・レイテンシが増加

## ロードマップ

- **Phase 1 (MVP)**: InMemory 保存 + Claude AI 解析 + セマンティック検索
- **Phase 2**: PostgreSQL 永続化 + Docker 構成
- **Phase 3**: オニオンアーキテクチャ + Tauri フロントエンド (FSD) ← **現在**
- **Phase 4**: ベクトル検索（Embeddings）
