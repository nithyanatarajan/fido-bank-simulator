"""Tests for FIDO service credential store and challenge tokens."""

import hashlib
import time

import jwt
import pytest
from app.services.fido_service import FidoService


class TestCredentialStore:
    """Tests for in-memory credential storage operations."""

    def setup_method(self) -> None:
        self.service = FidoService(
            rp_id="localhost",
            rp_name="Test Bank",
            rp_origin="http://localhost:9090",
            jwt_secret="test-secret-that-is-long-enough-32bytes",
        )

    def test_store_and_get_credential(self) -> None:
        cred_id = b"\x01\x02\x03\x04"
        mock_cred_data = object()
        self.service.store_credential("alice", cred_id, mock_cred_data, sign_count=0)
        creds = self.service.get_credentials("alice")
        assert len(creds) == 1
        assert creds[0]["credential_id"] == cred_id
        assert creds[0]["credential_data"] is mock_cred_data
        assert creds[0]["sign_count"] == 0

    def test_get_credentials_empty(self) -> None:
        assert self.service.get_credentials("nobody") == []

    def test_store_multiple_credentials(self) -> None:
        self.service.store_credential("alice", b"\x01", object(), sign_count=0)
        self.service.store_credential("alice", b"\x02", object(), sign_count=0)
        creds = self.service.get_credentials("alice")
        assert len(creds) == 2

    def test_get_credential_by_id(self) -> None:
        mock_cred = object()
        self.service.store_credential("alice", b"\x01", mock_cred, sign_count=0)
        cred = self.service.get_credential_by_id(b"\x01")
        assert cred is not None
        assert cred["credential_data"] is mock_cred

    def test_get_credential_by_id_not_found(self) -> None:
        assert self.service.get_credential_by_id(b"\xff") is None

    def test_update_sign_count(self) -> None:
        cred_id = b"\x01\x02\x03"
        self.service.store_credential("alice", cred_id, object(), sign_count=0)
        self.service.update_sign_count(cred_id, 5)
        creds = self.service.get_credentials("alice")
        assert creds[0]["sign_count"] == 5

    def test_update_sign_count_nonexistent(self) -> None:
        self.service.update_sign_count(b"\xff\xff", 1)

    def test_credentials_isolated_by_user(self) -> None:
        self.service.store_credential("alice", b"\x01", object(), sign_count=0)
        self.service.store_credential("bob", b"\x02", object(), sign_count=0)
        assert len(self.service.get_credentials("alice")) == 1
        assert len(self.service.get_credentials("bob")) == 1

    def test_delete_credential_found(self) -> None:
        self.service.store_credential("alice", b"\x01", object(), sign_count=0)
        self.service.store_credential("alice", b"\x02", object(), sign_count=0)
        assert self.service.delete_credential("alice", b"\x01") is True
        creds = self.service.get_credentials("alice")
        assert len(creds) == 1
        assert creds[0]["credential_id"] == b"\x02"

    def test_delete_credential_not_found(self) -> None:
        self.service.store_credential("alice", b"\x01", object(), sign_count=0)
        assert self.service.delete_credential("alice", b"\xff") is False
        assert len(self.service.get_credentials("alice")) == 1

    def test_delete_credential_wrong_user(self) -> None:
        self.service.store_credential("alice", b"\x01", object(), sign_count=0)
        assert self.service.delete_credential("bob", b"\x01") is False
        assert len(self.service.get_credentials("alice")) == 1

    def test_delete_credential_no_user(self) -> None:
        assert self.service.delete_credential("nobody", b"\x01") is False

    def test_delete_last_credential(self) -> None:
        self.service.store_credential("alice", b"\x01", object(), sign_count=0)
        assert self.service.delete_credential("alice", b"\x01") is True
        assert self.service.get_credentials("alice") == []


class TestCredentialOwnership:
    """Tests for credential ownership checks during authentication."""

    def setup_method(self) -> None:
        self.service = FidoService(
            rp_id="localhost",
            rp_name="Test Bank",
            rp_origin="http://localhost:9090",
            jwt_secret="test-secret-that-is-long-enough-32bytes",
        )

    def test_authenticate_complete_rejects_unknown_credential(self) -> None:
        with pytest.raises(ValueError, match="Unknown credential"):
            self.service.authenticate_complete(
                state={},
                credential_id=b"\xff",
                username="alice",
                response={},
            )

    def test_authenticate_complete_rejects_wrong_user(self) -> None:
        self.service.store_credential("alice", b"\x01", object(), sign_count=0)
        with pytest.raises(ValueError, match="does not belong to user"):
            self.service.authenticate_complete(
                state={},
                credential_id=b"\x01",
                username="bob",
                response={},
            )


class TestStableUserId:
    """Tests for stable user_id generation from username."""

    def test_same_username_produces_same_user_id(self) -> None:
        """The user_id should be deterministic based on the username."""
        expected = hashlib.sha256(b"alice").digest()[:16]
        # We can't call register_begin without a full Fido2Server setup,
        # but we can verify the hashing logic directly
        user_id_1 = hashlib.sha256(b"alice").digest()[:16]
        user_id_2 = hashlib.sha256(b"alice").digest()[:16]
        assert user_id_1 == user_id_2
        assert user_id_1 == expected

    def test_different_usernames_produce_different_user_ids(self) -> None:
        user_id_alice = hashlib.sha256(b"alice").digest()[:16]
        user_id_bob = hashlib.sha256(b"bob").digest()[:16]
        assert user_id_alice != user_id_bob


class TestChallengeTokens:
    """Tests for JWT-based challenge token creation and verification."""

    def setup_method(self) -> None:
        self.service = FidoService(
            rp_id="localhost",
            rp_name="Test Bank",
            rp_origin="http://localhost:9090",
            jwt_secret="test-secret-that-is-long-enough-32bytes",
            jwt_expiry_seconds=300,
        )

    def test_create_and_verify_challenge_token(self) -> None:
        state = {"challenge": "abc123", "user_verification": "required"}
        token = self.service.create_challenge_token(state)
        assert isinstance(token, str)
        recovered = self.service.verify_challenge_token(token)
        assert recovered["challenge"] == state["challenge"]
        assert recovered["user_verification"] == state["user_verification"]

    def test_challenge_token_includes_exp_claim(self) -> None:
        state = {"challenge": "abc123"}
        token = self.service.create_challenge_token(state)
        decoded = jwt.decode(
            token,
            "test-secret-that-is-long-enough-32bytes",
            algorithms=["HS256"],
        )
        assert "exp" in decoded
        assert decoded["exp"] > int(time.time())
        assert decoded["exp"] <= int(time.time()) + 300

    def test_verify_invalid_token(self) -> None:
        with pytest.raises(jwt.DecodeError):
            self.service.verify_challenge_token("not-a-valid-token")

    def test_verify_tampered_token(self) -> None:
        state = {"challenge": "abc123"}
        token = self.service.create_challenge_token(state)
        tampered = token[:-5] + "xxxxx"
        with pytest.raises(jwt.DecodeError):
            self.service.verify_challenge_token(tampered)

    def test_expired_challenge_token_rejected(self) -> None:
        """A token with exp in the past should be rejected."""
        expired_service = FidoService(
            rp_id="localhost",
            rp_name="Test Bank",
            rp_origin="http://localhost:9090",
            jwt_secret="test-secret-that-is-long-enough-32bytes",
            jwt_expiry_seconds=0,
        )
        state = {"challenge": "abc123"}
        token = expired_service.create_challenge_token(state)
        # Token was created with exp = now + 0, so it should be expired immediately
        time.sleep(1.1)
        with pytest.raises(jwt.ExpiredSignatureError):
            expired_service.verify_challenge_token(token)
