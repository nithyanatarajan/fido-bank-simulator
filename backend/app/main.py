from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import banking, fido, users
from app.services.fido_service import FidoService
from app.services.session import SessionManager
from app.services.user_store import UserStore


def _validate_settings() -> None:
    """Validate required settings at startup."""
    required = {
        "jwt_secret": settings.jwt_secret,
        "rp_id": settings.rp_id,
        "rp_name": settings.rp_name,
        "rp_origin": settings.rp_origin,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise ValueError(f"Required settings are empty: {', '.join(missing)}")


_validate_settings()

app = FastAPI(title="FIDO Bank Simulator")

# CORS middleware — only added when origins are configured
if settings.cors_origin_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Create singletons and wire into routers
user_store = UserStore()
session_manager = SessionManager(secret=settings.jwt_secret)
fido_service = FidoService(
    rp_id=settings.rp_id,
    rp_name=settings.rp_name,
    rp_origin=settings.rp_origin,
    jwt_secret=settings.jwt_secret,
    jwt_expiry_seconds=settings.jwt_expiry_seconds,
    additional_origins=settings.cors_origin_list or None,
)

users.user_store = user_store
users.session_manager = session_manager
users.session_max_age = settings.session_max_age_seconds

fido.fido_service = fido_service
fido.session_manager = session_manager

banking.session_manager = session_manager
banking.fido_stepup_enabled = settings.fido_stepup_enabled

app.include_router(banking.router)
app.include_router(users.router)
app.include_router(fido.router)
