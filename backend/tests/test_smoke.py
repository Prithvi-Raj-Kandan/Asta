"""Smoke tests for agent routing and GSTR-1 CSV generation (no live HTTP required)."""
from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.agents.document_generator import DocumentGeneratorAgent, GSTR1_HEADERS
from app.agents.orchestrator import MetaOrchestrator
from app.agents.ocr_agent import OCRAgent
from app.services.extraction import GSTR1ExtractionService


def test_intent_routing():
    orch = MetaOrchestrator()
    assert orch.classify_intent("export my gstr-1 csv") == "document_generate"
    assert orch.classify_intent("what are my deadlines") == "deadlines"
    assert orch.classify_intent("hsn for consulting") == "compliance"
    assert orch.classify_intent("extract this invoice", "ocr") == "ocr"


def test_regex_extraction_smoke():
    text = """
    TAX INVOICE
    Acme Traders
    GSTIN 29AAAAA0000A1Z5
    Invoice No: INV-1001
    Date: 12/03/2026
    Taxable Value: 1000
    Grand Total: 1180
    GST 18%
    Place of Supply: Karnataka
    """
    draft, issues = GSTR1ExtractionService().build_draft(text, "sale_bill")
    assert draft.invoice_no
    assert draft.gstin_uin.startswith("29")
    assert isinstance(issues, list)


def test_gstr1_csv_headers():
    agent = DocumentGeneratorAgent()
    content, filename, fmt = agent._build_csv(
        [
            {
                "GSTIN/UIN": "29AAAAA0000A1Z5",
                "Trade Name": "Acme",
                "Invoice No": "INV-1",
                " Date of Invoice": "01/01/2026",
                "Invoice Value": "1180",
                "GST%": "18",
                "Taxable Value": "1000",
                "CESS": "0",
                "Place Of Supply": "29-Karnataka",
                "RCM Applicable": "No",
                "Invoice Type": "Regular",
                "E-Commerce GSTIN": "",
            }
        ],
        "2026-01",
    )
    assert fmt == "csv"
    assert filename.endswith(".csv")
    header_line = content.decode("utf-8-sig").splitlines()[0]
    for h in GSTR1_HEADERS:
        assert h in header_line.split(",") or h.strip() in header_line


def test_ocr_agent_from_text():
    agent = OCRAgent()
    result = agent.run(
        {
            "raw_text": "Invoice No: X-9\nGSTIN 27AAAAA0000A1Z5\nTotal 500",
            "document_type": "sale_bill",
        }
    )
    assert result.success
    assert "draft_row" in result.data


if __name__ == "__main__":
    test_intent_routing()
    test_regex_extraction_smoke()
    test_gstr1_csv_headers()
    test_ocr_agent_from_text()
    print("All smoke tests passed")
