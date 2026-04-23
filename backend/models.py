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
