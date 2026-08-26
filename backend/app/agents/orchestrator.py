"""Meta orchestrator — intent routing and response aggregation."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from .base import AgentResult
from .compliance_mapper import ComplianceMapperAgent
from .deadline_tracker import DeadlineTrackerAgent
from .document_generator import DocumentGeneratorAgent
from .ocr_agent import OCRAgent

logger = logging.getLogger(__name__)


class MetaOrchestrator:
    def __init__(self) -> None:
        self.ocr = OCRAgent()
        self.compliance = ComplianceMapperAgent()
        self.documents = DocumentGeneratorAgent()
        self.deadlines = DeadlineTrackerAgent()

    def classify_intent(self, text: str, explicit: str | None = None) -> str:
        if explicit:
            return explicit
        lower = (text or "").lower()
        if any(k in lower for k in ("ocr", "extract", "upload", "invoice image")):
            return "ocr"
        if any(k in lower for k in ("gstr-1", "gstr1", "export", "generate return", "csv", "xlsx")):
            return "document_generate"
        if any(k in lower for k in ("deadline", "due", "obligation", "calendar", "gstr-3b", "gstr3b")):
            return "deadlines"
        if any(k in lower for k in ("hsn", "compliance", "penalty", "rule", "gst rate")):
            return "compliance"
        return "chat"

    def run(
        self,
        *,
        db: Session,
        user_id: str,
        intent: str | None = None,
        message: str = "",
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = payload or {}
        resolved = self.classify_intent(message or payload.get("query", ""), intent)
        job_id = str(uuid4())
        self._create_job(db, job_id, user_id, resolved, {"message": message, **payload})

        context = {"db": db, "user_id": user_id}
        results: list[AgentResult] = []

        try:
            if resolved == "ocr":
                results.append(self.ocr.run(payload, context))
            elif resolved == "document_generate":
                results.append(self.documents.run(payload, context))
            elif resolved == "deadlines":
                results.append(self.deadlines.run(payload or {"action": "list"}, context))
            elif resolved == "compliance":
                results.append(self.compliance.run(payload or {"query": message}, context))
            else:
                # chat / default: gather deadlines + compliance guidance
                results.append(self.deadlines.run({"action": "list"}, context))
                results.append(self.compliance.run({"query": message or "GST overview"}, context))

            db.commit()
            response = {
                "job_id": job_id,
                "intent": resolved,
                "status": "complete",
                "agents_used": [r.agent for r in results],
                "results": [
                    {
                        "agent": r.agent,
                        "success": r.success,
                        "message": r.message,
                        "error": r.error,
                        "data": r.data,
                    }
                    for r in results
                ],
            }
            self._complete_job(db, job_id, response)
            return response
        except Exception as exc:
            logger.exception("Orchestrator failed")
            db.rollback()
            err = {
                "job_id": job_id,
                "intent": resolved,
                "status": "failed",
                "error": str(exc),
                "agents_used": [r.agent for r in results],
                "results": [],
            }
            try:
                self._complete_job(db, job_id, err)
            except Exception:
                pass
            return err

    def get_job(self, db: Session, job_id: str, user_id: str) -> dict[str, Any] | None:
        row = db.execute(
            text(
                """
                SELECT id::text, userid::text, intent, status, input, result, agents_used, created_at, completed_at
                FROM agent_jobs
                WHERE id = :id AND userid = :uid
                """
            ),
            {"id": job_id, "uid": user_id},
        ).mappings().first()
        if not row:
            return None
        return dict(row)

    def _create_job(self, db: Session, job_id: str, user_id: str, intent: str, payload: dict) -> None:
        db.execute(
            text(
                """
                INSERT INTO agent_jobs (id, userid, intent, status, input, created_at)
                VALUES (:id, :uid, :intent, 'running', CAST(:input AS jsonb), :created)
                """
            ),
            {
                "id": job_id,
                "uid": user_id,
                "intent": intent,
                "input": __import__("json").dumps(payload, default=str),
                "created": datetime.utcnow(),
            },
        )
        db.flush()

    def _complete_job(self, db: Session, job_id: str, result: dict) -> None:
        import json

        db.execute(
            text(
                """
                UPDATE agent_jobs
                SET status = :status,
                    result = CAST(:result AS jsonb),
                    agents_used = :agents,
                    completed_at = :completed
                WHERE id = :id
                """
            ),
            {
                "id": job_id,
                "status": result.get("status", "complete"),
                "result": json.dumps(result, default=str),
                "agents": result.get("agents_used") or [],
                "completed": datetime.utcnow(),
            },
        )
        db.commit()


orchestrator = MetaOrchestrator()
