"""Tests for FIDO service credential store and challenge tokens."""

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
            jwt_secret="test-secret",
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


class TestChallengeTokens:
    """Tests for JWT-based challenge token creation and verification."""

    def setup_method(self) -> None:
        self.service = FidoService(
            rp_id="localhost",
            rp_name="Test Bank",
            rp_origin="http://localhost:9090",
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
