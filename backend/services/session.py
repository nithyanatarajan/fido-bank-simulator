"""Session token management using itsdangerous signed serializer."""

from itsdangerous import BadSignature, URLSafeSerializer


class SessionManager:
    """Creates and verifies signed session tokens."""

    def __init__(self, secret: str) -> None:
        self._serializer = URLSafeSerializer(secret)

    def create_token(self, username: str) -> str:
        """Create a signed token encoding the username."""
        return self._serializer.dumps(username)

    def verify_token(self, token: str) -> str | None:
        """Verify a token and return the username, or None if invalid."""
        try:
            return self._serializer.loads(token)
        except BadSignature:
            return None
