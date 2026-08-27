"""Deadline tracker agent — obligations and health score."""
from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta
from typing import Any
from uuid import uuid4

from sqlalchemy.orm import Session

from ..models.reflected import ComplianceObligation, Invoice, ObligationCatalog
from ..services.health_score import calculate_health_score
from .base import AgentResult, BaseAgent


class DeadlineTrackerAgent(BaseAgent):
    name = "deadline_tracker"

    def run(self, payload: dict[str, Any], context: dict[str, Any] | None = None) -> AgentResult:
        db: Session | None = (context or {}).get("db")
        user_id = (context or {}).get("user_id") or payload.get("user_id")
        if db is None or not user_id:
            return AgentResult(agent=self.name, success=False, error="db and user_id required")

        action = payload.get("action") or "list"
        if action == "seed":
            created = self.seed_monthly_obligations(db, user_id, payload.get("months_ahead", 3))
            db.commit()
            return AgentResult(
                agent=self.name,
                success=True,
                message=f"Seeded {created} obligations",
                data={"created": created},
            )

        self._refresh_statuses(db, user_id)
        obligations = (
            db.query(ComplianceObligation)
            .filter(ComplianceObligation.userid == user_id)
            .order_by(ComplianceObligation.duedate.asc())
            .all()
        )
        items = [self._serialize(o) for o in obligations]
        health = self._health_score(items, db, user_id)
        alerts = [i for i in items if i["status"] in {"due_soon", "overdue"} and i["status"] != "filed"]

        # Embed catalog details into items
        catalog_cache = {}
        for row in items:
            ctype = row["obligation_type"]
            if ctype not in catalog_cache:
                cat_row = db.query(ObligationCatalog).filter(ObligationCatalog.obligation_type == ctype).first()
                if cat_row:
                    catalog_cache[ctype] = {
                        "due_rule": cat_row.due_rule,
                        "data_required": cat_row.data_required,
                        "portal_name": cat_row.portal_name,
                        "portal_url": cat_row.portal_url,
                        "guide_url": cat_row.guide_url,
                        "instructions": cat_row.instructions
                    }
                else:
                    catalog_cache[ctype] = None
            if catalog_cache[ctype]:
                row.update(catalog_cache[ctype])

        return AgentResult(
            agent=self.name,
            success=True,
            message="Deadlines loaded",
            data={"obligations": items, "alerts": alerts, "health_score": health},
        )

    def seed_monthly_obligations(self, db: Session, user_id: str, months_ahead: int = 3) -> int:
        today = date.today()
        created = 0
        year, month = today.year, today.month
        for offset in range(months_ahead + 1):
            m = month + offset
            y = year + (m - 1) // 12
            m = ((m - 1) % 12) + 1
            period_label = f"{y}-{m:02d}"
            # GSTR-1 due ~11th of next month
            due1_y, due1_m = (y, m + 1) if m < 12 else (y + 1, 1)
            due_gstr1 = date(due1_y, due1_m, 11)
            # GSTR-3B due ~20th of next month
            due_gstr3b = date(due1_y, due1_m, 20)
            
            # Export compliances (Mocked due dates for demonstration)
            due_lut = date(y, 3, 31)
            due_iec = date(y, 6, 30)

            for obligation_type, due, cat, freq in (
                ("GSTR-1", due_gstr1, "gst", "monthly"), 
                ("GSTR-3B", due_gstr3b, "gst", "monthly"),
                ("LUT", due_lut, "export", "annually"),
                ("IEC", due_iec, "export", "annually")
            ):
                exists = (
                    db.query(ComplianceObligation)
                    .filter(
                        ComplianceObligation.userid == user_id,
                        ComplianceObligation.obligationtype == obligation_type,
                        ComplianceObligation.periodlabel == period_label,
                    )
                    .first()
                )
                if exists:
                    continue
                row = ComplianceObligation()
                row.id = uuid4()
                row.userid = user_id
                row.obligationtype = obligation_type
                row.category = cat
                row.frequency = freq
                row.periodlabel = period_label
                row.duedate = due
                row.status = self._status_for_due(due)
                row.datacomplete = False
                db.add(row)
                created += 1
        return created

    def _refresh_statuses(self, db: Session, user_id: str) -> None:
        today = date.today()
        obligations = db.query(ComplianceObligation).filter(ComplianceObligation.userid == user_id).all()
        for o in obligations:
            if o.status == "filed":
                continue
            o.status = self._status_for_due(o.duedate)
            if (o.duedate - today).days <= 7:
                o.alertsent7d = True
            if (o.duedate - today).days <= 1:
                o.alertsent1d = True
        db.commit()

    @staticmethod
    def _status_for_due(due: date) -> str:
        today = date.today()
        if due < today:
            return "overdue"
        if due <= today + timedelta(days=7):
            return "due_soon"
        return "upcoming"

    def _health_score(self, items: list[dict[str, Any]], db: Session, user_id: str) -> dict[str, Any]:
        invoice_count = db.query(Invoice).filter(Invoice.userid == user_id).count()
        return calculate_health_score(items, invoice_count)

    @staticmethod
    def _serialize(o: ComplianceObligation) -> dict[str, Any]:
        due = o.duedate
        days_left = (due - date.today()).days if due else None
        return {
            "id": str(o.id),
            "obligation_type": o.obligationtype,
            "category": o.category,
            "frequency": o.frequency,
            "period_label": o.periodlabel,
            "due_date": due.isoformat() if due else None,
            "days_left": days_left,
            "status": o.status,
            "data_complete": o.datacomplete,
            "filed_on": o.filedon.isoformat() if o.filedon else None,
            "filing_reference": o.filingreference,
            "alert_sent_7d": o.alertsent7d,
            "alert_sent_1d": o.alertsent1d,
            "notes": o.notes,
        }
