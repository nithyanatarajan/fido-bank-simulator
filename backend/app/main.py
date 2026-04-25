from fastapi import FastAPI

from app.config import settings
from app.routers import banking, fido, users
from app.services.fido_service import FidoService
from app.services.session import SessionManager
from app.services.user_store import UserStore

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

banking.session_manager = session_manager
banking.fido_stepup_enabled = settings.fido_stepup_enabled

app.include_router(banking.router)
app.include_router(users.router)
app.include_router(fido.router)
