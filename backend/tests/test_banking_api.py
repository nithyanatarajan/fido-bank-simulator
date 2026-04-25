"""Integration tests for banking API endpoints."""

from app.main import app
from app.routers import banking as banking_module
from app.routers import users as users_module
from app.services.session import SessionManager
from app.services.user_store import UserStore
from starlette.testclient import TestClient


class TestBankingAPI:
    """Tests for banking endpoints: /health, /transfer, /config/stepup."""

    def setup_method(self) -> None:
        """Reset stores and wire fresh singletons before each test."""
        user_store = UserStore()
        session_manager = SessionManager(secret="test-secret-that-is-long-enough")
        users_module.user_store = user_store
        users_module.session_manager = session_manager
        users_module.session_max_age = 3600
        banking_module.session_manager = session_manager
        banking_module.fido_stepup_enabled = True
        self.client = TestClient(app)

    def _login(self, username: str = "alice", password: str = "pass123") -> None:
        """Register and login a user."""
        self.client.post("/users/register", json={"username": username, "password": password})
        self.client.post("/users/login", json={"username": username, "password": password})

    # --- /health ---

    def test_health_returns_ok(self) -> None:
        resp = self.client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}

    # --- /transfer ---

    def test_transfer_requires_auth(self) -> None:
        resp = self.client.post("/transfer")
        assert resp.status_code == 401

    def test_transfer_with_stepup_enabled(self) -> None:
        self._login()
        resp = self.client.post("/transfer")
        assert resp.status_code == 200
        assert resp.json()["status"] == "step_up_required"

    def test_transfer_with_stepup_disabled(self) -> None:
        banking_module.fido_stepup_enabled = False
        self._login()
        resp = self.client.post("/transfer")
        assert resp.status_code == 200
        assert resp.json()["status"] == "success"

    # --- /config/stepup ---

    def test_stepup_config_returns_enabled(self) -> None:
        resp = self.client.get("/config/stepup")
        assert resp.status_code == 200
        assert resp.json()["fido_stepup_enabled"] is True

    def test_stepup_config_returns_disabled(self) -> None:
        banking_module.fido_stepup_enabled = False
        resp = self.client.get("/config/stepup")
        assert resp.status_code == 200
        assert resp.json()["fido_stepup_enabled"] is False
