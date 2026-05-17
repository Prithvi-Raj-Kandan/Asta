from fastapi import FastAPI
from .api.api_v1 import api as api_v1
from .core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(api_v1.api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"app": settings.PROJECT_NAME, "status": "running"}
