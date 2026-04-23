"""Tests for FIDO service credential store and challenge tokens."""

import jwt
import pytest

from backend.services.fido_service import FidoService


class TestCredentialStore:
    """Tests for in-memory credential storage operations."""

    def setup_method(self) -> None:
        self.service = FidoService(
            rp_id="localhost",
            rp_name="Test Bank",
            rp_origin="http://localhost:8000",
            jwt_secret="test-secret",
        )

    def test_store_and_get_credential(self) -> None:
        cred_id = b"\x01\x02\x03\x04"
        public_key = b"\x05\x06\x07\x08"
        self.service.store_credential("alice", cred_id, public_key, sign_count=0)
        creds = self.service.get_credentials("alice")
        assert len(creds) == 1
        assert creds[0]["credential_id"] == cred_id
        assert creds[0]["public_key"] == public_key
        assert creds[0]["sign_count"] == 0

    def test_get_credentials_empty(self) -> None:
        assert self.service.get_credentials("nobody") == []

    def test_store_multiple_credentials(self) -> None:
        self.service.store_credential("alice", b"\x01", b"\x10", sign_count=0)
        self.service.store_credential("alice", b"\x02", b"\x20", sign_count=0)
        creds = self.service.get_credentials("alice")
        assert len(creds) == 2

    def test_update_sign_count(self) -> None:
        cred_id = b"\x01\x02\x03"
        self.service.store_credential("alice", cred_id, b"\x10", sign_count=0)
        self.service.update_sign_count(cred_id, 5)
        creds = self.service.get_credentials("alice")
        assert creds[0]["sign_count"] == 5

    def test_update_sign_count_nonexistent(self) -> None:
        # Should not raise, just no-op
        self.service.update_sign_count(b"\xff\xff", 1)

    def test_credentials_isolated_by_user(self) -> None:
        self.service.store_credential("alice", b"\x01", b"\x10", sign_count=0)
        self.service.store_credential("bob", b"\x02", b"\x20", sign_count=0)
        assert len(self.service.get_credentials("alice")) == 1
        assert len(self.service.get_credentials("bob")) == 1


class TestChallengeTokens:
    """Tests for JWT-based challenge token creation and verification."""

    def setup_method(self) -> None:
        self.service = FidoService(
            rp_id="localhost",
            rp_name="Test Bank",
            rp_origin="http://localhost:8000",
            jwt_secret="test-secret",
        )

    def test_create_and_verify_challenge_token(self) -> None:
        state = {"challenge": "abc123", "user_verification": "required"}
        token = self.service.create_challenge_token(state)
        assert isinstance(token, str)
        recovered = self.service.verify_challenge_token(token)
        assert recovered == state

    def test_verify_invalid_token(self) -> None:
        with pytest.raises(jwt.DecodeError):
            self.service.verify_challenge_token("not-a-valid-token")

    def test_verify_tampered_token(self) -> None:
        state = {"challenge": "abc123"}
        token = self.service.create_challenge_token(state)
        tampered = token[:-5] + "xxxxx"
        with pytest.raises(jwt.DecodeError):
            self.service.verify_challenge_token(tampered)
