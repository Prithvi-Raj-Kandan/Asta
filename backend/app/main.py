from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Allow imports from both backend root and backend/app directories
if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from app.api.api_v1.api import api_router
    from app.core.config import settings
    from app.db.session import engine
    from app.db.base import prepare_reflected_models
else:
    from .api.api_v1.api import api_router
    from .core.config import settings
    from .db.session import engine
    from .db.base import prepare_reflected_models

app = FastAPI(title=settings.PROJECT_NAME, version="0.1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
def startup_event():
    """Prepare reflected models on startup"""
    prepare_reflected_models(engine)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Asta backend is running"}
