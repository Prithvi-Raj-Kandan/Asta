"""Compliance mapper — rules, HSN, filing readiness."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from ..services.llm import llm_service
from .base import AgentResult, BaseAgent

KNOWLEDGE_DIR = Path(__file__).resolve().parents[1] / "knowledge"


class ComplianceMapperAgent(BaseAgent):
    name = "compliance_mapper"

    def run(self, payload: dict[str, Any], context: dict[str, Any] | None = None) -> AgentResult:
        db: Session | None = (context or {}).get("db")
        query = (payload.get("query") or payload.get("topic") or "GST filing readiness").strip()
        invoices = payload.get("invoices") or []

        rules = self._load_rules()
        hsn_hits: list[dict[str, Any]] = []
        if db is not None:
            hsn_hits = self._lookup_hsn(db, query)

        readiness = {
            "invoice_count": len(invoices),
            "missing_gstin": sum(1 for inv in invoices if not inv.get("party_gstin")),
            "missing_totals": sum(1 for inv in invoices if inv.get("total_value") in (None, "", 0)),
            "ready_for_gstr1": False,
        }
        readiness["ready_for_gstr1"] = (
            readiness["invoice_count"] > 0
            and readiness["missing_gstin"] == 0
            and readiness["missing_totals"] == 0
        )

        guidance = ""
        if llm_service.available:
            try:
                guidance = llm_service.complete(
                    "You are an India GST compliance advisor. Be concise and practical.",
                    f"Question: {query}\n\nRules excerpt:\n{rules[:6000]}\n\nReadiness: {readiness}",
                    max_tokens=800,
                )
            except Exception as exc:
                guidance = f"Rule-based summary only (LLM unavailable: {exc})"
        else:
            guidance = (
                "GSTR-1 is typically due by the 11th of the following month (check current GST calendar). "
                f"Invoices in scope: {readiness['invoice_count']}. "
                f"Ready for GSTR-1 draft: {readiness['ready_for_gstr1']}."
            )

        return AgentResult(
            agent=self.name,
            success=True,
            message="Compliance mapping complete",
            data={
                "query": query,
                "guidance": guidance,
                "readiness": readiness,
                "hsn_hits": hsn_hits,
                "rules_loaded": bool(rules),
            },
        )

    @staticmethod
    def _load_rules() -> str:
        parts: list[str] = []
        if KNOWLEDGE_DIR.exists():
            for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
                parts.append(f"# {path.stem}\n{path.read_text(encoding='utf-8')}")
        return "\n\n".join(parts)

    @staticmethod
    def _lookup_hsn(db: Session, query: str) -> list[dict[str, Any]]:
        term = f"%{query[:40]}%"
        rows = db.execute(
            text(
                """
                SELECT hsncode, description, gstrate, category
                FROM hsn_master
                WHERE description ILIKE :term OR hsncode ILIKE :term
                LIMIT 10
                """
            ),
            {"term": term},
        ).mappings().all()
        return [dict(r) for r in rows]
