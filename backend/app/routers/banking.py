"""Banking endpoints including health check, transfer, and step-up config."""

from typing import Any

from fastapi import APIRouter, Cookie
from starlette.responses import JSONResponse

from app.services.session import SessionManager

router = APIRouter(tags=["banking"])

# Module-level singletons, wired from main.py
session_manager: SessionManager | None = None
fido_stepup_enabled: bool = True


@router.get("/health")
def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@router.post("/transfer", response_model=None)
def transfer(session: str | None = Cookie(default=None)) -> dict[str, Any] | JSONResponse:
    """Initiate a money transfer. Returns step_up_required if FIDO step-up is enabled."""
    if session is None or session_manager is None:
        return JSONResponse(status_code=401, content={"message": "Not authenticated"})
    username = session_manager.verify_token(session)
    if username is None:
        return JSONResponse(status_code=401, content={"message": "Invalid session"})

    if fido_stepup_enabled:
        return {"status": "step_up_required"}

    return {"status": "success", "message": "Transfer completed"}


@router.get("/config/stepup")
def get_stepup_config() -> dict[str, bool]:
    """Return step-up authentication configuration."""
    return {"fido_stepup_enabled": fido_stepup_enabled}
