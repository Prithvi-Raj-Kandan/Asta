"""OCR + local field extraction agent (no remote image APIs)."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from ..schemas.extraction import ExtractionIssue, GSTR1DraftRow
from ..services.extraction import GSTR1ExtractionService
from ..services.ocr import LocalOCRService
from .base import AgentResult, BaseAgent

logger = logging.getLogger(__name__)


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

        return AgentResult(
            agent=self.name,
            success=True,
            message="Extracted via tesseract+regex",
            data={
                "raw_text": raw_text,
                "ocr_engine": ocr_engine,
                "ocr_confidence": overall_confidence,
                "draft_row": draft.model_dump(),
                "extraction_issues": [i.model_dump() for i in issues],
                "method": "tesseract+regex",
            },
        )
