from __future__ import annotations

import re
from dataclasses import asdict
from typing import Any

from ..schemas.extraction import GSTR1DraftRow, ExtractionIssue


GSTIN_PATTERN = re.compile(r"\b(\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9])\b")
LOOSE_GSTIN_PATTERN = re.compile(r"\b(\d{2}[A-Z0-9]{13})\b")
DATE_PATTERN = re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b")
AMOUNT_PATTERN = re.compile(r"\b(?:rs\.?|inr|₹)?\s?([0-9][0-9,]*(?:\.\d{1,2})?)\b", re.IGNORECASE)
GST_RATE_PATTERN = re.compile(r"\b(?:gst|igst|cgst|sgst)\s*[@:]?\s*(\d{1,2}(?:\.\d{1,2})?)\s?%|\b(\d{1,2}(?:\.\d{1,2})?)\s?%\s*(?:gst|igst)?", re.IGNORECASE)

NOISE_HEADER_KEYWORDS = {
    "tax invoice", "cash bill", "credit note", "debit note", "gstin", "bill no",
    "invoice no", "original copy", "duplicate copy", "triplicate copy", "original",
    "duplicate", "triplicate", "copy", "tax", "invoice", "scan for payment"
}


class GSTR1ExtractionService:
    def build_draft(self, extracted_text: str, document_type: str) -> tuple[GSTR1DraftRow, list[ExtractionIssue]]:
        lines = [line.strip() for line in extracted_text.splitlines() if line.strip()]

        gstin = self._find_gstin(lines, document_type)
        trade_name = self._find_trade_name(lines)
        invoice_no = self._find_labeled_value(lines, ["invoice no", "invoice number", "bill no", "bill number", "inv no", "bill nr", "inv#", "invoice #"])
        invoice_date = self._find_date(lines)
        taxable_value = self._find_labeled_amount(lines, ["taxable value", "taxable amount", "subtotal", "sub total", "taxable"])
        invoice_value = self._find_labeled_amount(lines, ["grand total", "total amount", "invoice value", "gross amount", "total", "amount payable"])
        gst_percent = self._find_gst_percent(lines)
        cess = self._find_labeled_amount(lines, ["cess"])
        place_of_supply = self._find_labeled_value(lines, ["place of supply", "pos", "state"])
        rcm_applicable = self._find_rcm(lines)
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
    def _find_gstin(lines: list[str], document_type: str = "sale_bill") -> str | None:
        found: list[tuple[str, str]] = []
        for line in lines:
            upper = line.upper()
            match = GSTIN_PATTERN.search(upper) or LOOSE_GSTIN_PATTERN.search(upper)
            if match:
                found.append((match.group(1), line.lower()))
        if not found:
            return None
        buyer_labels = ("buyer", "bill to", "billed to", "customer", "recipient")
        seller_labels = ("seller", "supplier", "from", "sold by")
        for gstin, line in found:
            if any(label in line for label in buyer_labels):
                if "purchase" not in (document_type or "").lower():
                    return gstin
        for gstin, line in found:
            if any(label in line for label in seller_labels) and "purchase" in (document_type or "").lower():
                return gstin
        # Sales invoices: counterparty is usually the second GSTIN (buyer).
        if "purchase" not in (document_type or "").lower() and len(found) > 1:
            return found[1][0]
        return found[0][0]

    @staticmethod
    def _find_trade_name(lines: list[str]) -> str | None:
        for line in lines:
            normalized = line.strip()
            if len(normalized) < 4:
                continue
            lower = normalized.lower()
            if any(keyword in lower for keyword in NOISE_HEADER_KEYWORDS):
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
                        cleaned = after.lstrip(": -").strip()
                        if cleaned:
                            return cleaned[:80]
                    if index + 1 < len(lines):
                        next_line = lines[index + 1].strip()
                        if next_line and label not in next_line.lower():
                            cleaned = next_line.lstrip(": -").strip()
                            if cleaned:
                                return cleaned[:80]
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
                        # Clean and return
                        val = numbers[-1].replace(",", "").strip()
                        if val:
                            return val
                    if index + 1 < len(lines):
                        next_numbers = AMOUNT_PATTERN.findall(lines[index + 1])
                        if next_numbers:
                            val = next_numbers[-1].replace(",", "").strip()
                            if val:
                                return val
        return None

    @staticmethod
    def _find_gst_percent(lines: list[str]) -> str | None:
        for line in lines:
            match = GST_RATE_PATTERN.search(line)
            if match:
                return match.group(1) or match.group(2)
        for line in lines:
            match = re.search(r"\b(5|12|18|28)(?:\.0+)?\s?%\b", line)
            if match:
                return match.group(1)
        return None

    @staticmethod
    def _find_rcm(lines: list[str]) -> str:
        for line in lines:
            lower = line.lower()
            if "reverse charge" in lower or "rcm" in lower:
                if any(neg in lower for neg in [": n", ": no", "no", "false", ":0"]):
                    return "No"
                if any(pos in lower for pos in [": y", ": yes", "yes", "true", ":1"]):
                    return "Yes"
        return "No"

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
