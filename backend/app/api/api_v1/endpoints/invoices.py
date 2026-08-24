from datetime import date, datetime
from decimal import Decimal, InvalidOperation
import json
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from ....core.security import decode_access_token
from ....db.session import get_db
from ....models.reflected import DocumentGenerated, ExtractionJob, Invoice, InvoiceLineItem, UserSimple
from ....schemas.extraction import ConfirmDraftRequest, InvoiceListRow
from ....services.user_identity import resolve_primary_user_id

router = APIRouter()

GENERATED_DOCS_DIR = Path(__file__).resolve().parents[4] / "uploads" / "generated_documents"
GENERATED_DOCS_DIR.mkdir(parents=True, exist_ok=True)

FRONTEND_TO_DB_DOCUMENT_TYPE = {
    "sale_bill": "sales_invoice",
    "sales_invoice": "sales_invoice",
    "purchase_bill": "purchase_invoice",
    "purchase_invoice": "purchase_invoice",
    "credit_note": "credit_note",
    "debit_note": "debit_note",
    "export_invoice": "export_invoice",
}

DB_TO_FRONTEND_DOCUMENT_TYPE = {
    "sales_invoice": "sale_bill",
    "purchase_invoice": "purchase_bill",
    "credit_note": "credit_note",
    "debit_note": "debit_note",
    "export_invoice": "export_invoice",
}


def get_current_user_id(authorization: str | None = Header(None, alias="Authorization"), db: Session = Depends(get_db)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authorization header")

    payload = decode_access_token(authorization.replace("Bearer ", ""))
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    user = db.query(UserSimple).filter(UserSimple.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return resolve_primary_user_id(db, user_id)


def _map_and_set(obj, mapping: dict):
    cols = {c.name for c in obj.__table__.columns}

    def find(col_candidates):
        for name in col_candidates:
            if name in cols:
                return name
        stripped = {c.replace("_", ""): c for c in cols}
        for name in col_candidates:
            key = name.replace("_", "")
            if key in stripped:
                return stripped[key]
        return None

    for logical_name, value in mapping.items():
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
    return getattr(obj, logical_name, default)


def _to_decimal(value: str | None):
    if value in {None, ""}:
        return None
    cleaned = str(value).replace(",", "").strip()
    try:
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return None


def _to_date(value: str | None):
    if value in {None, ""}:
        return None

    normalized = str(value).strip()
    for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y/%m/%d", "%d-%b-%Y", "%d %b %Y"):
        try:
            return datetime.strptime(normalized, pattern).date()
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(normalized).date()
    except ValueError:
        return None



def _normalize_document_type_for_db(document_type: str | None) -> str:
    normalized = (document_type or "sale_bill").strip().lower()
    return FRONTEND_TO_DB_DOCUMENT_TYPE.get(normalized, "sales_invoice")


def _normalize_document_type_for_client(document_type: str | None) -> str:
    normalized = (document_type or "sale_bill").strip().lower()
    return DB_TO_FRONTEND_DOCUMENT_TYPE.get(normalized, normalized if normalized in FRONTEND_TO_DB_DOCUMENT_TYPE else "sale_bill")


def _invoice_row_from_invoice(invoice: Invoice) -> InvoiceListRow:
    return InvoiceListRow(
        id=_get_attr(invoice, "id"),
        document_type=_normalize_document_type_for_client(_get_attr(invoice, "documenttype", "sale_bill")),
        source_type=_get_attr(invoice, "sourcetype", "upload"),
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


def _create_generated_document_file(invoice_id: str, payload: ConfirmDraftRequest, upload_id: str | None, user_id: str) -> Path:
    generated_file = GENERATED_DOCS_DIR / f"{invoice_id}.pdf"
    generated_file.write_text(
        json.dumps(
            {
                "invoice_id": invoice_id,
                "upload_id": upload_id,
                "user_id": user_id,
                "document_type": payload.document_type,
                "draft_row": payload.draft_row.model_dump(),
                "extraction_issues": [issue.model_dump() for issue in payload.extraction_issues],
            },
            indent=2,
            default=str,
        ),
        encoding="utf-8",
    )
    return generated_file


def confirm_draft_to_invoice(
    payload: ConfirmDraftRequest,
    authorization: str | None,
    db: Session,
    upload_id: str | None = None,
) -> InvoiceListRow:
    user_id = get_current_user_id(authorization, db)

    extraction_job = None
    if upload_id:
        extraction_job = db.query(ExtractionJob).filter(
            ExtractionJob.id == upload_id,
            ExtractionJob.userid == user_id,
        ).first()

        if not extraction_job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")

        extracted_data = _get_attr(extraction_job, "extracteddata", None)
        if isinstance(extracted_data, dict):
            confirmed_invoice_id = extracted_data.get("confirmed_invoice_id")
            if confirmed_invoice_id:
                existing_invoice = db.query(Invoice).filter(
                    Invoice.id == confirmed_invoice_id,
                    Invoice.userid == user_id,
                ).first()
                if existing_invoice:
                    return _invoice_row_from_invoice(existing_invoice)

    draft = payload.draft_row
    invoice_id = str(uuid4())
    document_type_db = _normalize_document_type_for_db(payload.document_type)
    party_type = "vendor" if document_type_db == "purchase_invoice" else "customer"

    invoice_date = _to_date(draft.date_of_invoice)
    taxable_value = _to_decimal(draft.taxable_value)
    invoice_total = _to_decimal(draft.invoice_value) or taxable_value or Decimal("0")
    if taxable_value is None:
        taxable_value = invoice_total
    gst_rate = _to_decimal(draft.gst_percent)
    tax_amount = Decimal("0")
    if gst_rate is not None and taxable_value:
        tax_amount = (taxable_value * gst_rate / Decimal("100")).quantize(Decimal("0.01"))
    elif invoice_total and taxable_value and invoice_total > taxable_value:
        tax_amount = (invoice_total - taxable_value).quantize(Decimal("0.01"))
    cgst = (tax_amount / 2).quantize(Decimal("0.01")) if tax_amount else Decimal("0")
    sgst = cgst
    igst = Decimal("0")

    invoice = Invoice()
    _map_and_set(invoice, {
        "id": invoice_id,
        "userid": user_id,
        "documenttype": document_type_db,
        "sourcetype": "upload",
        "invoicenumber": draft.invoice_no,
        "invoicedate": invoice_date,
        "partyname": draft.trade_name,
        "partytype": party_type,
        "buyername": draft.trade_name,
        "buyergstin": draft.gstin_uin,
        "placeofsupply": draft.place_of_supply,
        "supplytype": None,
        "taxablevalue": taxable_value,
        "cgstamount": cgst,
        "sgstamount": sgst,
        "igstamount": igst,
        "totalvalue": invoice_total,
        "filingperiod": invoice_date.strftime("%Y-%m") if invoice_date else None,
        "rawtext": json.dumps(draft.model_dump()),
        "status": "confirmed",
        "confirmedat": datetime.utcnow(),
    })

    invoice_line_item = InvoiceLineItem()
    _map_and_set(invoice_line_item, {
        "id": str(uuid4()),
        "invoiceid": invoice_id,
        "linenumber": 1,
        "description": draft.trade_name or draft.invoice_no or f"Invoice {invoice_id}",
        "hsnsaccode": None,
        "quantity": Decimal("1"),
        "unit": "Nos",
        "unitprice": taxable_value,
        "taxablevalue": taxable_value,
        "gstrate": gst_rate,
        "cgstrate": (gst_rate / 2) if gst_rate else None,
        "sgstrate": (gst_rate / 2) if gst_rate else None,
        "igstrate": None,
        "cgstamount": cgst,
        "sgstamount": sgst,
        "igstamount": igst,
        "linetotal": invoice_total,
        "uqc": "NOS",
        "discountamount": Decimal("0"),
        "isnilrated": False,
        "isexempted": False,
    })

    generated_file = _create_generated_document_file(invoice_id, payload, upload_id, user_id)
    generated_document = DocumentGenerated()
    _map_and_set(generated_document, {
        "id": str(uuid4()),
        "userid": user_id,
        "documenttype": payload.document_type,
        "templateversion": "1.0",
        "inputdata": {
            "extraction_job_id": upload_id,
            "invoice_id": invoice_id,
            "document_type": payload.document_type,
            "draft_row": draft.model_dump(),
        },
        "filingperiod": invoice_date.strftime("%Y-%m") if invoice_date else None,
        "shipmentref": draft.invoice_no or None,
        "outputfilepath": str(generated_file),
        "outputformat": "pdf",
        "filesizebytes": generated_file.stat().st_size,
        "status": "complete",
        "invoiceid": invoice_id,
        "obligationid": None,
        "generationtriggeredby": "user",
        "expirydate": None,
        "isdeleted": False,
    })

    db.add(invoice)
    db.flush()
    db.add(invoice_line_item)
    db.add(generated_document)

    if extraction_job is not None:
        extracted_data = _get_attr(extraction_job, "extracteddata", None)
        if not isinstance(extracted_data, dict):
            extracted_data = {}
        extracted_data["confirmed_invoice_id"] = invoice_id
        extracted_data["generated_document_id"] = _get_attr(generated_document, "id")
        _map_and_set(extraction_job, {
            "status": "complete",
            "completedat": datetime.utcnow(),
            "documenttype": document_type_db,
            "extracteddata": extracted_data,
        })

    db.commit()
    db.refresh(invoice)

    return _invoice_row_from_invoice(invoice)


def _row_from_draft(extraction_job: ExtractionJob, draft_row: dict, default_document_type: str = "sale_bill") -> InvoiceListRow:
    document_type = _normalize_document_type_for_client(
        _get_attr(extraction_job, "documenttype", default_document_type) or default_document_type
    )
    return InvoiceListRow(
        id=_get_attr(extraction_job, "id"),
        document_type=document_type,
        source_type="ocr",
        invoice_number=str(draft_row.get("invoice_no", "")),
        invoice_date=str(draft_row.get("date_of_invoice", "")) or None,
        party_name=draft_row.get("trade_name", None),
        party_gstin=draft_row.get("gstin_uin", None),
        taxable_value=float(_to_decimal(draft_row.get("taxable_value")) or 0),
        cgst_amount=0.0,
        sgst_amount=0.0,
        igst_amount=0.0,
        total_value=float(_to_decimal(draft_row.get("invoice_value")) or 0),
        status="confirmed",
        confirmed_at=_get_attr(extraction_job, "completedat", _get_attr(extraction_job, "createdat")),
    )


@router.get("/", response_model=list[InvoiceListRow])
def list_invoices(
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(authorization, db)
    invoices = db.query(Invoice).filter(Invoice.userid == user_id).all()

    rows = [_invoice_row_from_invoice(invoice) for invoice in invoices]

    if rows:
        return rows

    extraction_jobs = db.query(ExtractionJob).filter(
        ExtractionJob.userid == user_id,
    ).all()

    for extraction_job in extraction_jobs:
        extracted_data = _get_attr(extraction_job, "extracteddata", None)
        if not isinstance(extracted_data, dict):
            continue

        draft_row = extracted_data.get("draft_row")
        if not isinstance(draft_row, dict):
            continue

        rows.append(
            _row_from_draft(
                extraction_job,
                draft_row,
                _get_attr(extraction_job, "documenttype", "sale_bill") or "sale_bill",
            )
        )

    return rows


@router.post("/confirm", response_model=InvoiceListRow, status_code=status.HTTP_201_CREATED)
def create_invoice_from_draft(
    payload: ConfirmDraftRequest,
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    return confirm_draft_to_invoice(payload, authorization, db)