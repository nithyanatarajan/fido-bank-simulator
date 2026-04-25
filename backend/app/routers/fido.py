"""FIDO2 WebAuthn registration and credential endpoints."""

import base64
import os
from typing import Any

from fastapi import APIRouter, Cookie
from starlette.responses import JSONResponse

from app.models import FidoAuthCompleteRequest, FidoRegisterCompleteRequest
from app.services.fido_service import FidoService
from app.services.session import SessionManager

router = APIRouter(prefix="/fido", tags=["fido"])

# Module-level singletons, wired from main.py
fido_service: FidoService | None = None
session_manager: SessionManager | None = None


def _get_username_or_401(session: str | None) -> str | JSONResponse:
    """Extract username from session cookie, or return 401 response."""
    if session is None or session_manager is None:
        return JSONResponse(status_code=401, content={"message": "Not authenticated"})
    # Import session_max_age from users module to share the same expiry
    from app.routers.users import session_max_age

    username = session_manager.verify_token(session, max_age=session_max_age)
    if username is None:
        return JSONResponse(status_code=401, content={"message": "Invalid session"})
    return username


def _serialize_public_key(options_dict: dict[str, Any]) -> dict[str, Any]:
    """Convert py-fido2 options dict to JSON-serializable dict.

    Handles bytes -> base64url and enum -> value conversions recursively.
    """

    def _convert(obj: Any) -> Any:
        if hasattr(obj, "items"):
            return {k: _convert(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_convert(item) for item in obj]
        if isinstance(obj, bytes):
            return base64.urlsafe_b64encode(obj).rstrip(b"=").decode("ascii")
        if hasattr(obj, "value"):
            return obj.value
        return obj

    return _convert(options_dict)


@router.post("/register/begin", response_model=None)
def register_begin(session: str | None = Cookie(default=None)) -> dict[str, Any] | JSONResponse:
    """Begin FIDO2 registration. Returns publicKey options and challenge token."""
    assert fido_service is not None
    result = _get_username_or_401(session)
    if isinstance(result, JSONResponse):
        return result
    username = result

    user_id = os.urandom(16)
    options, state = fido_service.register_begin(username, user_id)
    challenge_token = fido_service.create_challenge_token(state)

    serialized = _serialize_public_key(dict(options))
    return {
        "publicKey": serialized.get("publicKey", serialized),
        "challenge_token": challenge_token,
    }


@router.post("/register/complete", response_model=None)
def register_complete(
    req: FidoRegisterCompleteRequest,
    session: str | None = Cookie(default=None),
) -> dict[str, str] | JSONResponse:
    """Complete FIDO2 registration. Validates attestation and stores credential."""
    assert fido_service is not None
    result = _get_username_or_401(session)
    if isinstance(result, JSONResponse):
        return result
    username = result

    try:
        state = fido_service.verify_challenge_token(req.challenge_token)
        auth_data = fido_service.register_complete(state, req.attestation)
        cred_data = auth_data.credential_data
        assert cred_data is not None
        fido_service.store_credential(
            username=username,
            credential_id=cred_data.credential_id,
            credential_data=cred_data,
            sign_count=auth_data.counter,
        )
        return {"status": "ok"}
    except Exception as e:
        return JSONResponse(status_code=400, content={"message": str(e)})


@router.get("/credentials", response_model=None)
def get_credentials(session: str | None = Cookie(default=None)) -> dict[str, Any] | JSONResponse:
    """List registered passkeys for the current user."""
    assert fido_service is not None
    result = _get_username_or_401(session)
    if isinstance(result, JSONResponse):
        return result
    username = result

    creds = fido_service.get_credentials(username)
    return {
        "credentials": [
            {
                "credential_id": base64.urlsafe_b64encode(c["credential_id"]).rstrip(b"=").decode("ascii"),
                "created": True,
            }
            for c in creds
        ]
    }


@router.delete("/credentials/{credential_id}", response_model=None)
def delete_credential(credential_id: str, session: str | None = Cookie(default=None)) -> dict[str, str] | JSONResponse:
    """Delete a registered passkey by its base64url-encoded credential ID."""
    assert fido_service is not None
    result = _get_username_or_401(session)
    if isinstance(result, JSONResponse):
        return result
    username = result

    # Decode base64url credential_id (add back padding)
    padded = credential_id + "=" * (-len(credential_id) % 4)
    try:
        cred_id_bytes = base64.urlsafe_b64decode(padded)
    except Exception:
        return JSONResponse(status_code=400, content={"message": "Invalid credential ID"})

    if fido_service.delete_credential(username, cred_id_bytes):
        return {"status": "ok"}
    return JSONResponse(status_code=404, content={"message": "Credential not found"})


@router.post("/auth/begin", response_model=None)
def auth_begin(session: str | None = Cookie(default=None)) -> dict[str, Any] | JSONResponse:
    """Begin FIDO2 authentication. Returns publicKey options and challenge token."""
    assert fido_service is not None
    result = _get_username_or_401(session)
    if isinstance(result, JSONResponse):
        return result
    username = result

    creds = fido_service.get_credentials(username)
    if not creds:
        return JSONResponse(status_code=400, content={"message": "No passkeys registered"})

    options, state = fido_service.authenticate_begin(username)
    challenge_token = fido_service.create_challenge_token(state)

    serialized = _serialize_public_key(dict(options))
    return {
        "publicKey": serialized.get("publicKey", serialized),
        "challenge_token": challenge_token,
    }


@router.post("/auth/complete", response_model=None)
def auth_complete(
    req: FidoAuthCompleteRequest,
    session: str | None = Cookie(default=None),
) -> dict[str, str] | JSONResponse:
    """Complete FIDO2 authentication. Validates assertion and updates sign count."""
    assert fido_service is not None
    result = _get_username_or_401(session)
    if isinstance(result, JSONResponse):
        return result
    _username = result  # auth check passed; credential lookup is by ID

    try:
        state = fido_service.verify_challenge_token(req.challenge_token)
        # Look up the specific credential used from the assertion's rawId
        padded = req.assertion["rawId"] + "=" * (-len(req.assertion["rawId"]) % 4)
        credential_id = base64.urlsafe_b64decode(padded)
        fido_service.authenticate_complete(state, credential_id, req.assertion)
        fido_service.update_sign_count(credential_id, 0)
        return {"status": "ok"}
    except Exception as e:
        return JSONResponse(status_code=400, content={"message": str(e)})
