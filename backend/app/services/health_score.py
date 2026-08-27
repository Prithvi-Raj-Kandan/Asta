from typing import Any

def calculate_health_score(obligations: list[dict[str, Any]], invoice_count: int) -> dict[str, Any]:
    """
    Calculates a deterministic compliance health score (0-100) for the MSME.
    
    Rules:
    - Base score is 100.
    - Each overdue obligation subtracts 25 points.
    - Each obligation due within 7 days subtracts 10 points.
    - (Future) Deduct points if invoice volume is abnormally low.
    """
    open_items = [i for i in obligations if i.get("status") != "filed"]
    overdue = sum(1 for i in open_items if i.get("status") == "overdue")
    due_soon = sum(1 for i in open_items if i.get("status") == "due_soon")
    
    score = 100
    score -= overdue * 25
    score -= due_soon * 10
    
    score = max(0, min(100, score))
    
    if score >= 80:
        status_label = "Healthy"
    elif score >= 50:
        status_label = "Needs Attention"
    else:
        status_label = "Critical"
        
    return {
        "score": score,
        "overdue": overdue,
        "due_soon": due_soon,
        "open": len(open_items),
        "invoice_count": invoice_count,
        "status_label": status_label,
    }
