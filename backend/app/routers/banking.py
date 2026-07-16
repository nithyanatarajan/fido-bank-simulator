"""Banking endpoints including health check, transfer, and step-up config."""

from typing import Any

from fastapi import APIRouter, Cookie
from starlette.responses import JSONResponse

from app.models import TransferRequest
from app.services.session import SessionManager

router = APIRouter(tags=["banking"])

# Module-level singletons, wired from main.py
session_manager: SessionManager | None = None
fido_stepup_enabled: bool = True
fido_stepup_threshold: float = 1000.0


@router.get("/health")
def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@router.post("/transfer", response_model=None)
def transfer(
    req: TransferRequest,
    session: str | None = Cookie(default=None),
) -> dict[str, Any] | JSONResponse:
    """Initiate a money transfer.

    Requires FIDO step-up only when it is enabled and the amount exceeds the
    configured threshold; otherwise the transfer completes immediately.
    """
    if session is None or session_manager is None:
        return JSONResponse(status_code=401, content={"message": "Not authenticated"})
    from app.routers.users import session_max_age

    username = session_manager.verify_token(session, max_age=session_max_age)
    if username is None:
        return JSONResponse(status_code=401, content={"message": "Invalid session"})

    if fido_stepup_enabled and req.amount > fido_stepup_threshold:
        return {"status": "step_up_required"}

    return {"status": "success", "message": "Transfer completed"}


@router.get("/config/stepup")
def get_stepup_config() -> dict[str, Any]:
    """Return step-up authentication configuration."""
    return {
        "fido_stepup_enabled": fido_stepup_enabled,
        "fido_stepup_threshold": fido_stepup_threshold,
    }
