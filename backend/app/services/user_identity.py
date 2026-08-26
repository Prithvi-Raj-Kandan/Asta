from sqlalchemy.orm import Session

from ..models.reflected import User, UserSimple


def resolve_primary_user_id(db: Session, auth_user_id: str) -> str:
    """Resolve the users-table ID for an authenticated users_simple row."""
    auth_user = db.query(UserSimple).filter(UserSimple.id == auth_user_id).first()
    if not auth_user:
        return auth_user_id

    primary_user = db.query(User).filter(User.email == auth_user.email).first()
    if primary_user:
        return str(primary_user.id)

    primary_user = User()
    primary_user.id = auth_user.id
    primary_user.email = auth_user.email
    primary_user.passwordhash = auth_user.password_hash
    primary_user.businessname = auth_user.business_name
    primary_user.businesstype = auth_user.business_type
    primary_user.state = "NA"
    primary_user.statecode = "NA"
    primary_user.sector = "General"
    primary_user.employeecount = 0
    primary_user.annualturnover = "0"
    primary_user.exportenabled = False
    primary_user.onboardingcomplete = False

    db.add(primary_user)
    db.flush()
    return str(primary_user.id)