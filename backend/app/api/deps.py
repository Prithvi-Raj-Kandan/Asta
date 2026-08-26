"""Shared FastAPI dependencies."""
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from ..core.security import decode_access_token
from ..db.session import get_db
from ..models.reflected import UserSimple
from ..services.user_identity import resolve_primary_user_id


def get_current_user_id(
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> str:
    """Return primary `users.id` for the Bearer token subject."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )

    payload = decode_access_token(authorization.replace("Bearer ", ""))
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    auth_user_id = payload.get("sub")
    user = db.query(UserSimple).filter(UserSimple.id == auth_user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return resolve_primary_user_id(db, auth_user_id)
