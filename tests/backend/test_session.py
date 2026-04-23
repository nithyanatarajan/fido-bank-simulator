"""Tests for session token management."""

from backend.services.session import SessionManager


class TestSessionManager:
    """Tests for token creation and verification."""

    def setup_method(self) -> None:
        self.session = SessionManager(secret="test-secret")

    def test_create_token(self) -> None:
        token = self.session.create_token("alice")
        assert isinstance(token, str)
        assert len(token) > 0

    def test_verify_valid_token(self) -> None:
        token = self.session.create_token("alice")
        assert self.session.verify_token(token) == "alice"

    def test_verify_invalid_token(self) -> None:
        assert self.session.verify_token("not-a-valid-token") is None

    def test_verify_tampered_token(self) -> None:
        token = self.session.create_token("alice")
        tampered = token[:-3] + "xxx"
        assert self.session.verify_token(tampered) is None

    def test_different_secrets_reject_tokens(self) -> None:
        other = SessionManager(secret="different-secret")
        token = self.session.create_token("alice")
        assert other.verify_token(token) is None
