"""Tests for the in-memory user store."""

import pytest
from app.services.user_store import UserStore


class TestUserStore:
    """Tests for UserStore registration and verification."""

    def setup_method(self) -> None:
        self.store = UserStore()

    def test_register_new_user(self) -> None:
        self.store.register("alice", "password123")
        assert self.store.exists("alice")

    def test_register_duplicate_raises_value_error(self) -> None:
        self.store.register("alice", "password123")
        with pytest.raises(ValueError, match="already exists"):
            self.store.register("alice", "other")

    def test_verify_correct_password(self) -> None:
        self.store.register("alice", "password123")
        assert self.store.verify("alice", "password123") is True

    def test_verify_wrong_password(self) -> None:
        self.store.register("alice", "password123")
        assert self.store.verify("alice", "wrongpassword") is False

    def test_verify_nonexistent_user(self) -> None:
        assert self.store.verify("ghost", "password123") is False

    def test_password_is_hashed(self) -> None:
        self.store.register("alice", "password123")
        stored = self.store._users["alice"]
        assert stored != "password123"
        assert stored != b"password123"

    def test_exists_returns_false_for_unknown(self) -> None:
        assert self.store.exists("nobody") is False
