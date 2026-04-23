# FIDO Bank Simulator

A reference bank application demonstrating FIDO2/WebAuthn passkey registration and step-up authentication for high-risk transactions.

Users register and log in with username/password, then add passkeys (using the WebAuthn API). When initiating a money transfer, the application requires step-up authentication via a registered passkey before completing the transaction.

## Architecture

- **Backend**: Python 3.12+ / FastAPI with in-memory stores (users, credentials, sessions)
- **Frontend**: Vanilla JavaScript SPA built with Vite
- **Authentication**: Session cookies (itsdangerous signed tokens) + FIDO2 passkeys (py-fido2)
- **Step-up flow**: Transfer endpoint returns `step_up_required`, frontend triggers WebAuthn assertion

```
Browser (SPA)  <-->  Vite dev proxy  <-->  FastAPI (uvicorn)
                                             |
                                     [UserStore, FidoService, SessionManager]
```

## Prerequisites

- Python 3.12+
- Node.js 20+
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
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 (Vite dev server) or http://localhost:8000 (production build).

## Running tests

```bash
# All tests
task test

# Backend unit tests only
task test:backend

# E2E tests (starts servers automatically)
task test:e2e
```

## Linting and formatting

```bash
# Lint all code
task lint

# Format all code
task format

# Check formatting without modifying files
task format:check
```

## Docker

```bash
# Build and start
docker compose up --build

# Access at http://localhost:8000
```

## Project structure

```
fido-bank-simulator/
  backend/
    config.py            # Pydantic settings (env vars)
    main.py              # FastAPI app, singleton wiring
    models.py            # Request/response models
    routers/
      banking.py         # /health, /transfer, /config/stepup
      users.py           # /users/register, login, logout, me
      fido.py            # /fido/register/*, /fido/auth/*, /fido/credentials
    services/
      user_store.py      # In-memory user store with bcrypt
      session.py         # Signed session tokens (itsdangerous)
      fido_service.py    # FIDO2 server, credential store, challenge tokens
  frontend/
    index.html           # SPA shell with CSS
    src/
      main.js            # SPA router
      api.js             # Fetch wrappers for /users/*
      webauthn.js         # WebAuthn registration/authentication helpers
      pages/
        login.js         # Login/register form with tab switching
        dashboard.js     # Dashboard with passkeys, transfer, logout
  tests/
    backend/             # pytest unit tests
    e2e/                 # Playwright E2E tests
  Dockerfile             # Multi-stage build (Node + Python)
  docker-compose.yml     # Single service configuration
  Taskfile.yml           # Task runner commands
  pyproject.toml         # Python project config
```

## Configuration

Copy `.env.sample` to `.env` and adjust as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `BANK_HOST` | `0.0.0.0` | Server bind address |
| `BANK_PORT` | `8000` | Server port |
| `FIDO_STEPUP_ENABLED` | `true` | Require passkey for transfers |
| `RP_ID` | `localhost` | WebAuthn Relying Party ID |
| `RP_NAME` | `FIDO Bank Simulator` | WebAuthn Relying Party name |
| `RP_ORIGIN` | `http://localhost:8000` | WebAuthn expected origin |
| `JWT_SECRET` | `change-me-in-production` | Secret for challenge tokens |
| `JWT_EXPIRY_SECONDS` | `300` | Challenge token expiry |
