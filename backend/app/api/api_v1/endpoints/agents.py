"""Agent orchestration endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ....agents.orchestrator import orchestrator
from ....api.deps import get_current_user_id
from ....db.session import get_db

router = APIRouter()


class AgentRunRequest(BaseModel):
    intent: str | None = None
    message: str = ""
    payload: dict = Field(default_factory=dict)


@router.post("/run")
def run_agent(body: AgentRunRequest, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    result = orchestrator.run(
        db=db,
        user_id=user_id,
        intent=body.intent,
        message=body.message,
        payload=body.payload,
    )
    return result


@router.get("/jobs/{job_id}")
def get_agent_job(job_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    job = orchestrator.get_job(db, job_id, user_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job
