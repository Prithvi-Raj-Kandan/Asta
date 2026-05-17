from fastapi import APIRouter
from .endpoints import health, auth, uploads, file_metadata

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
api_router.include_router(file_metadata.router, prefix="/files", tags=["file-metadata"])
