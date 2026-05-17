from fastapi import APIRouter, Depends
from sqlalchemy import text
from ...db.session import get_db

router = APIRouter()

@router.get("/")
def health(db=Depends(get_db)):
    try:
        # simple test query
        next(db.execute(text("SELECT 1")))
        return {"status": "ok", "db": True}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
