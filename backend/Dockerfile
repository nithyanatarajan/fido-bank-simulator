FROM python:3.12-slim

RUN groupadd --gid 1000 app && useradd --uid 1000 --gid app --shell /bin/bash app

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.7 /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend/ ./backend/

RUN chown -R app:app /app
USER app

WORKDIR /app/backend

EXPOSE 9090

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9090"]
