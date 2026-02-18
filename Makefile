.PHONY: install dev run test lint format check

install:
	uv sync

dev:
	uv sync --extra dev

run:
	uv run uvicorn app.presentation.main:app --reload --port 8000

test:
	uv run pytest -v

lint:
	uv run ruff check .
	uv run mypy app/

format:
	uv run ruff format .
	uv run ruff check --fix .

check: lint test
