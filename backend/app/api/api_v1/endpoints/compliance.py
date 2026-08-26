"""Compliance obligations and in-app notifications."""
from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ....agents.deadline_tracker import DeadlineTrackerAgent
from ....api.deps import get_current_user_id
from ....db.session import get_db
from ....models.reflected import ComplianceObligation

router = APIRouter()
tracker = DeadlineTrackerAgent()


class MarkFiledRequest(BaseModel):
    filing_reference: str | None = None
    filed_on: date | None = None


class SeedRequest(BaseModel):
    months_ahead: int = Field(default=3, ge=0, le=12)


@router.get("/obligations")
def list_obligations(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    result = tracker.run({"action": "list"}, {"db": db, "user_id": user_id})
    return result.data


@router.post("/obligations/seed")
def seed_obligations(
    body: SeedRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = tracker.run(
        {"action": "seed", "months_ahead": body.months_ahead},
        {"db": db, "user_id": user_id},
    )
    return result.data


@router.post("/obligations/{obligation_id}/filed")
def mark_filed(
    obligation_id: str,
    body: MarkFiledRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    row = (
        db.query(ComplianceObligation)
        .filter(ComplianceObligation.id == obligation_id, ComplianceObligation.userid == user_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found")
    row.status = "filed"
    row.filedon = body.filed_on or date.today()
    row.filingreference = body.filing_reference
    row.datacomplete = True
    db.commit()
    return tracker._serialize(row)


@router.get("/notifications")
def list_notifications(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    result = tracker.run({"action": "list"}, {"db": db, "user_id": user_id})
    alerts = result.data.get("alerts") or []
    notifications = []
    for item in alerts:
        days = item.get("days_left")
        severity = "critical" if item.get("status") == "overdue" else "warning"
        notifications.append(
            {
                "id": item["id"],
                "title": f"{item['obligation_type']} {item.get('period_label') or ''}".strip(),
                "message": f"Due {item.get('due_date')} ({days} days)" if days is not None else "Deadline alert",
                "severity": severity,
                "status": item.get("status"),
                "alert_sent_7d": item.get("alert_sent_7d"),
                "alert_sent_1d": item.get("alert_sent_1d"),
            }
        )
    return {
        "notifications": notifications,
        "health_score": result.data.get("health_score"),
        "count": len(notifications),
    }
