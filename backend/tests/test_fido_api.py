"""Integration tests for FIDO API endpoints."""

from app.main import app
from app.routers import fido as fido_module
from app.routers import users as users_module
from app.services.fido_service import FidoService
from app.services.session import SessionManager
from app.services.user_store import UserStore
from starlette.testclient import TestClient


class TestFidoAPI:
    """Tests for /fido/* endpoints."""

    def setup_method(self) -> None:
        """Reset stores and wire fresh singletons before each test."""
        user_store = UserStore()
        session_manager = SessionManager(secret="test-secret-that-is-long-enough")
        fido_service = FidoService(
            rp_id="localhost",
            rp_name="Test Bank",
            rp_origin="http://localhost:9090",
            jwt_secret="test-secret-that-is-long-enough",
            jwt_expiry_seconds=300,
        )
        users_module.user_store = user_store
        users_module.session_manager = session_manager
        users_module.session_max_age = 3600
        fido_module.fido_service = fido_service
        fido_module.session_manager = session_manager
        self.client = TestClient(app)

    def _login(self, username: str = "alice", password: str = "pass123") -> None:
        """Register and login a user, setting session cookie on the client."""
        self.client.post("/users/register", json={"username": username, "password": password})
        self.client.post("/users/login", json={"username": username, "password": password})

    # --- /fido/register/begin ---

    def test_register_begin_requires_auth(self) -> None:
        resp = self.client.post("/fido/register/begin")
        assert resp.status_code == 401

    def test_register_begin_returns_public_key_and_token(self) -> None:
        self._login()
        resp = self.client.post("/fido/register/begin")
        assert resp.status_code == 200
        data = resp.json()
        assert "publicKey" in data
        assert "challenge_token" in data
        assert "challenge" in data["publicKey"]

    # --- /fido/register/complete ---

    def test_register_complete_requires_auth(self) -> None:
        resp = self.client.post(
            "/fido/register/complete",
            json={"challenge_token": "fake", "attestation": {}},
        )
        assert resp.status_code == 401

    def test_register_complete_rejects_invalid_token(self) -> None:
        self._login()
        resp = self.client.post(
            "/fido/register/complete",
            json={"challenge_token": "invalid-token", "attestation": {}},
        )
        assert resp.status_code in (400, 500)

    # --- /fido/credentials ---

    def test_credentials_empty_for_new_user(self) -> None:
        self._login()
        resp = self.client.get("/fido/credentials")
        assert resp.status_code == 200
        assert resp.json()["credentials"] == []

    def test_credentials_requires_auth(self) -> None:
        resp = self.client.get("/fido/credentials")
        assert resp.status_code == 401

    # --- /fido/credentials/{id} DELETE ---

    def test_delete_credential_requires_auth(self) -> None:
        resp = self.client.delete("/fido/credentials/AQIDBA")
        assert resp.status_code == 401

    def test_delete_credential_not_found(self) -> None:
        self._login()
        resp = self.client.delete("/fido/credentials/AQIDBA")
        assert resp.status_code == 404

    def test_delete_credential_invalid_base64(self) -> None:
        self._login()
        resp = self.client.delete("/fido/credentials/%00%ff%fe")
        assert resp.status_code in (400, 404)

    # --- /fido/auth/begin ---

    def test_auth_begin_requires_auth(self) -> None:
        resp = self.client.post("/fido/auth/begin")
        assert resp.status_code == 401

    def test_auth_begin_no_passkeys(self) -> None:
        self._login()
        resp = self.client.post("/fido/auth/begin")
        assert resp.status_code == 400
        assert "No passkeys" in resp.json()["message"]

    # --- /fido/auth/complete ---

    def test_auth_complete_requires_auth(self) -> None:
        resp = self.client.post(
            "/fido/auth/complete",
            json={"challenge_token": "fake", "assertion": {}},
        )
        assert resp.status_code == 401

    def test_auth_complete_rejects_invalid_token(self) -> None:
        self._login()
        resp = self.client.post(
            "/fido/auth/complete",
            json={"challenge_token": "invalid-token", "assertion": {"rawId": "AQID"}},
        )
        assert resp.status_code in (400, 500)
