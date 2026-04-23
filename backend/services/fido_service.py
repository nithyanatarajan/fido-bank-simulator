"""FIDO2/WebAuthn service using py-fido2 with in-memory credential storage."""

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
    ) -> None:
        rp = PublicKeyCredentialRpEntity(name=rp_name, id=rp_id)
        allowed_origins = {rp_origin}
        # Also allow the Vite dev server origin for local development
        if "localhost" in rp_origin:
            allowed_origins.add("http://localhost:5173")
        self._server = Fido2Server(rp, verify_origin=lambda o: o in allowed_origins)
        self._jwt_secret = jwt_secret
        self._jwt_expiry_seconds = jwt_expiry_seconds
        # In-memory credential store: username -> list of credential dicts
        self._credentials: dict[str, list[dict[str, Any]]] = {}

    def store_credential(
        self,
        username: str,
        credential_id: bytes,
        public_key: bytes,
        sign_count: int,
    ) -> None:
        """Store a credential for a user."""
        if username not in self._credentials:
            self._credentials[username] = []
        self._credentials[username].append(
            {
                "credential_id": credential_id,
                "public_key": public_key,
                "sign_count": sign_count,
            }
        )

    def get_credentials(self, username: str) -> list[dict[str, Any]]:
        """Return list of credential dicts for a user."""
        return self._credentials.get(username, [])

    def get_attested_credentials(self, username: str) -> list[AttestedCredentialData]:
        """Return list of AttestedCredentialData for py-fido2 operations."""
        result = []
        for cred in self._credentials.get(username, []):
            acd = AttestedCredentialData.create(
                aaguid=b"\x00" * 16,
                credential_id=cred["credential_id"],
                public_key=cred["public_key"],
            )
            result.append(acd)
        return result

    def update_sign_count(self, credential_id: bytes, new_count: int) -> None:
        """Update the sign count for a credential."""
        for creds in self._credentials.values():
            for cred in creds:
                if cred["credential_id"] == credential_id:
                    cred["sign_count"] = new_count
                    return

    def create_challenge_token(self, state_dict: dict[str, Any]) -> str:
        """Create a JWT-based challenge token encoding the state."""
        return jwt.encode(state_dict, self._jwt_secret, algorithm="HS256")

    def verify_challenge_token(self, token: str) -> dict[str, Any]:
        """Verify and decode a challenge token. Raises on invalid/expired."""
        return jwt.decode(token, self._jwt_secret, algorithms=["HS256"])

    def register_begin(
        self,
        username: str,
        user_id: bytes,
    ) -> tuple[Any, Any]:
        """Begin FIDO2 registration. Returns (options, state)."""
        user = PublicKeyCredentialUserEntity(
            name=username,
            id=user_id,
            display_name=username,
        )
        existing = self.get_attested_credentials(username)
        return self._server.register_begin(user, credentials=existing)

    def register_complete(self, state: Any, response: Any) -> Any:
        """Complete FIDO2 registration. Returns auth_data."""
        return self._server.register_complete(state, response)

    def authenticate_begin(self, username: str) -> tuple[Any, Any]:
        """Begin FIDO2 authentication. Returns (options, state)."""
        credentials = self.get_attested_credentials(username)
        return self._server.authenticate_begin(credentials)

    def authenticate_complete(
        self,
        state: Any,
        credentials: list[AttestedCredentialData],
        response: Any,
    ) -> Any:
        """Complete FIDO2 authentication. Returns credential result."""
        return self._server.authenticate_complete(state, credentials, response)
