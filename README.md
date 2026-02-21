[![CI](https://github.com/yuutokouno/ai-contextual-memo/actions/workflows/ci.yml/badge.svg)](https://github.com/yuutokouno/ai-contextual-memo/actions/workflows/ci.yml)

# AI-Contextual Memo (ACM)

An AI-powered memo app that transforms personal notes into an **interconnected knowledge graph**.

Each memo becomes a knowledge node — automatically summarized and tagged by Claude AI, then embedded into a vector space using sentence-transformers. Nodes close in meaning cluster together; distant nodes reveal **knowledge gaps** that AI can detect and fill with learning suggestions.

Built for junior engineers and self-learners who don't yet know what they don't know.

## Features

- **CRUD + AI Analysis** — Create, read, update, delete memos. Claude auto-generates summaries and tags.
- **Vector Similarity Search** — Find related memos by meaning, not keywords (sentence-transformers / pgvector).
- **Knowledge Graph Visualization** — Interactive 2D graph with React Flow. Nodes colored by tag, edges weighted by similarity.
- **AI Knowledge Gap Detection** — Detect missing intermediate topics between distant nodes (planned).

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12 / FastAPI / SQLAlchemy / PostgreSQL 16 |
| AI | Anthropic Claude API (Haiku) |
| Embedding | sentence-transformers (`all-MiniLM-L6-v2`) / pgvector |
| Frontend | React 19 / TypeScript / Vite / Tailwind CSS v4 / React Flow v12 |
| Desktop | Tauri v2 |
| Test | pytest (53 tests / unit + integration) |
| Quality | ruff / mypy / GitHub Actions CI |
| Package | uv (Backend) / npm (Frontend) |

## Architecture

### Backend — Onion Architecture

```
app/
├── domain/memo/          Business rules (Entity, Repository & AI Client interfaces)
├── application/memo/     Use cases (create / search / update / delete flows)
├── infrastructure/memo/  External adapters (Claude API, PostgreSQL, pgvector, InMemory)
├── presentation/memo/    FastAPI endpoints + request/response schemas
└── di/                   Dependency injection wiring
```

### Frontend — Feature-Sliced Design + Tauri

```
frontend/src/
├── app/              Providers + tab navigation (Memos / Graph)
├── pages/
│   ├── memo/         Memo page (create + list + search)
│   └── graph/        Knowledge graph page
├── widgets/graph/    GraphViewer (React Flow) + NodeDetailPanel
├── features/
│   ├── memo/         Use-case hooks (create / list / search / update / delete)
│   └── graph/        useGraphData hook
├── entities/
│   ├── memo/         Memo types + API client
│   └── graph/        Graph types + API client
└── shared/api/       axios-based HTTP client
```

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Anthropic API Key](https://console.anthropic.com/)
- Python 3.12+ / [uv](https://docs.astral.sh/uv/)
- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri desktop app)

### Setup

```bash
git clone https://github.com/yuutokouno/ai-contextual-memo.git
cd ai-contextual-memo

# Configure environment
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY
# EMBEDDING_PROVIDER=local is the default (runs offline)

# Install dependencies
make install          # Backend (Python)
make front-install    # Frontend (npm)
```

### Run

```bash
# 1. Start PostgreSQL (required for vector search)
make db-up

# 2. Start backend + frontend
make up
```

- Backend: http://localhost:8000 (Swagger UI at `/docs`)
- Frontend: http://localhost:1420

```bash
# Or run individually
make run           # Backend only (FastAPI, port 8000)
make front-dev     # Frontend only (Vite, port 1420)
make front-tauri   # Tauri desktop app
```

## API

| Endpoint | Description |
|---|---|
| `POST /memos` | Create a memo (AI auto-summarizes & tags) |
| `GET /memos` | List all memos |
| `PATCH /memos/{id}` | Update a memo (AI re-analyzes) |
| `DELETE /memos/{id}` | Delete a memo |
| `POST /memos/search` | Semantic search with AI-generated answer |
| `GET /memos/graph` | Knowledge graph data (nodes + edges by similarity) |

## Make Commands

### Backend

| Command | Description |
|---|---|
| `make install` | Install Python dependencies |
| `make dev` | Install with dev dependencies |
| `make run` | Start backend (port 8000) |
| `make test` | Run all tests |
| `make test-unit` | Unit tests only |
| `make test-integration` | Integration tests (PostgreSQL required) |
| `make test-cov` | Tests with coverage report |
| `make lint` | ruff + mypy |
| `make format` | Auto-format code |
| `make format-check` | Check formatting (CI mode) |
| `make check` | lint + test |

### Frontend

| Command | Description |
|---|---|
| `make front-install` | npm install |
| `make front-dev` | Vite dev server (port 1420) |
| `make front-build` | Production build |
| `make front-lint` | TypeScript type check |
| `make front-tauri` | Tauri desktop app |

### Database

| Command | Description |
|---|---|
| `make db-up` | Start PostgreSQL (pgvector) |
| `make db-down` | Stop containers |
| `make db-reset` | Destroy volume and restart |

### CI

| Command | Description |
|---|---|
| `make ci-quick` | lint + unit tests + frontend type check |
| `make ci` | Full CI (lint + all tests + frontend build) |

## Roadmap

- **Phase 1** — Basic CRUD + AI summarization + semantic search ✅
- **Phase 2** — Vector similarity search (sentence-transformers / pgvector) ✅
- **Phase 3** — Knowledge graph UI (React Flow) ✅
- **Phase 4** — 3D constellation UI (Three.js) — [PR #6](https://github.com/yuutokouno/ai-contextual-memo/pull/6)
- **Phase 5** — AI knowledge gap detection
