"""Tests for user API endpoints."""

from starlette.testclient import TestClient

from backend.main import app
from backend.routers import users as users_module


class TestUsersAPI:
    """Tests for /users/* endpoints."""

    def setup_method(self) -> None:
        """Reset the user store before each test."""
        from backend.services.user_store import UserStore

        users_module.user_store = UserStore()
        self.client = TestClient(app)

    def test_register_success(self) -> None:
        resp = self.client.post("/users/register", json={"username": "alice", "password": "pass123"})
        assert resp.status_code == 201
        assert resp.json()["username"] == "alice"

    def test_register_duplicate(self) -> None:
        self.client.post("/users/register", json={"username": "alice", "password": "pass123"})
        resp = self.client.post("/users/register", json={"username": "alice", "password": "other"})
        assert resp.status_code == 409

    def test_login_success(self) -> None:
        self.client.post("/users/register", json={"username": "alice", "password": "pass123"})
        resp = self.client.post("/users/login", json={"username": "alice", "password": "pass123"})
        assert resp.status_code == 200
        assert "session" in resp.cookies

    def test_login_bad_credentials(self) -> None:
        self.client.post("/users/register", json={"username": "alice", "password": "pass123"})
        resp = self.client.post("/users/login", json={"username": "alice", "password": "wrong"})
        assert resp.status_code == 401

    def test_login_nonexistent_user(self) -> None:
        resp = self.client.post("/users/login", json={"username": "nobody", "password": "pass"})
        assert resp.status_code == 401

    def test_logout_clears_cookie(self) -> None:
        self.client.post("/users/register", json={"username": "alice", "password": "pass123"})
        self.client.post("/users/login", json={"username": "alice", "password": "pass123"})
        resp = self.client.post("/users/logout")
        assert resp.status_code == 200
        # After logout, /users/me should return 401
        resp = self.client.get("/users/me")
        assert resp.status_code == 401

    def test_me_authenticated(self) -> None:
        self.client.post("/users/register", json={"username": "alice", "password": "pass123"})
        self.client.post("/users/login", json={"username": "alice", "password": "pass123"})
        resp = self.client.get("/users/me")
        assert resp.status_code == 200
        assert resp.json()["username"] == "alice"

    def test_me_unauthenticated(self) -> None:
        resp = self.client.get("/users/me")
        assert resp.status_code == 401
