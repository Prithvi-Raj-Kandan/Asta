from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class UserRegister(BaseModel):
    """Schema for user registration (CS203)."""
    email: EmailStr
    password: str
    business_name: str
    business_type: str
    phone: Optional[str] = None

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Password is required')
        return v


class UserLogin(BaseModel):
    """Schema for user login (CS203)."""
    email: EmailStr
    password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Password is required')
        return v


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
