"""Chat + RAG endpoints."""
from __future__ import annotations

import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from ....agents.orchestrator import orchestrator
from ....api.deps import get_current_user_id
from ....db.session import get_db
from ....models.reflected import ChatHistory, Invoice
from ....services.embeddings import embedding_service
from ....services.llm import llm_service
from ....services.rag import ensure_knowledge_indexed, retrieve_chunks

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    intent: str
    agents_used: list[str] = Field(default_factory=list)
    citations: list[dict] = Field(default_factory=list)


@router.post("/", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    session_id = body.session_id or str(uuid4())
    ensure_knowledge_indexed(db)

    intent = orchestrator.classify_intent(body.message)
    orch = orchestrator.run(
        db=db,
        user_id=user_id,
        intent=intent if intent != "chat" else "deadlines",
        message=body.message,
        payload={"query": body.message, "action": "list"},
    )

    citations = retrieve_chunks(db, body.message, k=4) if embedding_service.available else []
    context_bits = [c["content"] for c in citations]

    invoices = db.query(Invoice).filter(Invoice.userid == user_id).limit(20).all()
    inv_summary = [
        {
            "number": i.invoicenumber,
            "date": str(i.invoicedate) if i.invoicedate else None,
            "party": i.partyname,
            "total": float(i.totalvalue) if i.totalvalue is not None else None,
            "type": i.documenttype,
        }
        for i in invoices
    ]

    agent_context = orch.get("results") or []

    if llm_service.available:
        try:
            reply = llm_service.complete(
                "You are Asta, an India GST compliance co-pilot. Answer in clear prose. "
                "Never dump raw Python dicts or JSON. Summarize numbers as rupees and dates. "
                "If unsure, say so. Do not invent portal filing confirmations.",
                (
                    f"User question: {body.message}\n\n"
                    f"Knowledge:\n{chr(10).join(context_bits)}\n\n"
                    f"Invoices sample: {inv_summary}\n\n"
                    f"Agent results: {agent_context}"
                ),
                max_tokens=1000,
            )
        except Exception as exc:
            logger.warning("Chat LLM failed: %s", exc)
            reply = _fallback_reply(body.message, agent_context, citations)
    else:
        reply = _fallback_reply(body.message, agent_context, citations)

    _persist_message(db, user_id, session_id, "user", body.message, intent, None, None)
    _persist_message(
        db,
        user_id,
        session_id,
        "assistant",
        reply,
        intent,
        ",".join(orch.get("agents_used") or []),
        orch.get("agents_used") or [],
    )
    db.commit()

    return ChatResponse(
        session_id=session_id,
        reply=reply,
        intent=intent,
        agents_used=orch.get("agents_used") or [],
        citations=[{"source": c.get("source"), "excerpt": c.get("content", "")[:240]} for c in citations],
    )


@router.post("/index-knowledge")
def index_knowledge(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    if not embedding_service.available:
        raise HTTPException(status_code=400, detail="GEMINI_API_KEY not configured")
    count = ensure_knowledge_indexed(db, force=True)
    return {"indexed": count}


def _persist_message(db, user_id, session_id, role, content, intent, agent_used, tools):
    row = ChatHistory()
    row.id = uuid4()
    row.userid = user_id
    row.sessionid = session_id
    row.role = role
    row.content = content
    row.intent = intent
    row.agentused = agent_used
    row.toolscalled = tools
    db.add(row)


def _fallback_reply(message: str, agent_context, citations) -> str:
    parts = [f"I received: {message}"]
    if citations:
        parts.append("From knowledge base:")
        for c in citations[:2]:
            parts.append(f"- ({c.get('source')}) {c.get('content', '')[:200]}")
    if agent_context:
        for r in agent_context:
            if r.get("data", {}).get("guidance"):
                parts.append(r["data"]["guidance"])
            if r.get("data", {}).get("health_score"):
                parts.append(f"Compliance health: {r['data']['health_score']}")
            if r.get("data", {}).get("obligations"):
                obl = r["data"]["obligations"][:5]
                parts.append("Upcoming obligations:")
                for o in obl:
                    parts.append(f"- {o.get('obligation_type')} due {o.get('due_date')} ({o.get('status')})")
    if len(parts) == 1:
        parts.append("Configure GEMINI_API_KEY for richer answers. Try asking about GSTR-1, deadlines, or HSN.")
    return "\n".join(parts)
