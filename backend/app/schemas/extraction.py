from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class GSTR1DraftRow(BaseModel):
    gstin_uin: str = Field(default="")
    trade_name: str = Field(default="")
    invoice_no: str = Field(default="")
    date_of_invoice: str = Field(default="")
    invoice_value: str = Field(default="")
    gst_percent: str = Field(default="")
    taxable_value: str = Field(default="")
    cess: str = Field(default="0")
    place_of_supply: str = Field(default="")
    rcm_applicable: str = Field(default="No")
    invoice_type: str = Field(default="Regular")
    e_commerce_gstin: str = Field(default="")


class ExtractionIssue(BaseModel):
    field: str
    message: str
    severity: str = "warning"


class UploadDraftResponse(BaseModel):
    id: UUID
    user_id: UUID
    filename: str
    filetype: str
    filesize: int
    status: str
    upload_date: datetime
    file_path: Optional[str] = None
    document_type: str = "sale_bill"
    ocr_engine: str
    draft_row: GSTR1DraftRow
    extraction_issues: list[ExtractionIssue] = []

    class Config:
        from_attributes = True


class ConfirmDraftRequest(BaseModel):
    document_type: str = "sale_bill"
    draft_row: GSTR1DraftRow
    extraction_issues: list[ExtractionIssue] = []


class InvoiceListRow(BaseModel):
    id: UUID
    document_type: str
    source_type: str
    invoice_number: str
    invoice_date: Optional[str] = None
    party_name: Optional[str] = None
    party_gstin: Optional[str] = None
    taxable_value: Optional[float] = None
    cgst_amount: Optional[float] = None
    sgst_amount: Optional[float] = None
    igst_amount: Optional[float] = None
    total_value: Optional[float] = None
    status: str
    confirmed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvoiceUpdateRequest(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    party_name: Optional[str] = None
    party_gstin: Optional[str] = None
    taxable_value: Optional[float] = None
    total_value: Optional[float] = None
    document_type: Optional[str] = None
    status: Optional[str] = None