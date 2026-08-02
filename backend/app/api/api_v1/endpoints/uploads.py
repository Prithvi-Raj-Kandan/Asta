"""
CS204: File upload and management endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Header, Form
from sqlalchemy.orm import Session
from uuid import uuid4
import os
from pathlib import Path
from datetime import datetime
import json

from ....db.session import get_db
from decimal import Decimal, InvalidOperation

from ....models.reflected import UserSimple, ExtractionJob, Invoice
from ....core.security import decode_access_token
from ....schemas.upload import UploadCreate, UploadResponse, UploadListResponse
from ....schemas.ocr import OCRExtractionResponse, OCRPageResult
from ....services.ocr import LocalOCRService, OCRServiceError
from ....schemas.extraction import UploadDraftResponse, GSTR1DraftRow, ExtractionIssue
from ....services.extraction import GSTR1ExtractionService
from ....schemas.extraction import ConfirmDraftRequest, InvoiceListRow
from ....services.user_identity import resolve_primary_user_id

router = APIRouter()
ocr_service = LocalOCRService()
gstr1_service = GSTR1ExtractionService()

# Upload directory
UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


def get_current_user_id(authorization: str | None = Header(None, alias="Authorization"), db: Session = Depends(get_db)) -> str:
    """Extract and verify user from bearer token."""
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
        # try direct candidate list
        candidates = [logical_name, logical_name.replace("user_id", "userid"), logical_name.replace("file_path", "filepath")]
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
    # last resort
    return getattr(obj, logical_name, default)


def _to_decimal(value: str | None):
    if value in {None, ""}:
        return None
    cleaned = str(value).replace(",", "").strip()
    try:
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return None


def _normalize_file_type(file_name: str, mime_type: str | None) -> str:
    extension = Path(file_name).suffix.lower().lstrip(".")
    if extension == "jpeg" or mime_type == "image/jpeg":
        return "jpg"
    if extension in {"jpg", "png", "pdf", "xlsx", "csv"}:
        return extension
    if mime_type == "application/pdf":
        return "pdf"
    if mime_type == "image/png":
        return "png"
    return "pdf"


def _download_mime_type(file_type: str | None) -> str:
    return {
        "pdf": "application/pdf",
        "jpg": "image/jpeg",
        "png": "image/png",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "csv": "text/csv",
    }.get((file_type or "").lower(), "application/octet-stream")


@router.post("/", response_model=UploadDraftResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    document_type: str = Form("sale_bill"),
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    CS204: Upload a file.
    - file: the file to upload (multipart form data)
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
    
    filesizebytes = len(content)
    filetype = _normalize_file_type(file.filename, file.content_type)
    
    # Create extraction job record (use dynamic attribute mapping to support reflected models)
    extraction_job = ExtractionJob()
    _map_and_set(extraction_job, {
        "id": file_id,
        "userid": user_id,
        "filename": file.filename,
        "filetype": filetype,
        "filesizebytes": filesizebytes,
        "status": "queued",
        "documenttype": document_type,
        "file_path": str(file_path),
    })
    
    db.add(extraction_job)
    db.commit()
    db.refresh(extraction_job)

    # Run OCR and build an editable draft row immediately after upload.
    try:
        _map_and_set(extraction_job, {"status": "extracting"})
        db.commit()
        db.refresh(extraction_job)

        ocr_result = ocr_service.extract(file_path)
        draft_row, issues = gstr1_service.build_draft(ocr_result.extracted_text, document_type)
        extracted_payload = {
            "draft_row": gstr1_service.draft_to_dict(draft_row),
            "extraction_issues": [issue.model_dump() for issue in issues],
            "ocr_engine": ocr_result.engine,
            "source_type": ocr_result.source_type,
            "page_count": len(ocr_result.pages),
            "extracted_text": ocr_result.extracted_text,
            "overall_confidence": ocr_result.overall_confidence,
            "pages": [
                {
                    "page_number": page.page_number,
                    "text": page.text,
                    "line_count": page.line_count,
                    "confidence": page.confidence,
                }
                for page in ocr_result.pages
            ],
        }

        _map_and_set(extraction_job, {
            "status": "complete",
            "rawtext": ocr_result.extracted_text,
            "extracteddata": extracted_payload,
            "validationresults": {"issues": [issue.model_dump() for issue in issues]},
            "ocrconfidence": ocr_result.overall_confidence,
            "completedat": datetime.utcnow(),
        })
    except Exception as exc:
        _map_and_set(extraction_job, {
            "status": "failed",
            "errormessage": str(exc),
            "completedat": datetime.utcnow(),
        })
        db.commit()
        db.refresh(extraction_job)
        raise

    db.commit()
    db.refresh(extraction_job)
    
    return UploadDraftResponse(
        id=_get_attr(extraction_job, "id"),
        user_id=_get_attr(extraction_job, "userid"),
        filename=_get_attr(extraction_job, "filename"),
        filetype=_get_attr(extraction_job, "filetype"),
        filesize=_get_attr(extraction_job, "filesizebytes"),
        status=_get_attr(extraction_job, "status"),
        upload_date=_get_attr(extraction_job, "upload_date", _get_attr(extraction_job, "createdat")),
        file_path=_get_attr(extraction_job, "file_path"),
        document_type=_get_attr(extraction_job, "documenttype", document_type),
        ocr_engine=ocr_result.engine,
        draft_row=draft_row,
        extraction_issues=issues,
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
            filesize=_get_attr(upload, "filesizebytes"),
            status=_get_attr(upload, "status"),
            upload_date=_get_attr(upload, "upload_date", _get_attr(upload, "createdat"))
        )
        for upload in uploads
    ]


@router.get("/{upload_id}", response_model=UploadResponse)
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
    
    return UploadResponse(
        id=_get_attr(upload, "id"),
        user_id=_get_attr(upload, "userid"),
        filename=_get_attr(upload, "filename"),
        filetype=_get_attr(upload, "filetype"),
        filesize=_get_attr(upload, "filesizebytes"),
        status=_get_attr(upload, "status"),
        upload_date=_get_attr(upload, "upload_date", _get_attr(upload, "createdat")),
        file_path=_get_attr(upload, "file_path")
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
    
    if not upload or not upload.file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    if not os.path.exists(upload.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    
    return FileResponse(
        path=upload.file_path,
        filename=upload.filename,
        media_type=_download_mime_type(_get_attr(upload, "filetype"))
    )


@router.get("/{upload_id}/ocr", response_model=OCRExtractionResponse)
def extract_ocr_text(
    upload_id: str,
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Run local OCR or PDF text extraction for an uploaded document."""
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

    file_path = _get_attr(upload, "file_path")
    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded file path is missing"
        )

    try:
        result = ocr_service.extract(Path(file_path))
    except OCRServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc)
        ) from exc

    return OCRExtractionResponse(
        upload_id=_get_attr(upload, "id"),
        engine=result.engine,
        source_type=result.source_type,
        page_count=len(result.pages),
        extracted_text=result.extracted_text,
        overall_confidence=result.overall_confidence,
        pages=[
            OCRPageResult(
                page_number=page.page_number,
                text=page.text,
                line_count=page.line_count,
                confidence=page.confidence,
            )
            for page in result.pages
        ],
        processed_at=datetime.utcnow(),
    )


@router.post("/{upload_id}/confirm", response_model=InvoiceListRow, status_code=status.HTTP_201_CREATED)
def confirm_extracted_row(
    upload_id: str,
    payload: ConfirmDraftRequest,
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Persist the corrected OCR row into the invoices table and mark the upload confirmed."""
    user_id = get_current_user_id(authorization, db)

    extraction_job = db.query(ExtractionJob).filter(
        ExtractionJob.id == upload_id,
        ExtractionJob.userid == user_id
    ).first()

    if not extraction_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found"
        )

    draft = payload.draft_row
    invoice_id = str(uuid4())
    invoice = Invoice()
    _map_and_set(invoice, {
        "id": invoice_id,
        "userid": user_id,
        "documenttype": payload.document_type,
        "sourcetype": "ocr",
        "invoicenumber": draft.invoice_no,
        "invoicedate": draft.date_of_invoice,
        "partyname": draft.trade_name,
        "partytype": "buyer",
        "buyergstin": draft.gstin_uin,
        "placeofsupply": draft.place_of_supply,
        "supplytype": draft.invoice_type,
        "taxablevalue": _to_decimal(draft.taxable_value),
        "cgstamount": None,
        "sgstamount": None,
        "igstamount": None,
        "totalvalue": _to_decimal(draft.invoice_value),
        "rawtext": json.dumps(draft.model_dump()),
        "status": "confirmed",
        "confirmedat": datetime.utcnow(),
        "extractionjobid": upload_id,
        "overallconfidence": _get_attr(extraction_job, "ocrconfidence", None),
    })

    db.add(invoice)

    _map_and_set(extraction_job, {
        "status": "complete",
        "extracteddata": {
            "draft_row": draft.model_dump(),
            "extraction_issues": [issue.model_dump() for issue in payload.extraction_issues],
        },
        "validationresults": {"issues": [issue.model_dump() for issue in payload.extraction_issues]},
        "completedat": datetime.utcnow(),
    })

    db.commit()
    db.refresh(invoice)

    return InvoiceListRow(
        id=_get_attr(invoice, "id"),
        document_type=_get_attr(invoice, "documenttype", payload.document_type),
        source_type=_get_attr(invoice, "sourcetype", "ocr"),
        invoice_number=_get_attr(invoice, "invoicenumber", ""),
        invoice_date=str(_get_attr(invoice, "invoicedate", "")) if _get_attr(invoice, "invoicedate", None) else None,
        party_name=_get_attr(invoice, "partyname", None),
        party_gstin=_get_attr(invoice, "buyergstin", None) or _get_attr(invoice, "sellergstin", None),
        taxable_value=float(_get_attr(invoice, "taxablevalue", 0) or 0),
        cgst_amount=float(_get_attr(invoice, "cgstamount", 0) or 0),
        sgst_amount=float(_get_attr(invoice, "sgstamount", 0) or 0),
        igst_amount=float(_get_attr(invoice, "igstamount", 0) or 0),
        total_value=float(_get_attr(invoice, "totalvalue", 0) or 0),
        status=_get_attr(invoice, "status", "confirmed"),
        confirmed_at=_get_attr(invoice, "confirmedat", None),
    )
