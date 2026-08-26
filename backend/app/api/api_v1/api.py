from fastapi import APIRouter
from .endpoints import (
    health,
    auth,
    uploads,
    file_metadata,
    invoices,
    agents,
    filings,
    compliance,
    chat,
    analytics,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
api_router.include_router(file_metadata.router, prefix="/files", tags=["file-metadata"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(filings.router, prefix="/filings", tags=["filings"])
api_router.include_router(compliance.router, prefix="/compliance", tags=["compliance"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
