from pydantic import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:root@127.0.0.1:5432/plagiarism"

    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Storage
    STORAGE_TYPE: str = "local"
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_BUCKET_NAME: str = "plagiarism-uploads"

    # AI Detection
    USE_EXTERNAL_AI_DETECTION: bool = False
    OPENAI_API_KEY: Optional[str] = None
    TOGETHER_API_KEY: Optional[str] = None

    # Redis / Celery
    REDIS_URL: str = "redis://127.0.0.1:6379/0"
    CELERY_BROKER_URL: str = "redis://127.0.0.1:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://127.0.0.1:6379/0"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()