"""FIDO2/WebAuthn service using py-fido2 with in-memory credential storage."""

import hashlib
import time
from typing import Any

import jwt
from fido2.server import Fido2Server
from fido2.webauthn import (
    AttestedCredentialData,
    PublicKeyCredentialRpEntity,
    PublicKeyCredentialUserEntity,
)


class FidoService:
    """Manages FIDO2 registration and authentication flows."""

    def __init__(
        self,
        rp_id: str,
        rp_name: str,
        rp_origin: str,
        jwt_secret: str,
        jwt_expiry_seconds: int = 300,
        additional_origins: list[str] | None = None,
    ) -> None:
        rp = PublicKeyCredentialRpEntity(name=rp_name, id=rp_id)
        allowed_origins = {rp_origin}
        if additional_origins:
            allowed_origins.update(additional_origins)
        self._server = Fido2Server(rp, verify_origin=lambda o: o in allowed_origins)
        self._jwt_secret = jwt_secret
        self._jwt_expiry_seconds = jwt_expiry_seconds
        # Credential store keyed by credential_id (bytes) for direct lookup
        self._credentials: dict[bytes, dict[str, Any]] = {}

    def store_credential(
        self,
        username: str,
        credential_id: bytes,
        credential_data: AttestedCredentialData,
        sign_count: int,
    ) -> None:
        """Store a credential, keyed by credential_id for direct lookup."""
        self._credentials[credential_id] = {
            "credential_id": credential_id,
            "credential_data": credential_data,
            "sign_count": sign_count,
            "username": username,
        }

    def get_credentials(self, username: str) -> list[dict[str, Any]]:
        """Return list of credential dicts for a user."""
        return [c for c in self._credentials.values() if c["username"] == username]

    def get_credential_by_id(self, credential_id: bytes) -> dict[str, Any] | None:
        """Return a single credential by its ID."""
        return self._credentials.get(credential_id)

    def delete_credential(self, username: str, credential_id: bytes) -> bool:
        """Remove a credential. Returns True if found and removed."""
        cred = self._credentials.get(credential_id)
        if cred is None or cred["username"] != username:
            return False
        del self._credentials[credential_id]
        return True

    def update_sign_count(self, credential_id: bytes, new_count: int) -> None:
        """Update the sign count for a credential."""
        cred = self._credentials.get(credential_id)
        if cred is not None:
            cred["sign_count"] = new_count

    def create_challenge_token(self, state_dict: dict[str, Any]) -> str:
        """Create a JWT-based challenge token encoding the state with expiry."""
        payload = {**state_dict, "exp": int(time.time()) + self._jwt_expiry_seconds}
        return jwt.encode(payload, self._jwt_secret, algorithm="HS256")

    def verify_challenge_token(self, token: str) -> dict[str, Any]:
        """Verify and decode a challenge token. Raises on invalid/expired."""
        return jwt.decode(token, self._jwt_secret, algorithms=["HS256"])

    def register_begin(
        self,
        username: str,
    ) -> tuple[Any, Any]:
        """Begin FIDO2 registration. Returns (options, state).

        Uses a stable user_id derived from the username hash so the same user
        always gets the same WebAuthn user handle across registrations.
        """
        user_id = hashlib.sha256(username.encode()).digest()[:16]
        user = PublicKeyCredentialUserEntity(
            name=username,
            id=user_id,
            display_name=username,
        )
        return self._server.register_begin(user, credentials=[])

    def register_complete(self, state: Any, response: Any) -> Any:
        """Complete FIDO2 registration. Returns auth_data."""
        return self._server.register_complete(state, response)

    def authenticate_begin(self, username: str) -> tuple[Any, Any]:
        """Begin FIDO2 authentication. Returns (options, state).

        Passes all user's credential_data objects so the browser gets the full
        allowCredentials list and the user can pick any registered passkey.
        """
        credentials = [c["credential_data"] for c in self.get_credentials(username)]
        return self._server.authenticate_begin(credentials)

    def authenticate_complete(
        self,
        state: Any,
        credential_id: bytes,
        username: str,
        response: Any,
    ) -> Any:
        """Complete FIDO2 authentication.

        Looks up the specific credential used (from assertion's rawId), verifies
        ownership by username, and authenticates against that credential only.
        """
        cred = self.get_credential_by_id(credential_id)
        if cred is None:
            raise ValueError("Unknown credential")
        if cred["username"] != username:
            raise ValueError("Credential does not belong to user")
        return self._server.authenticate_complete(state, [cred["credential_data"]], response)
