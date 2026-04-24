"""In-memory user store with bcrypt password hashing."""

import bcrypt


class UserStore:
    """Simple in-memory user store keyed by username."""

    def __init__(self) -> None:
        self._users: dict[str, bytes] = {}

    def register(self, username: str, password: str) -> None:
        """Register a new user. Raises ValueError if username already exists."""
        if username in self._users:
            raise ValueError(f"User '{username}' already exists")
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        self._users[username] = hashed

    def verify(self, username: str, password: str) -> bool:
        """Verify username and password. Returns False if user doesn't exist or password is wrong."""
        stored = self._users.get(username)
        if stored is None:
            return False
        return bcrypt.checkpw(password.encode("utf-8"), stored)

    def exists(self, username: str) -> bool:
        """Check whether a username is registered."""
        return username in self._users
