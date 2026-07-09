"""Schemas de Auth."""
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserMeResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    unit: str | None
    badge_number: str | None
    is_active: bool
