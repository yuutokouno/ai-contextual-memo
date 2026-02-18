.PHONY: install dev run test test-unit test-integration test-cov lint format check

install:
	uv sync

dev:
	uv sync --extra dev

run:
	uv run uvicorn app.presentation.main:app --reload --port 8000

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
