"""Analytics from live invoice and obligation data."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ....agents.deadline_tracker import DeadlineTrackerAgent
from ....api.deps import get_current_user_id
from ....db.session import get_db
from ....models.reflected import ComplianceObligation, Invoice

router = APIRouter()
tracker = DeadlineTrackerAgent()


@router.get("/summary")
def analytics_summary(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    invoices = db.query(Invoice).filter(Invoice.userid == user_id).all()
    sales = [i for i in invoices if i.documenttype in {"sales_invoice", "export_invoice"}]
    purchases = [i for i in invoices if i.documenttype == "purchase_invoice"]

    def sum_total(rows):
        return float(sum((r.totalvalue or 0) for r in rows))

    def sum_tax(rows):
        return float(
            sum((r.cgstamount or 0) + (r.sgstamount or 0) + (r.igstamount or 0) for r in rows)
        )

    # Auto-seed if empty so dashboard is useful
    obl_count = db.query(ComplianceObligation).filter(ComplianceObligation.userid == user_id).count()
    if obl_count == 0:
        tracker.seed_monthly_obligations(db, user_id, 3)
        db.commit()

    deadline_data = tracker.run({"action": "list"}, {"db": db, "user_id": user_id}).data

    def invoice_tax(row):
        stored = float((row.cgstamount or 0) + (row.sgstamount or 0) + (row.igstamount or 0))
        if stored > 0:
            return stored
        total = float(row.totalvalue or 0)
        taxable = float(row.taxablevalue or 0)
        if total > taxable > 0:
            return total - taxable
        return 0.0

    by_month: dict[str, float] = {}
    for inv in sales:
        if inv.invoicedate:
            key = inv.invoicedate.strftime("%Y-%m")
        elif inv.filingperiod:
            key = str(inv.filingperiod)[:7]
        else:
            key = date.today().strftime("%Y-%m")
        by_month[key] = by_month.get(key, 0.0) + float(inv.totalvalue or 0)

    today = date.today()
    padded = []
    for offset in range(5, -1, -1):
        month_index = today.month - offset
        year = today.year
        while month_index <= 0:
            month_index += 12
            year -= 1
        key = f"{year}-{month_index:02d}"
        padded.append({"month": key, "total": round(by_month.get(key, 0.0), 2)})

    return {
        "sales_count": len(sales),
        "purchase_count": len(purchases),
        "sales_total": sum_total(sales),
        "purchase_total": sum_total(purchases),
        "tax_outward": float(sum(invoice_tax(r) for r in sales)),
        "tax_inward": float(sum(invoice_tax(r) for r in purchases)),
        "sales_by_month": padded,
        "health_score": deadline_data.get("health_score"),
        "obligations_open": len([o for o in deadline_data.get("obligations", []) if o.get("status") != "filed"]),
        "alerts": deadline_data.get("alerts") or [],
        "as_of": date.today().isoformat(),
    }
