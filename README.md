# FIDO Bank Simulator

A reference bank application demonstrating FIDO2/WebAuthn passkey registration and step-up authentication for high-risk transactions.

Users register and log in with username/password, then add passkeys (using the WebAuthn API). When initiating a money transfer, the application requires step-up authentication via a registered passkey before completing the transaction.

## Architecture

- **Backend**: Python 3.12+ / FastAPI with in-memory stores (users, credentials, sessions)
- **Frontend**: Vanilla JavaScript SPA built with Vite + Bootstrap
- **Authentication**: Session cookies (itsdangerous timed tokens with configurable expiry) + FIDO2 passkeys (py-fido2)
- **Step-up flow**: Transfer endpoint returns `step_up_required`, frontend triggers WebAuthn assertion

### Dev mode (Vite proxy)

```
Browser (SPA)  <-->  Vite dev proxy (:5173)  <-->  FastAPI (:9090)
                                                      |
                                              [UserStore, FidoService, SessionManager]
```

In dev mode, the Vite dev server proxies API requests to the backend. No CORS configuration is needed because the browser sees a single origin.

### Docker (CORS, separate containers)

```
Browser  <-->  nginx (:80)     FastAPI (:9090)
               (static SPA)    (API, CORS enabled)
```

In Docker, frontend and backend run as separate containers. The frontend injects `API_URL` at container startup via `config.js`, and the backend enables CORS for the configured origins. All fetch calls include `credentials: 'include'` for cross-origin cookies.

## Prerequisites

- Python 3.12+
- Node.js 20+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [pnpm](https://pnpm.io/) (Node package manager)
- GNU Make

## Quick start

```bash
# Install all dependencies
make install

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
# Frontend at http://localhost (nginx, port 80)
# Backend API at http://localhost:9090 (exposed for CORS)
```

The frontend container runs `docker-entrypoint.sh` on startup to inject `API_URL` into `/config.js`. The backend enables CORS for origins listed in `CORS_ORIGINS`.

## CI pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push and PR to master:

1. **Lint** -- ruff (Python) + ESLint/Prettier (JavaScript)
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
| `JWT_SECRET` | `change-me-in-production` | Secret for challenge tokens and sessions |
| `JWT_EXPIRY_SECONDS` | `300` | Challenge token expiry (seconds) |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins for CORS |
| `SESSION_MAX_AGE_SECONDS` | `3600` | Session cookie and token expiry (seconds) |

## License

[MIT](LICENSE)
