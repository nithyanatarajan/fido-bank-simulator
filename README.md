# FIDO Bank Simulator

A reference bank application demonstrating FIDO2/WebAuthn passkey registration and step-up authentication for high-risk transactions.

Users register and log in with username/password, then add passkeys (using the WebAuthn API). When initiating a money transfer, the application requires step-up authentication via a registered passkey before completing the transaction.

## Architecture

- **Backend**: Python 3.12+ / FastAPI with in-memory stores (users, credentials, sessions)
- **Frontend**: Vanilla JavaScript SPA built with Vite + Bootstrap
- **Authentication**: Session cookies (itsdangerous timed tokens with configurable expiry) + FIDO2 passkeys (py-fido2)
- **Step-up flow**: Transfer endpoint returns `step_up_required`, frontend triggers WebAuthn assertion

```
Browser → Proxy (Vite or nginx) → Backend (FastAPI)
          ├── /api/*    → proxy to backend
          ├── /healthz  → 200 OK (nginx only, local)
          └── /*        → static files / SPA fallback
```

The frontend always calls same-origin relative paths (e.g., `fetch('/api/users/login')`). The proxy layer — Vite in dev, nginx in production — routes `/api/*` requests to the backend. The frontend never knows the backend's actual address.

## API URL Configuration

The frontend and backend use a **single, unified approach** to API routing across all environments.

### Development (Vite proxy)

Vite dev server proxies `/api/*` to the backend:

```sh
# Default: proxies /api/* to http://localhost:9090
cd frontend && pnpm dev

# Custom backend address
VITE_DEV_API_URL=http://localhost:8080 pnpm dev
```

`VITE_DEV_API_URL` is dev tooling config — it tells Vite where to forward requests. It is **not** baked into the frontend build.

### Production (nginx reverse proxy)

The nginx container uses a config template (`nginx.conf.template`) with an `API_URL` environment variable. At container startup, `envsubst` substitutes the variable into the nginx config before nginx starts.

```sh
# Docker Compose (see docker-compose.yml)
docker compose up

# Docker run
docker run -e API_URL=http://backend:9090 -p 80:80 my-frontend

# Azure Container Apps
az containerapp update \
  --name my-frontend \
  --resource-group my-rg \
  --set-env-vars API_URL=http://backend-app:9090
```

The same Docker image works across all environments — only the `API_URL` env var changes at runtime.

### Summary

| Environment | Proxy layer | Config mechanism | Backend address |
|---|---|---|---|
| Dev | Vite dev server | `VITE_DEV_API_URL` env var | `http://localhost:9090` (default) |
| Production | nginx | `API_URL` env var via `envsubst` | Set at container startup |

Both use the same pattern: a reverse proxy routes `/api/*` to the backend. The frontend code is identical in both cases — no build-time variables, no runtime JS config.

## Prerequisites

- Python 3.12+
- Node.js 22+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [pnpm](https://pnpm.io/) (Node package manager)
- GNU Make

## Quick start

```bash
# Install all dependencies
make install

# Create local config from templates
cp backend/env.sample backend/.env
# Edit backend/.env with your local values

# Start backend + frontend dev servers
make dev
```

Or manually:

```bash
# Backend
uv sync --all-extras
cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 9090 --reload

# Frontend (separate terminal)
cd frontend && pnpm install && pnpm dev
```

Open http://localhost:5173 (Vite dev server).

## Running tests

```bash
# All tests (backend + frontend + E2E)
make test

# Backend unit tests
make test-backend

# Frontend unit tests
make test-frontend

# E2E tests (starts servers automatically)
make test-e2e
```

## Code quality

```bash
# Check all (lint + format) -- no modifications
make check

# Fix all (lint + format)
make fix

# Backend only
make check-backend
make fix-backend

# Frontend only
make check-frontend    # or: cd frontend && pnpm run check
make fix-frontend      # or: cd frontend && pnpm run fix
```

## Docker

```bash
docker compose up --build
# App at http://localhost (nginx proxies /api/* to backend)
```

The frontend container runs `docker-entrypoint.sh` on startup, which uses `envsubst` to inject `API_URL` into the nginx config template. Nginx then proxies `/api/*` requests to the backend.

## Health Checks

- **Frontend (nginx):** `GET /healthz` — returns `200 OK` locally, does not depend on backend
- **Backend:** `GET /api/health` — returns `{"status": "ok"}`

## CI pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push and PR to master:

1. **Lint** -- ruff (Python) + ESLint/Prettier (JavaScript)
2. **Backend tests** + **Frontend tests** (parallel, after lint)
3. **E2E tests** (Playwright, after unit tests)
4. **Docker build** (after E2E)

## Backend Configuration

Copy `backend/env.sample` to `backend/.env` and edit:

```bash
cp backend/env.sample backend/.env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `BANK_HOST` | `0.0.0.0` | Server bind address |
| `BANK_PORT` | `9090` | Server port |
| `FIDO_STEPUP_ENABLED` | `true` | Require passkey for transfers |
| `RP_ID` | `localhost` | WebAuthn Relying Party ID |
| `RP_NAME` | `FIDO Bank Simulator` | WebAuthn Relying Party name |
| `RP_ORIGIN` | `http://localhost:9090` | WebAuthn expected origin |
| `JWT_SECRET` | `you-should-change-me-in-production` | Secret for challenge tokens and sessions |
| `JWT_EXPIRY_SECONDS` | `300` | Challenge token expiry (seconds) |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins for CORS |
| `SESSION_MAX_AGE_SECONDS` | `3600` | Session cookie and token expiry (seconds) |

## License

[MIT](LICENSE)
