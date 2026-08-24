"""
CS204: File upload and management endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Header
from sqlalchemy.orm import Session
from uuid import uuid4
import os
from pathlib import Path

from ....db.session import get_db
from ....models.reflected import UserSimple, ExtractionJob
from ....core.security import decode_access_token
from ....schemas.upload import UploadCreate, UploadResponse, UploadListResponse
from ....schemas.extraction import ConfirmDraftRequest, InvoiceListRow, UploadDraftResponse, GSTR1DraftRow, ExtractionIssue
from ....services.user_identity import resolve_primary_user_id
from ....agents.ocr_agent import OCRAgent
from .invoices import confirm_draft_to_invoice

router = APIRouter()

# Upload directory
UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


def get_current_user_id(authorization: str | None = Header(None, alias="Authorization"), db: Session = Depends(get_db)) -> str:
    """Extract and verify user from bearer token; return primary users.id."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
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
    
    return resolve_primary_user_id(db, user_id)


def _map_and_set(obj, mapping: dict):
    """Set attributes on a reflected SQLAlchemy model instance using best-effort column name mapping."""
    cols = {c.name for c in obj.__table__.columns}

    def find(col_candidates):
        for name in col_candidates:
            if name in cols:
                return name
        # try relaxed matches (remove underscores)
        stripped = {c.replace("_", ""): c for c in cols}
        for name in col_candidates:
            key = name.replace("_", "")
            if key in stripped:
                return stripped[key]
        return None

    for logical_name, value in mapping.items():
        candidates = [
            logical_name,
            logical_name.replace("user_id", "userid"),
            logical_name.replace("file_path", "filepath"),
            logical_name.replace("filesize", "filesizebytes"),
            logical_name.replace("document_type", "documenttype"),
            logical_name.replace("raw_text", "rawtext"),
            logical_name.replace("extracted_data", "extracteddata"),
            logical_name.replace("ocr_confidence", "ocrconfidence"),
        ]
        col = find(candidates)
        if col:
            setattr(obj, col, value)
        else:
            setattr(obj, logical_name, value)


def _get_attr(obj, logical_name, default=None):
    cols = {c.name for c in obj.__table__.columns}
    if logical_name in cols:
        return getattr(obj, logical_name)
    alt = logical_name.replace("_", "")
    for c in cols:
        if c.replace("_", "") == alt:
            return getattr(obj, c)
    return getattr(obj, logical_name, default)


def _upload_timestamp(upload):
    completed_at = _get_attr(upload, "completedat", None)
    if completed_at:
        return completed_at

    return _get_attr(upload, "createdat", None)


def _upload_filesize(upload):
    filesize = _get_attr(upload, "filesizebytes", None)
    if filesize is None:
        filesize = _get_attr(upload, "filesize", 0)
    return int(filesize or 0)


def _normalize_filetype(file_name: str, content_type: str | None) -> str:
    extension = Path(file_name).suffix.lower().lstrip(".")
    mime_type = (content_type or "").lower()

    if mime_type == "application/pdf" or extension == "pdf":
        return "pdf"
    if mime_type in {"image/jpeg", "image/jpg"} or extension in {"jpg", "jpeg"}:
        return "jpg"
    if mime_type == "image/png" or extension == "png":
        return "png"
    if mime_type in {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
    } or extension in {"xlsx", "xls"}:
        return "xlsx"
    if mime_type == "text/csv" or extension == "csv":
        return "csv"

    return (extension[:4] if extension else "pdf")


@router.post("/", response_model=UploadDraftResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    document_type: str = Form("sale_bill"),
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    CS204: Upload a file, extract OCR data, build draft row, and return UploadDraftResponse.
    - file: the file to upload (multipart form data)
    - document_type: type of document (sale_bill, purchase_bill, credit_note, etc.)
    - Authorization: Bearer token (header)
    """
    user_id = get_current_user_id(authorization, db)
    
    # Save file
    file_id = str(uuid4())
    file_extension = Path(file.filename).suffix
    saved_filename = f"{file_id}{file_extension}"
    file_path = UPLOAD_DIR / saved_filename
    
    # Read and save file content
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    filesize = len(content)
    filetype = _normalize_filetype(file.filename, file.content_type)
    
    # Perform OCR + field extraction via OCR agent (regex fallback inside agent)
    ocr_agent = OCRAgent()
    agent_result = ocr_agent.run(
        {"file_path": str(file_path), "document_type": document_type},
        {"db": db, "user_id": user_id},
    )
    if not agent_result.success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=agent_result.error or "Extraction failed",
        )

    extracted_text = agent_result.data.get("raw_text") or ""
    overall_confidence = agent_result.data.get("ocr_confidence")
    ocr_engine = agent_result.data.get("ocr_engine") or "ocr_agent"
    draft_row = GSTR1DraftRow(**(agent_result.data.get("draft_row") or {}))
    extraction_issues = [
        ExtractionIssue(**iss) if isinstance(iss, dict) else iss
        for iss in (agent_result.data.get("extraction_issues") or [])
    ]

    extracted_data_payload = {
        "document_type": document_type,
        "ocr_engine": ocr_engine,
        "draft_row": draft_row.model_dump(),
        "extraction_issues": [issue.model_dump() for issue in extraction_issues],
        "extraction_method": agent_result.data.get("method"),
    }

    # Create extraction job record in DB
    extraction_job = ExtractionJob()
    _map_and_set(extraction_job, {
        "id": file_id,
        "userid": user_id,
        "filename": file.filename,
        "filetype": filetype[:4],
        "filesizebytes": filesize,
        "status": "complete",
        "documenttype": document_type,
        "filepath": str(file_path),
        "rawtext": extracted_text,
        "extracteddata": extracted_data_payload,
        "ocrconfidence": overall_confidence,
        "confidencescores": {"ocr": overall_confidence, "method": agent_result.data.get("method")},
    })
    
    db.add(extraction_job)
    db.commit()
    db.refresh(extraction_job)
    
    return UploadDraftResponse(
        id=_get_attr(extraction_job, "id"),
        user_id=_get_attr(extraction_job, "userid"),
        filename=_get_attr(extraction_job, "filename"),
        filetype=_get_attr(extraction_job, "filetype"),
        filesize=_upload_filesize(extraction_job),
        status=_get_attr(extraction_job, "status"),
        upload_date=_upload_timestamp(extraction_job),
        file_path=_get_attr(extraction_job, "filepath"),
        document_type=document_type,
        ocr_engine=ocr_engine,
        draft_row=draft_row,
        extraction_issues=extraction_issues,
    )


@router.get("/", response_model=list[UploadListResponse])
def list_uploads(
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    CS204: List all uploads for the current user.
    - Authorization: Bearer token (header)
    """
    user_id = get_current_user_id(authorization, db)
    
    uploads = db.query(ExtractionJob).filter(
        ExtractionJob.userid == user_id
    ).all()
    
    return [
        UploadListResponse(
            id=_get_attr(upload, "id"),
            filename=_get_attr(upload, "filename"),
            filetype=_get_attr(upload, "filetype"),
            filesize=_upload_filesize(upload),
            status=_get_attr(upload, "status"),
            upload_date=_upload_timestamp(upload)
        )
        for upload in uploads
    ]


@router.get("/{upload_id}", response_model=UploadDraftResponse)
def get_upload(
    upload_id: str,
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    CS204: Get details of a specific upload.
    - upload_id: the ID of the upload
    - Authorization: Bearer token (header)
    """
    user_id = get_current_user_id(authorization, db)
    
    upload = db.query(ExtractionJob).filter(
        ExtractionJob.id == upload_id,
        ExtractionJob.userid == user_id
    ).first()
    
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found"
        )
    
    extracted_data = _get_attr(upload, "extracteddata", None) or {}
    draft_dict = extracted_data.get("draft_row", {})
    draft_row = GSTR1DraftRow(**draft_dict) if draft_dict else GSTR1DraftRow()
    issues_raw = extracted_data.get("extraction_issues", [])
    issues = [ExtractionIssue(**iss) if isinstance(iss, dict) else iss for iss in issues_raw]
    
    return UploadDraftResponse(
        id=_get_attr(upload, "id"),
        user_id=_get_attr(upload, "userid"),
        filename=_get_attr(upload, "filename"),
        filetype=_get_attr(upload, "filetype"),
        filesize=_upload_filesize(upload),
        status=_get_attr(upload, "status"),
        upload_date=_upload_timestamp(upload),
        file_path=_get_attr(upload, "filepath"),
        document_type=extracted_data.get("document_type", _get_attr(upload, "documenttype", "sale_bill")),
        ocr_engine=extracted_data.get("ocr_engine", "rapidocr-onnxruntime"),
        draft_row=draft_row,
        extraction_issues=issues,
    )


@router.get("/{upload_id}/file", status_code=status.HTTP_200_OK)
def download_file(
    upload_id: str,
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    CS204: Download a file.
    - upload_id: the ID of the upload
    - Authorization: Bearer token (header)
    """
    from fastapi.responses import FileResponse
    
    user_id = get_current_user_id(authorization, db)
    
    upload = db.query(ExtractionJob).filter(
        ExtractionJob.id == upload_id,
        ExtractionJob.userid == user_id
    ).first()
    
    file_path = _get_attr(upload, "filepath")

    if not upload or not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    
    return FileResponse(
        path=file_path,
        filename=_get_attr(upload, "filename"),
        media_type=_get_attr(upload, "filetype")
    )


@router.post("/{upload_id}/confirm", response_model=InvoiceListRow, status_code=status.HTTP_201_CREATED)
def confirm_upload(
    upload_id: str,
    payload: ConfirmDraftRequest,
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Confirm an uploaded draft into invoice, line item, and generated document rows."""
    return confirm_draft_to_invoice(payload, authorization, db, upload_id=upload_id)

