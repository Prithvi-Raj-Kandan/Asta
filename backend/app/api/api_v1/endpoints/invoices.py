from datetime import datetime
from decimal import Decimal, InvalidOperation
import json
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from ....core.security import decode_access_token
from ....db.session import get_db
from ....models.reflected import Invoice, UserSimple
from ....schemas.extraction import ConfirmDraftRequest, InvoiceListRow
from ....services.user_identity import resolve_primary_user_id

router = APIRouter()


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


@router.get("/", response_model=list[InvoiceListRow])
def list_invoices(
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(authorization, db)
    invoices = db.query(Invoice).filter(Invoice.userid == user_id).all()

    rows = []
    for invoice in invoices:
        rows.append(
            InvoiceListRow(
                id=_get_attr(invoice, "id"),
                document_type=_get_attr(invoice, "documenttype", "sale_bill"),
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
        )

    return rows


@router.post("/confirm", response_model=InvoiceListRow, status_code=status.HTTP_201_CREATED)
def create_invoice_from_draft(
    payload: ConfirmDraftRequest,
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(authorization, db)

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
    })

    db.add(invoice)
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