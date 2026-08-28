from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Asta Backend"
    DATABASE_URL: str
    API_V1_STR: str = "/api/v1"

    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-3.6-flash"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIM: int = 1536

    SANDBOX_BASE_URL: str = "https://test-api.sandbox.co.in"
    SANDBOX_API_KEY: str = ""
    SANDBOX_API_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        extra="ignore",
    )


settings = Settings()
