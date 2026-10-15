"""Tools for the Chat LLM Agent."""
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from datetime import datetime

from ..models.reflected import GovtNews, Invoice, ComplianceObligation
from ..services.filing.sandbox_gsp import get_filing_provider
from ..agents.document_generator import DocumentGeneratorAgent

doc_agent = DocumentGeneratorAgent()


class ChatTools:
    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id

    def prepare_gstr1_filing(self, period: str) -> str:
        """
        Prepares the GSTR-1 payload for the given period so the user can review and file it.
        
        Args:
            period: The filing period in YYYY-MM format (e.g., '2026-08').
            
        Returns:
            Status message string indicating success or failure.
        """
        try:
            # Step 1: Generate the document (saves to DB and returns CSV)
            result = doc_agent.run(
                {"filing_period": period, "format": "csv", "triggered_by": "ai_agent"},
                {"db": self.db, "user_id": self.user_id}
            )
            if not result.success:
                return f"Failed to generate GSTR-1 payload: {result.error or result.message}"
                
            payload = result.data.get("rows")
            if not payload:
                return "Generated payload was empty. Cannot prepare GSTR-1."

            # We don't save or submit here. The frontend workflow handles it.
            return f"Successfully prepared GSTR-1 payload for {period}. Tell the user to click the Review & File button."
        except Exception as e:
            return f"Error occurred while preparing GSTR-1: {str(e)}"

    def get_recent_compliance_news(self, limit: int = 5) -> str:
        """
        Fetches the most recent compliance news updates from CBIC, GSTN, and DGFT.
        
        Args:
            limit: Number of news items to fetch (default 5).
            
        Returns:
            A formatted string of recent news updates.
        """
        news = self.db.query(GovtNews).order_by(GovtNews.published_at.desc()).limit(limit).all()
        if not news:
            return "No recent compliance news found."
        
        lines = []
        for n in news:
            date_str = n.published_at.strftime("%Y-%m-%d") if n.published_at else "Recent"
            lines.append(f"[{date_str}] {n.source} - {n.title}: {n.summary}")
        return "\n\n".join(lines)

    def get_financial_summary(self) -> str:
        """
        Retrieves sales, purchases, per-invoice amounts, the highest sale, and upcoming deadlines.

        Returns:
            A formatted string the model can use to answer totals or highest-sale questions.
        """
        invoices = self.db.query(Invoice).filter(Invoice.userid == self.user_id).all()
        sales_types = {"sales_invoice", "export_invoice", "sale_bill"}
        purchase_types = {"purchase_invoice", "purchase_bill"}
        sales = [i for i in invoices if (i.documenttype or "").lower() in sales_types]
        purchases = [i for i in invoices if (i.documenttype or "").lower() in purchase_types]

        total_sales = sum(float(i.totalvalue or 0) for i in sales)
        total_purchases = sum(float(i.totalvalue or 0) for i in purchases)
        ranked_sales = sorted(sales, key=lambda i: float(i.totalvalue or 0), reverse=True)

        lines = [
            f"Total sales: ₹{total_sales:,.2f} across {len(sales)} invoice(s).",
            f"Total purchases: ₹{total_purchases:,.2f} across {len(purchases)} invoice(s).",
        ]
        if ranked_sales:
            top = ranked_sales[0]
            lines.append(
                "Highest sale: invoice "
                f"{top.invoicenumber or '-'} to {top.partyname or 'unknown party'} "
                f"for ₹{float(top.totalvalue or 0):,.2f} dated {top.invoicedate or '-'}."
            )
            lines.append("Sales invoices:")
            for inv in ranked_sales[:8]:
                lines.append(
                    f"- {inv.invoicenumber or '-'} | {inv.invoicedate or '-'} | "
                    f"{inv.partyname or '-'} | ₹{float(inv.totalvalue or 0):,.2f}"
                )

        obligations = self.db.query(ComplianceObligation).filter(
            ComplianceObligation.userid == self.user_id,
            ComplianceObligation.status != "filed",
        ).all()
        lines.append(f"Open compliance obligations: {len(obligations)}")
        for obs in obligations[:3]:
            lines.append(f"- {obs.obligationtype} due {obs.duedate} ({obs.status})")

        return "\n".join(lines)

    def get_tools_list(self):
        """Returns the list of callable tools to pass to GenAI."""
        return [
            self.prepare_gstr1_filing,
            self.get_recent_compliance_news,
            self.get_financial_summary
        ]
