"""GSTR-1 preview and export endpoints."""
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ....agents.document_generator import DocumentGeneratorAgent
from ....api.deps import get_current_user_id
from ....db.session import get_db

router = APIRouter()
doc_agent = DocumentGeneratorAgent()


class GSTR1PreviewRequest(BaseModel):
    filing_period: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m"))
    document_types: list[str] | None = None


class GSTR1ExportRequest(BaseModel):
    filing_period: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m"))
    format: str = "csv"
    document_types: list[str] | None = None
    triggered_by: str = "user"


@router.post("/gstr1/preview")
def preview_gstr1(
    body: GSTR1PreviewRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    rows = doc_agent.preview_rows(db, user_id, body.filing_period, body.document_types)
    return {
        "filing_period": body.filing_period,
        "row_count": len(rows),
        "rows": rows,
    }


@router.post("/gstr1/export")
def export_gstr1(
    body: GSTR1ExportRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    if body.format not in {"csv", "xlsx"}:
        raise HTTPException(status_code=400, detail="format must be csv or xlsx")

    result = doc_agent.run(
        {
            "filing_period": body.filing_period,
            "format": body.format,
            "document_types": body.document_types,
            "triggered_by": body.triggered_by,
        },
        {"db": db, "user_id": user_id},
    )
    db.commit()
    if not result.success:
        raise HTTPException(status_code=500, detail=result.error or "Export failed")

    path = Path(result.data["file_path"])
    if not path.exists():
        raise HTTPException(status_code=500, detail="Generated file missing")

    media = (
        "text/csv"
        if body.format == "csv"
        else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    return FileResponse(
        path,
        media_type=media,
        filename=result.data["filename"],
        headers={
            "X-Document-Id": result.data.get("document_id") or "",
            "X-Row-Count": str(result.data.get("row_count") or 0),
        },
    )
