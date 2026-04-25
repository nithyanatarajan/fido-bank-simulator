"""User registration, login, logout, and session endpoints."""

from fastapi import APIRouter, Cookie, Response
from starlette.responses import JSONResponse

from app.models import MessageResponse, UserLoginRequest, UserRegisterRequest, UserResponse
from app.services.session import SessionManager
from app.services.user_store import UserStore

router = APIRouter(prefix="/users", tags=["users"])

# Module-level singletons, wired from main.py
user_store: UserStore | None = None
session_manager: SessionManager | None = None
session_max_age: int = 3600


@router.post("/register", response_model=UserResponse, status_code=201)
def register(req: UserRegisterRequest) -> UserResponse | JSONResponse:
    """Register a new user."""
    assert user_store is not None
    try:
        user_store.register(req.username, req.password)
    except ValueError:
        return JSONResponse(status_code=409, content={"message": "Username already exists"})
    return UserResponse(username=req.username)


@router.post("/login", response_model=MessageResponse)
def login(req: UserLoginRequest, response: Response) -> MessageResponse | JSONResponse:
    """Login and set session cookie."""
    assert user_store is not None
    assert session_manager is not None
    if not user_store.verify(req.username, req.password):
        return JSONResponse(status_code=401, content={"message": "Invalid credentials"})
    token = session_manager.create_token(req.username)
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        samesite="strict",
        max_age=session_max_age,
    )
    return MessageResponse(message="Login successful")


@router.post("/logout", response_model=MessageResponse)
def logout(response: Response) -> MessageResponse:
    """Logout and clear session cookie."""
    response.delete_cookie(key="session")
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserResponse)
def me(session: str | None = Cookie(default=None)) -> UserResponse | JSONResponse:
    """Return current user from session cookie."""
    assert session_manager is not None
    assert user_store is not None
    if session is None:
        return JSONResponse(status_code=401, content={"message": "Not authenticated"})
    username = session_manager.verify_token(session, max_age=session_max_age)
    if username is None:
        return JSONResponse(status_code=401, content={"message": "Invalid session"})
    if not user_store.exists(username):
        return JSONResponse(status_code=401, content={"message": "User not found"})
    return UserResponse(username=username)
