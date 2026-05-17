from pathlib import Path
import sys

from fastapi import FastAPI

# Allow imports from both backend root and backend/app directories
if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from app.api.api_v1.api import api_router
    from app.core.config import settings
else:
    from .api.api_v1.api import api_router
    from .core.config import settings

app = FastAPI(title=settings.PROJECT_NAME, version="0.1.0")

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Asta backend is running"}
