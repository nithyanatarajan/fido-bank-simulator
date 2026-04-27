"""Test configuration — set required env vars before app import."""

import os

os.environ.setdefault("JWT_SECRET", "test-secret-that-is-long-enough")
os.environ.setdefault("RP_ID", "localhost")
os.environ.setdefault("RP_NAME", "Test Bank")
os.environ.setdefault("RP_ORIGIN", "http://localhost:9090")
