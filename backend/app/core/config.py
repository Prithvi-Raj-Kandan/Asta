from pydantic import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Asta Backend"
    DATABASE_URL: str
    API_V1_STR: str = "/api/v1"

    class Config:
        env_file = "../.env"

settings = Settings()
