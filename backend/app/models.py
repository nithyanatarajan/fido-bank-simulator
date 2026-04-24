from typing import Any

from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str


class UserRegisterRequest(BaseModel):
    username: str
    password: str


class UserLoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    username: str


class FidoRegisterCompleteRequest(BaseModel):
    challenge_token: str
    attestation: dict[str, Any]


class FidoAuthCompleteRequest(BaseModel):
    challenge_token: str
    assertion: dict[str, Any]
