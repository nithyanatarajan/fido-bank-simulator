# FIDO Bank Simulator

A reference bank application demonstrating FIDO2/WebAuthn passkey registration and step-up authentication for high-risk transactions.

Users register and log in with username/password, then add passkeys (using the WebAuthn API). When initiating a money transfer, the application requires step-up authentication via a registered passkey before completing the transaction.

## Architecture

- **Backend**: Python 3.12+ / FastAPI with in-memory stores (users, credentials, sessions)
- **Frontend**: Vanilla JavaScript SPA built with Vite + Bootstrap
- **Authentication**: Session cookies (itsdangerous signed tokens) + FIDO2 passkeys (py-fido2)
- **Step-up flow**: Transfer endpoint returns `step_up_required`, frontend triggers WebAuthn assertion

```
Browser (SPA)  <-->  Vite dev proxy (:5173)  <-->  FastAPI (:9090)
                                                      |
                                              [UserStore, FidoService, SessionManager]
```

## Prerequisites

- Python 3.12+
- Node.js 20+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [pnpm](https://pnpm.io/) (Node package manager)
- [Task](https://taskfile.dev/) runner (optional but recommended)

## Quick start

```bash
# Install all dependencies
task install

# Start backend + frontend dev servers
task dev
```

Or manually:

```bash
# Backend
uv sync --all-extras
cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 9090 --reload

# Frontend (separate terminal)
cd frontend && pnpm install && pnpm dev
```

Open http://localhost:5173 (Vite dev server) or http://localhost:9090 (production build).

## Running tests

```bash
# All tests (backend + frontend + E2E)
task test

# Backend unit tests
task test:backend

# Frontend unit tests
task test:frontend

# E2E tests (starts servers automatically)
task test:e2e
```

## Code quality

```bash
# Check all (lint + format) — no modifications
task check

# Fix all (lint + format)
task fix

# Check/fix backend only
task check:backend
task fix:backend

# Check/fix frontend only
task check:frontend    # or: cd frontend && pnpm run check
task fix:frontend      # or: cd frontend && pnpm run fix
```

## Docker

```bash
docker compose up --build
# Access at http://localhost:9090
```

## CI pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push and PR to master:

1. **Lint** — ruff (Python) + ESLint/Prettier (JavaScript)
2. **Backend tests** + **Frontend tests** (parallel, after lint)
3. **E2E tests** (Playwright, after unit tests)
4. **Docker build** (after E2E)

## Configuration

Edit `env.sample` to configure the application:

| Variable | Default | Description |
|----------|---------|-------------|
| `BANK_HOST` | `0.0.0.0` | Server bind address |
| `BANK_PORT` | `9090` | Server port |
| `FIDO_STEPUP_ENABLED` | `true` | Require passkey for transfers |
| `RP_ID` | `localhost` | WebAuthn Relying Party ID |
| `RP_NAME` | `FIDO Bank Simulator` | WebAuthn Relying Party name |
| `RP_ORIGIN` | `http://localhost:9090` | WebAuthn expected origin |
| `JWT_SECRET` | `change-me-in-production` | Secret for challenge tokens |
| `JWT_EXPIRY_SECONDS` | `300` | Challenge token expiry |
