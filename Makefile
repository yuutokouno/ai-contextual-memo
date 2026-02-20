.PHONY: install dev run test test-unit test-integration test-cov lint format format-check check \
       front-install front-dev front-build front-tauri front-lint up \
       db-up db-down db-reset ci-quick ci

# ── Backend ──────────────────────────────────────────────

install:
	uv sync

dev:
	uv sync --extra dev

run:
	uv run uvicorn app.presentation.memo.api.memo_api:app --reload --port 8000

test:
	uv run pytest -v

test-unit:
	uv run pytest -v -m unit

test-integration:
	uv run pytest -v -m integration

test-cov:
	uv run pytest --cov=app --cov-report=term-missing --cov-report=html

lint:
	uv run ruff check .
	uv run mypy app/

format:
	uv run ruff format .
	uv run ruff check --fix .

format-check:
	uv run ruff format --check .

check: lint test

# ── Frontend ─────────────────────────────────────────────

front-install:
	cd frontend && npm install

front-dev:
	cd frontend && npm run dev

front-build:
	cd frontend && npm run build

front-lint:
	cd frontend && npx tsc --noEmit

front-tauri:
	cd frontend && npm run tauri dev

# ── Database ─────────────────────────────────────────────

db-up:
	docker compose up -d db
	@echo "Waiting for PostgreSQL to be ready..."
	@until docker compose exec db pg_isready -U acm -d acm_db > /dev/null 2>&1; do sleep 1; done
	@echo "PostgreSQL is ready."

db-down:
	docker compose down

db-reset:
	docker compose down -v
	$(MAKE) db-up

# ── CI ───────────────────────────────────────────────────

ci-quick: lint test-unit front-lint

ci: lint test front-lint front-build

# ── All-in-one ───────────────────────────────────────────

up:
	@echo "Starting backend (port 8000) and frontend (port 1420)..."
	uv run uvicorn app.presentation.memo.api.memo_api:app --reload --port 8000 & \
	cd frontend && npm run dev & \
	wait
