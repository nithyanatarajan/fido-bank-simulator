.PHONY: install dev backend client build test test-backend test-frontend test-e2e check check-backend check-frontend fix fix-backend fix-frontend

.DEFAULT_GOAL := help

## Setup

install: ## Install all dependencies
	uv sync --all-extras
	cd frontend && pnpm install
	cd tests/e2e && pnpm install && pnpm exec playwright install chromium

## Development

dev: ## Start backend and frontend dev servers
	$(MAKE) -j2 backend client

backend: ## Start FastAPI backend
	cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 9090 --reload

client: ## Start Vite frontend dev server
	cd frontend && pnpm dev

build: ## Build frontend for production
	cd frontend && pnpm build

## Tests

test: test-backend test-frontend test-e2e ## Run all tests

test-backend: ## Run Python backend tests
	cd backend && uv run pytest tests/ -v

test-frontend: ## Run frontend unit tests
	cd frontend && pnpm test

test-e2e: ## Run Playwright E2E tests
	cd tests/e2e && pnpm exec playwright test

## Code quality

check: check-backend check-frontend ## Check all code (lint + format) without modifying

check-backend: ## Check Python code (lint + format)
	cd backend && uv run ruff check app/ tests/
	cd backend && uv run ruff format --check app/ tests/

check-frontend: ## Check JavaScript code (lint + format)
	cd frontend && pnpm run check

fix: fix-backend fix-frontend ## Fix all code (lint + format)

fix-backend: ## Fix Python code (lint + format)
	cd backend && uv run ruff check --fix app/ tests/
	cd backend && uv run ruff format app/ tests/

fix-frontend: ## Fix JavaScript code (lint + format)
	cd frontend && pnpm run fix

## Help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
