"""Session token management using itsdangerous timed serializer."""

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer


class SessionManager:
    """Creates and verifies signed session tokens with expiry support."""

    def __init__(self, secret: str) -> None:
        self._serializer = URLSafeTimedSerializer(secret)

    def create_token(self, username: str) -> str:
        """Create a signed token encoding the username."""
        return self._serializer.dumps(username)

    def verify_token(self, token: str, max_age: int | None = None) -> str | None:
        """Verify a token and return the username, or None if invalid/expired."""
        try:
            return self._serializer.loads(token, max_age=max_age)
        except (BadSignature, SignatureExpired):
            return None
