"""Document generator — GSTR-1 CSV/XLSX and artifact metadata."""
from __future__ import annotations

import csv
import io
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from openpyxl import Workbook
from sqlalchemy.orm import Session

from ..models.reflected import DocumentGenerated, Invoice
from .base import AgentResult, BaseAgent

GSTR1_HEADERS = [
    "GSTIN/UIN",
    "Trade Name",
    "Invoice No",
    " Date of Invoice",
    "Invoice Value",
    "GST%",
    "Taxable Value",
    "CESS",
    "Place Of Supply",
    "RCM Applicable",
    "Invoice Type",
    "E-Commerce GSTIN",
]

GENERATED_DIR = Path(__file__).resolve().parents[3] / "uploads" / "generated_documents"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)


class DocumentGeneratorAgent(BaseAgent):
    name = "document_generator"

    def run(self, payload: dict[str, Any], context: dict[str, Any] | None = None) -> AgentResult:
        db: Session | None = (context or {}).get("db")
        user_id = (context or {}).get("user_id") or payload.get("user_id")
        filing_period = payload.get("filing_period") or datetime.utcnow().strftime("%Y-%m")
        output_format = (payload.get("format") or "csv").lower()
        rows = payload.get("rows")

        if rows is None and db is not None and user_id:
            rows = self._rows_from_invoices(db, user_id, filing_period, payload.get("document_types"))
        rows = rows or []

        if output_format == "xlsx":
            content, filename, fmt = self._build_xlsx(rows, filing_period)
        else:
            content, filename, fmt = self._build_csv(rows, filing_period)

        out_path = GENERATED_DIR / filename
        out_path.write_bytes(content)

        doc_id = None
        if db is not None and user_id:
            doc = DocumentGenerated()
            doc.id = uuid4()
            doc.userid = user_id
            doc.documenttype = "gstr1_export"
            doc.templateversion = "1.0"
            doc.inputdata = {"filing_period": filing_period, "row_count": len(rows)}
            doc.filingperiod = filing_period
            doc.outputfilepath = str(out_path)
            doc.outputformat = fmt
            doc.filesizebytes = len(content)
            doc.status = "complete"
            doc.generationtriggeredby = payload.get("triggered_by") or "ai_agent"
            db.add(doc)
            db.flush()
            doc_id = str(doc.id)

        return AgentResult(
            agent=self.name,
            success=True,
            message=f"Generated GSTR-1 {fmt} with {len(rows)} rows",
            data={
                "document_id": doc_id,
                "file_path": str(out_path),
                "filename": filename,
                "format": fmt,
                "filing_period": filing_period,
                "row_count": len(rows),
                "rows": rows,
            },
        )

    def preview_rows(
        self,
        db: Session,
        user_id: str,
        filing_period: str,
        document_types: list[str] | None = None,
    ) -> list[dict[str, str]]:
        return self._rows_from_invoices(db, user_id, filing_period, document_types)

    def _rows_from_invoices(
        self,
        db: Session,
        user_id: str,
        filing_period: str,
        document_types: list[str] | None,
    ) -> list[dict[str, str]]:
        q = db.query(Invoice).filter(Invoice.userid == user_id)
        types = document_types or ["sales_invoice", "export_invoice", "credit_note", "debit_note"]
        q = q.filter(Invoice.documenttype.in_(types))
        invoices = q.all()

        year, month = (filing_period.split("-") + ["", ""])[:2]
        filtered = []
        for inv in invoices:
            if self._invoice_in_period(inv, filing_period, year, month):
                filtered.append(inv)

        # Never download an empty portal template — include all sales if the period has none.
        if not filtered:
            filtered = list(invoices)

        return [self._invoice_to_gstr1_row(inv) for inv in filtered]

    @staticmethod
    def _invoice_in_period(inv: Invoice, filing_period: str, year: str, month: str) -> bool:
        period = getattr(inv, "filingperiod", None)
        if period and str(period)[:7] == filing_period:
            return True
        inv_date = getattr(inv, "invoicedate", None)
        if inv_date and year and month:
            return str(inv_date.year) == year and f"{inv_date.month:02d}" == month
        return False

    @staticmethod
    def _invoice_to_gstr1_row(inv: Invoice) -> dict[str, str]:
        import json

        taxable = getattr(inv, "taxablevalue", None)
        total = getattr(inv, "totalvalue", None)
        cgst = float(getattr(inv, "cgstamount", 0) or 0)
        sgst = float(getattr(inv, "sgstamount", 0) or 0)
        igst = float(getattr(inv, "igstamount", 0) or 0)
        draft: dict[str, Any] = {}
        raw = getattr(inv, "rawtext", None)
        if isinstance(raw, str):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    draft = parsed
            except json.JSONDecodeError:
                draft = {}

        gst_percent = ""
        if taxable and float(taxable) > 0 and (cgst + sgst + igst) > 0:
            gst_percent = str(round(((cgst + sgst + igst) / float(taxable)) * 100, 2))
        elif taxable and total and float(taxable) > 0 and float(total) > float(taxable):
            gst_percent = str(round(((float(total) - float(taxable)) / float(taxable)) * 100, 2))
        elif draft.get("gst_percent"):
            gst_percent = str(draft.get("gst_percent"))

        inv_date = getattr(inv, "invoicedate", None)
        date_str = inv_date.strftime("%d/%m/%Y") if inv_date else str(draft.get("date_of_invoice") or "")
        party_gstin = (
            getattr(inv, "buyergstin", None)
            or getattr(inv, "sellergstin", None)
            or draft.get("gstin_uin")
            or ""
        )
        party_name = (
            getattr(inv, "partyname", None)
            or getattr(inv, "buyername", None)
            or getattr(inv, "sellername", None)
            or draft.get("trade_name")
            or ""
        )
        rcm = "Yes" if getattr(inv, "reversecharge", False) else (draft.get("rcm_applicable") or "No")
        inv_type = draft.get("invoice_type") or ("Export" if getattr(inv, "isexport", False) else "Regular")
        pos = getattr(inv, "placeofsupply", None) or draft.get("place_of_supply") or ""

        return {
            "GSTIN/UIN": str(party_gstin or ""),
            "Trade Name": str(party_name or ""),
            "Invoice No": str(getattr(inv, "invoicenumber", None) or draft.get("invoice_no") or ""),
            " Date of Invoice": date_str,
            "Invoice Value": str(total if total is not None else draft.get("invoice_value") or ""),
            "GST%": gst_percent,
            "Taxable Value": str(taxable if taxable is not None else draft.get("taxable_value") or ""),
            "CESS": str(draft.get("cess") or "0"),
            "Place Of Supply": str(pos),
            "RCM Applicable": str(rcm),
            "Invoice Type": str(inv_type),
            "E-Commerce GSTIN": str(draft.get("e_commerce_gstin") or ""),
        }

    def _build_csv(self, rows: list[dict[str, str]], filing_period: str) -> tuple[bytes, str, str]:
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=GSTR1_HEADERS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({h: row.get(h, "") for h in GSTR1_HEADERS})
        data = buffer.getvalue().encode("utf-8-sig")
        filename = f"gstr1_{filing_period}_{uuid4().hex[:8]}.csv"
        return data, filename, "csv"

    def _build_xlsx(self, rows: list[dict[str, str]], filing_period: str) -> tuple[bytes, str, str]:
        wb = Workbook()
        ws = wb.active
        ws.title = "GSTR1"
        ws.append(GSTR1_HEADERS)
        for row in rows:
            ws.append([row.get(h, "") for h in GSTR1_HEADERS])
        buffer = io.BytesIO()
        wb.save(buffer)
        filename = f"gstr1_{filing_period}_{uuid4().hex[:8]}.xlsx"
        return buffer.getvalue(), filename, "xlsx"
