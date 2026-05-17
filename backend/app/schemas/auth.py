from pydantic import BaseModel, EmailStr
from typing import Optional


class UserRegister(BaseModel):
    """Schema for user registration (CS203)."""
    email: EmailStr
    password: str
    business_name: str
    business_type: str
    phone: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for user login (CS203)."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response (CS203)."""
    id: str
    email: str
    business_name: str
    business_type: str
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for token response (CS203)."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
