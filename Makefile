.PHONY: install dev run test test-unit test-integration test-cov lint format check \
       front-install front-dev front-build front-tauri up

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

check: lint test

# ── Frontend ─────────────────────────────────────────────

front-install:
	cd frontend && npm install

front-dev:
	cd frontend && npm run dev

front-build:
	cd frontend && npm run build

front-tauri:
	cd frontend && npm run tauri dev

# ── All-in-one ───────────────────────────────────────────

up:
	@echo "Starting backend (port 8000) and frontend (port 1420)..."
	uv run uvicorn app.presentation.memo.api.memo_api:app --reload --port 8000 & \
	cd frontend && npm run dev & \
	wait
