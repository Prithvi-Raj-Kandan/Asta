"""
CS203: Authentication endpoints (register, login, get current user profile)
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....models.reflected import UserSimple
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
    existing_user = db.query(UserSimple).filter(UserSimple.email == user_data.email).first()
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

    # Create new user - users_simple table has exact column names matching our schema
    new_user = UserSimple()
    new_user.email = user_data.email
    new_user.password_hash = hashed_password
    new_user.business_name = user_data.business_name
    new_user.business_type = user_data.business_type
    if user_data.phone:
        new_user.phone = user_data.phone

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
    user = db.query(UserSimple).filter(UserSimple.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.password_hash):
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
    user = db.query(UserSimple).filter(UserSimple.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.from_orm(user)
