from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.routers import banking, fido, users
from backend.services.fido_service import FidoService
from backend.services.session import SessionManager
from backend.services.user_store import UserStore

app = FastAPI(title="FIDO Bank Simulator")

# Create singletons and wire into routers
user_store = UserStore()
session_manager = SessionManager(secret=settings.jwt_secret)
fido_service = FidoService(
    rp_id=settings.rp_id,
    rp_name=settings.rp_name,
    rp_origin=settings.rp_origin,
    jwt_secret=settings.jwt_secret,
    jwt_expiry_seconds=settings.jwt_expiry_seconds,
)

users.user_store = user_store
users.session_manager = session_manager

fido.fido_service = fido_service
fido.session_manager = session_manager

app.include_router(banking.router)
app.include_router(users.router)
app.include_router(fido.router)

static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
