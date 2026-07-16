from typing import Any

from pydantic import BaseModel, Field


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


class FidoLoginBeginRequest(BaseModel):
    username: str


class FidoLoginCompleteRequest(BaseModel):
    challenge_token: str
    assertion: dict[str, Any]


class TransferRequest(BaseModel):
    amount: float = Field(gt=0)
