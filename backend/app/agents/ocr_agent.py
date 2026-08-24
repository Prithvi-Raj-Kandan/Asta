"""OCR + field extraction agent."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from ..schemas.extraction import ExtractionIssue, GSTR1DraftRow
from ..services.extraction import GSTR1ExtractionService
from ..services.llm import llm_service
from ..services.ocr import LocalOCRService
from .base import AgentResult, BaseAgent

logger = logging.getLogger(__name__)

EXTRACT_SYSTEM = """You extract Indian GST invoice fields into JSON.
Return keys exactly:
gstin_uin, trade_name, invoice_no, date_of_invoice, invoice_value, gst_percent,
taxable_value, cess, place_of_supply, rcm_applicable, invoice_type, e_commerce_gstin.
Rules:
- gstin_uin is the COUNTERPARTY GSTIN (buyer on a sales invoice, seller on a purchase bill).
- trade_name is that counterparty's legal/trade name, not document titles like TAX INVOICE.
- Dates as DD/MM/YYYY. Numbers without currency symbols or commas.
- rcm_applicable Yes/No. invoice_type Regular/SEZ/Export/Credit Note/Debit Note.
- Use empty string when unknown. Do not invent GSTINs or totals."""


class OCRAgent(BaseAgent):
    name = "ocr"

    def run(self, payload: dict[str, Any], context: dict[str, Any] | None = None) -> AgentResult:
        file_path = payload.get("file_path")
        document_type = payload.get("document_type", "sale_bill")
        raw_text = payload.get("raw_text")

        ocr_engine = "provided"
        overall_confidence = None

        if not raw_text and file_path:
            ocr = LocalOCRService()
            try:
                result = ocr.extract(Path(file_path))
                raw_text = result.extracted_text
                overall_confidence = result.overall_confidence
                ocr_engine = result.engine
            except Exception as exc:
                logger.exception("OCR failed")
                return AgentResult(
                    agent=self.name,
                    success=False,
                    error=str(exc),
                    message="OCR extraction failed",
                )

        raw_text = raw_text or ""
        regex_service = GSTR1ExtractionService()
        draft, issues = regex_service.build_draft(raw_text, document_type)
        method = "regex"
        llm_data: dict[str, Any] = {}

        if llm_service.available and file_path:
            suffix = Path(file_path).suffix.lower()
            if suffix in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}:
                mime = "image/png" if suffix == ".png" else "image/jpeg"
                try:
                    llm_data = llm_service.complete_from_image(
                        EXTRACT_SYSTEM,
                        f"Document type: {document_type}. Read the invoice image and extract GST fields.",
                        Path(file_path).read_bytes(),
                        mime,
                    )
                    method = "gemini-vision"
                except Exception as exc:
                    logger.warning("Gemini vision extraction failed: %s", exc)

        if llm_service.available and raw_text.strip() and not llm_data:
            try:
                llm_data = llm_service.complete_json(
                    EXTRACT_SYSTEM,
                    f"Document type: {document_type}\n\nOCR text:\n{raw_text[:12000]}",
                )
                method = "llm+regex"
            except Exception as exc:
                logger.warning("LLM extraction failed, using regex: %s", exc)

        if llm_data:
            merged = draft.model_dump()
            for key in merged:
                value = llm_data.get(key)
                if value not in (None, ""):
                    merged[key] = str(value).strip()
            draft = GSTR1DraftRow(**merged)
            issues = []
            for field_name, value in draft.model_dump().items():
                if value in {"", None}:
                    issues.append(
                        ExtractionIssue(
                            field=field_name,
                            message=f"{field_name.replace('_', ' ').title()} was not confidently extracted",
                        )
                    )

        return AgentResult(
            agent=self.name,
            success=True,
            message=f"Extracted via {method}",
            data={
                "raw_text": raw_text,
                "ocr_engine": ocr_engine,
                "ocr_confidence": overall_confidence,
                "draft_row": draft.model_dump(),
                "extraction_issues": [i.model_dump() for i in issues],
                "method": method,
            },
        )
