from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.routers import banking, users
from backend.services.session import SessionManager
from backend.services.user_store import UserStore

app = FastAPI(title="FIDO Bank Simulator")

# Create singletons and wire into routers
user_store = UserStore()
session_manager = SessionManager(secret=settings.jwt_secret)

users.user_store = user_store
users.session_manager = session_manager

app.include_router(banking.router)
app.include_router(users.router)

static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
