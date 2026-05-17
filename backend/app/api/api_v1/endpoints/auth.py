"""
CS203: Authentication endpoints (register, login, get current user profile)
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....models.reflected import User
from ....core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from ....schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    CS203: Register a new user.
    - email: user email (unique)
    - password: user password (will be hashed) - max 72 bytes
    - business_name: business name
    - business_type: business type (e.g., proprietorship, partnership, pvt_ltd)
    - phone: optional phone number
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        # Hash password
        hashed_password = get_password_hash(user_data.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Create new user using attribute names compatible with reflected model
    new_user = User()

    # Helper to set the first attribute that exists on the reflected model
    def set_first_attr(obj, candidates, value):
        for name in candidates:
            if hasattr(obj, name):
                setattr(obj, name, value)
                return True
        # fallback: set the first candidate anyway
        setattr(obj, candidates[0], value)
        return False

    set_first_attr(new_user, ["email", "emailaddress", "user_email"], user_data.email)
    set_first_attr(new_user, ["password_hash", "passwordhash", "passwordHash", "password"], hashed_password)
    set_first_attr(new_user, ["business_name", "businessname", "businessName"], user_data.business_name)
    set_first_attr(new_user, ["business_type", "businesstype", "businessType"], user_data.business_type)
    if user_data.phone:
        set_first_attr(new_user, ["phone", "phone_number", "mobile"], user_data.phone)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(new_user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(new_user)
    }


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    CS203: Login user and return access token.
    - email: user email
    - password: user password
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify password - try multiple possible reflected attribute names
    hashed = None
    for attr in ("password_hash", "passwordhash", "passwordHash", "password"):
        if hasattr(user, attr):
            hashed = getattr(user, attr)
            break

    if not hashed:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User has no password set"
        )

    if not verify_password(credentials.password, hashed):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(user)
    }


@router.get("/me", response_model=UserResponse)
def get_current_user(token: str = None, db: Session = Depends(get_db)):
    """
    CS203: Get current user profile.
    - Requires Authorization header with Bearer token
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Decode token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.from_orm(user)
