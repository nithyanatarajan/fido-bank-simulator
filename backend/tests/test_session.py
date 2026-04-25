"""Tests for session token management."""

import time

from app.services.session import SessionManager


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

    def test_verify_valid_token_with_max_age(self) -> None:
        token = self.session.create_token("alice")
        assert self.session.verify_token(token, max_age=3600) == "alice"

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

    def test_expired_token_returns_none(self) -> None:
        """Token older than max_age should be rejected."""
        token = self.session.create_token("alice")
        # Sleep 2+ seconds so the integer-second age exceeds max_age=1
        time.sleep(2.1)
        assert self.session.verify_token(token, max_age=1) is None

    def test_not_expired_token_accepted(self) -> None:
        """Freshly created token should be accepted with reasonable max_age."""
        token = self.session.create_token("alice")
        # Token was just created, max_age of 3600 should be fine
        assert self.session.verify_token(token, max_age=3600) == "alice"

    def test_no_max_age_skips_expiry_check(self) -> None:
        """When max_age is None, no expiry check is performed."""
        token = self.session.create_token("alice")
        assert self.session.verify_token(token, max_age=None) == "alice"
