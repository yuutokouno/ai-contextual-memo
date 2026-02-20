# CLAUDE.md — AI-Contextual Memo (ACM)

## プロジェクトビジョン

ジュニアエンジニアや新しい分野を手探りで学ぶ人が「知らないことを知らない」問題を解決するメモアプリ。

メモをノードとして蓄積し、ベクトル検索による意味的距離でノード同士を自動接続。
AIがノード間の**知識ギャップを検出**し、学ぶべき中間知識を提案ノードとして生成する。

**例:** 「プログラミング」ノードと「React」ノードの距離が遠い場合、AIが「JavaScript基礎」「DOM操作」などの中間ノードを提案する。

**UIイメージ:** 宇宙空間のような星座型グラフ（3D版は将来、まず2D版を実装）。

## 既存アーキテクチャ

### Backend: オニオンアーキテクチャ（Python 3.12 / FastAPI）

```
app/
├── domain/memo/          ビジネスルール（Entity, Repository Interface, AI Client Interface）
├── application/memo/     ユースケース（メモ作成・検索のフロー）
├── infrastructure/memo/  外部接続（Claude API, PostgreSQL, InMemory）
├── presentation/memo/    FastAPI エンドポイント + スキーマ
└── di/                   依存性注入
```

**設計原則:**
- Domain層は外部ライブラリに依存しない（インターフェースのみ定義）
- Infrastructure層がDomain層のインターフェースを実装する（依存関係逆転）
- Application層がユースケースを調整する
- DI層で具象クラスを注入する

### Frontend: FSD (Feature-Sliced Design) + Tauri v2

```
frontend/src/
├── app/              QueryClientProvider
├── pages/memo/       メモページ（作成・一覧・検索を統合）
├── features/memo/    ユースケース hooks（create / list / search）
├── entities/memo/    型定義 + API クライアント
└── shared/api/       axios ベースの HTTP クライアント
```

### 既存API

| エンドポイント | 説明 |
|---|---|
| `POST /memos` | メモを作成（AI が自動で要約・タグ付け） |
| `GET /memos` | メモ一覧を取得 |
| `POST /memos/search` | クエリに対して AI が文脈検索・回答生成 |

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

## コーディング規約

- **Linter:** ruff
- **型チェック:** mypy
- **テスト:** pytest（unit と integration を分離）
- **フォーマット:** `make format` で統一
- **全チェック:** `make check` で lint + test 一括実行
- **コミット:** Conventional Commits（`feat:`, `fix:`, `refactor:`, `test:`, `docs:`）

## ブランチ戦略

```
main（安定版、常に動く状態を維持）
 │
 ├── feature/vector-search        ← ★最優先で実装中
 ├── feature/knowledge-graph-ui   ← vector-search完了後
 ├── feature/ai-gap-detection     ← graph-ui完了後
 └── feature/3d-constellation-ui  ← 余裕があれば
```

- 1ブランチ = 1つの独立した機能
- 各featureブランチはmainから切る
- Pull Requestでマージ
- featureブランチ同士は直接依存させない

## 実装ロードマップ

### Phase 4a: feature/vector-search（現在のタスク）

→ 詳細は `docs/specs/vector-search.md` を参照

### Phase 4b: feature/knowledge-graph-ui

- 2Dグラフビュー（React Flow or D3.js）
- ベクトル距離に基づくノード配置
- ノードクリックでメモ詳細表示
- 新規API: `GET /memos/graph`（ノード + エッジ情報を返す）

### Phase 4c: feature/ai-gap-detection

- ノード間距離が閾値を超える場合にAIがギャップを検出
- Claudeが中間知識ノードを提案
- 提案ノードは別のステータス（suggested）で表示
- ユーザーが承認すると正式ノードになる

### Phase 4d: feature/3d-constellation-ui

- Three.js で宇宙空間風の3Dビュー
- パフォーマンスに注意（ノード数制限、LOD）
- 2D版と切り替え可能にする

## 注意事項

- InMemory実装を壊さないこと（DB無しでも動くように）
- 既存テスト（30件）を壊さないこと
- 新機能には必ずテストを書くこと
- Domain層に外部ライブラリのimportを入れないこと
