"""Chat + RAG endpoints."""
from __future__ import annotations

import logging
import re
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ....agents.document_generator import DocumentGeneratorAgent
from ....agents.orchestrator import orchestrator
from ....agents.chat_tools import ChatTools
from ....api.deps import get_current_user_id
from ....db.session import get_db
from ....models.reflected import ChatHistory, Invoice
from ....services.embeddings import embedding_service
from ....services.llm import llm_service
from ....services.rag import ensure_knowledge_indexed, retrieve_chunks

logger = logging.getLogger(__name__)
router = APIRouter()
doc_agent = DocumentGeneratorAgent()


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    intent: str
    agents_used: list[str] = Field(default_factory=list)
    citations: list[dict] = Field(default_factory=list)
    download_url: str | None = None
    download_filename: str | None = None
    download_label: str | None = None
    action_type: str | None = None
    action_payload: dict | None = None


@router.post("/", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    session_id = body.session_id or str(uuid4())
    ensure_knowledge_indexed(db)

    intent = orchestrator.classify_intent(body.message)
    download_url = None
    download_filename = None
    download_label = None
    action_type = None
    action_payload = None
    generated_meta: dict | None = None

    if _wants_gstr1(body.message):
        # Deterministically handle GSTR-1 intent
        intent = "document_generate"
        
        # Try to extract period from message (e.g. 2026-08), default to current month
        period_match = re.search(r"(\d{4}-\d{2})", body.message)
        filing_period = period_match.group(1) if period_match else datetime.utcnow().strftime("%Y-%m")
        
        result = doc_agent.run(
            {
                "filing_period": filing_period,
                "format": "csv",
                "triggered_by": "ai_agent",
            },
            {"db": db, "user_id": user_id},
        )
        db.commit()
        
        if result.success and result.data.get("rows"):
            action_type = "review_filing"
            action_payload = {"period": filing_period}
            
            # Since we intercept, we provide a deterministic reply
            reply = (
                f"I have successfully prepared your GSTR-1 payload for **{filing_period}**.\n\n"
                "Please click the **Review & File** button below to inspect the details and submit it to the sandbox environment."
            )
            agents_used = ["document_generator"]
            
            # Skip the LLM call for deterministic filing
            llm_service_bypassed = True
        else:
            generated_meta = {"error": result.error or result.message or "Generation failed"}
            llm_service_bypassed = False
    else:
        llm_service_bypassed = False

    orch = orchestrator.run(
        db=db,
        user_id=user_id,
        intent=intent if intent != "chat" else "deadlines",
        message=body.message,
        payload={"query": body.message, "action": "list"},
    )

    citations = retrieve_chunks(db, body.message, k=4) if embedding_service.available else []
    context_bits = [c["content"] for c in citations]

    agent_context = orch.get("results") or []
    
    if llm_service_bypassed:
        # We already generated the reply deterministically
        pass
    elif generated_meta is not None:
        reply = (
            "I tried to generate the GSTR-1 file but it could not be created. "
            f"{generated_meta.get('error') or 'Please try again from Compliance → AI Generate.'}"
        )
        agents_used = ["document_generator"]
    elif llm_service.available:
        try:
            tools_obj = ChatTools(db, user_id)
            tool_list = tools_obj.get_tools_list()
            
            system_msg = (
                "You are Asta, a formal India GST compliance co-pilot. "
                "Answer in short paragraphs. Use Indian rupee formatting. "
                "Use tools when the user asks about sales, purchases, deadlines, news, or GSTR-1. "
                "If a tool returns invoice lines, use them to answer specific questions such as the highest sale. "
                "Do not mention tools, function names, JSON, or debug data. "
                "Never append traces such as [DEBUG ...] or llm_calls. "
                "Asta can file GSTR-1 through the sandbox Review & File action. "
                "Do not tell the user they must export or upload files themselves."
            )
            
            user_msg = (
                f"User question: {body.message}\n\n"
                f"Knowledge:\n{chr(10).join(context_bits)}\n\n"
                f"Agent results: {agent_context}"
            )
            
            reply, llm_calls = llm_service.chat_with_tools(
                system=system_msg,
                user=user_msg,
                tools=tool_list,
                max_tokens=1000
            )
            
            logger.debug("LLM tool calls: %s", llm_calls)

            agents_used = []
            for call in llm_calls:
                name = call.get("name")
                if name not in agents_used:
                    agents_used.append(name)

                if name == "prepare_gstr1_filing":
                    action_type = "review_filing"
                    action_payload = {"period": call.get("args", {}).get("period")}

            reply = _format_reply(reply)
            
        except Exception as exc:
            logger.warning("Chat LLM failed: %s", exc)
            reply = _fallback_reply(body.message, agent_context, citations)
            agents_used = []
    else:
        reply = _fallback_reply(body.message, agent_context, citations)
        agents_used = []

    reply = _format_reply(reply)

    _persist_message(db, user_id, session_id, "user", body.message, intent, None, None)
    _persist_message(
        db,
        user_id,
        session_id,
        "assistant",
        reply,
        intent,
        ",".join(agents_used),
        agents_used,
    )
    db.commit()

    return ChatResponse(
        session_id=session_id,
        reply=reply,
        intent=intent,
        agents_used=agents_used,
        citations=[{"source": c.get("source"), "excerpt": c.get("content", "")[:240]} for c in citations],
        download_url=download_url,
        download_filename=download_filename,
        download_label=download_label,
        action_type=action_type,
        action_payload=action_payload,
    )


@router.post("/index-knowledge")
def index_knowledge(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    if not embedding_service.available:
        raise HTTPException(status_code=400, detail="GEMINI_API_KEY not configured")
    count = ensure_knowledge_indexed(db, force=True)
    return {"indexed": count}


def _wants_gstr1(message: str) -> bool:
    lower = (message or "").lower()
    return any(
        token in lower
        for token in (
            "gstr-1",
            "gstr1",
            "generate gstr",
            "export gstr",
            "gstr 1",
            "download gstr",
        )
    )


def _format_reply(text: str) -> str:
    cleaned = re.sub(r"\n*\[DEBUG[^\]]*\]\s*", "", text or "", flags=re.IGNORECASE)
    cleaned = re.sub(r"\n*llm_calls\s*[:=].*$", "", cleaned, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned


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
