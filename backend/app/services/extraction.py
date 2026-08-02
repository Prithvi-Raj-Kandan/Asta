from __future__ import annotations

import re
from dataclasses import asdict
from typing import Any

from ..schemas.extraction import GSTR1DraftRow, ExtractionIssue


GSTIN_PATTERN = re.compile(r"\b\d{2}[A-Z0-9]{13}\b")
DATE_PATTERN = re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b")
AMOUNT_PATTERN = re.compile(r"\b(?:rs\.?|inr)?\s?([0-9][0-9,]*(?:\.\d{1,2})?)\b", re.IGNORECASE)


class GSTR1ExtractionService:
    def build_draft(self, extracted_text: str, document_type: str) -> tuple[GSTR1DraftRow, list[ExtractionIssue]]:
        lines = [line.strip() for line in extracted_text.splitlines() if line.strip()]
        upper_lines = [line.upper() for line in lines]

        gstin = self._find_gstin(lines)
        trade_name = self._find_trade_name(lines)
        invoice_no = self._find_labeled_value(lines, ["invoice no", "invoice number", "bill no", "bill number", "inv no"])
        invoice_date = self._find_date(lines)
        taxable_value = self._find_labeled_amount(lines, ["taxable value", "taxable amount", "taxable"])
        invoice_value = self._find_labeled_amount(lines, ["invoice value", "total amount", "gross amount", "amount"])
        gst_percent = self._find_gst_percent(lines)
        cess = self._find_labeled_amount(lines, ["cess"])
        place_of_supply = self._find_labeled_value(lines, ["place of supply", "pos"])
        rcm_applicable = "Yes" if any("reverse charge" in line.lower() or "rcm" in line.lower() for line in lines) else "No"
        e_commerce_gstin = self._find_labeled_value(lines, ["e-commerce gstin", "ecommerce gstin", "e comm gstin", "e-commerce"])

        invoice_type = self._infer_invoice_type(document_type, gstin, lines)

        draft = GSTR1DraftRow(
            gstin_uin=gstin or "",
            trade_name=trade_name or "",
            invoice_no=invoice_no or "",
            date_of_invoice=invoice_date or "",
            invoice_value=invoice_value or taxable_value or "",
            gst_percent=gst_percent or "",
            taxable_value=taxable_value or "",
            cess=cess or "0",
            place_of_supply=place_of_supply or "",
            rcm_applicable=rcm_applicable,
            invoice_type=invoice_type,
            e_commerce_gstin=e_commerce_gstin or "",
        )

        issues: list[ExtractionIssue] = []
        for field_name, value in draft.model_dump().items():
            if value in {"", None}:
                issues.append(ExtractionIssue(field=field_name, message=f"{field_name.replace('_', ' ').title()} was not confidently extracted"))

        return draft, issues

    def draft_to_dict(self, draft: GSTR1DraftRow) -> dict[str, Any]:
        return draft.model_dump()

    @staticmethod
    def _find_gstin(lines: list[str]) -> str | None:
        for line in lines:
            match = GSTIN_PATTERN.search(line.upper())
            if match:
                return match.group(0)
        return None

    @staticmethod
    def _find_trade_name(lines: list[str]) -> str | None:
        for line in lines:
            normalized = line.strip()
            if len(normalized) < 4:
                continue
            if any(keyword in normalized.lower() for keyword in ["tax invoice", "cash bill", "credit note", "debit note", "gstin", "bill no", "invoice no"]):
                continue
            if sum(char.isalpha() for char in normalized) >= max(4, len(normalized) // 3):
                return normalized[:80]
        return None

    @staticmethod
    def _find_labeled_value(lines: list[str], labels: list[str]) -> str | None:
        lowered_labels = [label.lower() for label in labels]
        for index, line in enumerate(lines):
            lower = line.lower()
            for label in lowered_labels:
                if label in lower:
                    after = line.split(":", 1)[1].strip() if ":" in line else ""
                    if after:
                        return after[:80]
                    if index + 1 < len(lines):
                        next_line = lines[index + 1].strip()
                        if next_line and label not in next_line.lower():
                            return next_line[:80]
        return None

    @staticmethod
    def _find_date(lines: list[str]) -> str | None:
        for line in lines:
            match = DATE_PATTERN.search(line)
            if match:
                return match.group(1)
        return None

    @staticmethod
    def _find_labeled_amount(lines: list[str], labels: list[str]) -> str | None:
        lowered_labels = [label.lower() for label in labels]
        for index, line in enumerate(lines):
            lower = line.lower()
            for label in lowered_labels:
                if label in lower:
                    numbers = AMOUNT_PATTERN.findall(line)
                    if numbers:
                        return numbers[-1]
                    if index + 1 < len(lines):
                        next_numbers = AMOUNT_PATTERN.findall(lines[index + 1])
                        if next_numbers:
                            return next_numbers[-1]
        return None

    @staticmethod
    def _find_gst_percent(lines: list[str]) -> str | None:
        for line in lines:
            match = re.search(r"\b(\d{1,2}(?:\.\d{1,2})?)\s?%\b", line)
            if match:
                return match.group(1)
        return None

    @staticmethod
    def _infer_invoice_type(document_type: str, gstin: str | None, lines: list[str]) -> str:
        normalized = (document_type or "").lower()
        if "credit" in normalized:
            return "Credit Note"
        if "debit" in normalized:
            return "Debit Note"
        if "purchase" in normalized:
            return "Purchase"
        if "bank" in normalized:
            return "Bank Statement"
        if "receipt" in normalized:
            return "Receipt"
        if gstin:
            return "B2B"
        return "B2C"