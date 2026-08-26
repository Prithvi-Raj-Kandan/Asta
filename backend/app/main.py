from pathlib import Path
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

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

# Configure CORS - MUST be added BEFORE include_router
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


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors with detailed messages"""
    errors = exc.errors()
    error_details = []
    for error in errors:
        field = ".".join(str(loc) for loc in error["loc"][1:])
        error_details.append(f"{field}: {error['msg']}")
    
    return JSONResponse(
        status_code=400,
        content={"detail": " | ".join(error_details) if error_details else "Validation error"}
    )


@app.on_event("startup")
def startup_event():
    """Prepare reflected models, migrations, and reference seeds."""
    prepare_reflected_models(engine)
    try:
        if __package__ in {None, ""}:
            from app.db.bootstrap import run_migrations, seed_reference_data
            from app.db.session import SessionLocal
        else:
            from .db.bootstrap import run_migrations, seed_reference_data
            from .db.session import SessionLocal

        run_migrations(engine)
        db = SessionLocal()
        try:
            seed_reference_data(db)
        finally:
            db.close()
    except Exception as exc:
        # Do not block API boot if seed/migration has a transient issue
        import logging

        logging.getLogger(__name__).exception("Bootstrap failed: %s", exc)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Asta backend is running"}
