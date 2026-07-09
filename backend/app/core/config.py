from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "Cadeia de Custódia"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Database
    DATABASE_URL: str
    DATABASE_URL_SYNC: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # MinIO
    MINIO_ENDPOINT: str = "minio:9000"                                  # interno (Docker)
    MINIO_PUBLIC_ENDPOINT: str = "http://localhost:5173/storage"        # proxy Nginx → browser
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin123"
    MINIO_BUCKET_PHOTOS: str = "photos"
    MINIO_BUCKET_REPORTS: str = "reports"
    MINIO_BUCKET_DOCUMENTS: str = "documents"
    MINIO_BUCKET_TEMPLATES: str = "templates"
    MINIO_BUCKET_TARGET_PHOTOS: str = "target-photos"
    MINIO_USE_SSL: bool = False

    # Admin Seed
    ADMIN_USERNAME: str = "admin"
    ADMIN_EMAIL: str = "admin@pericia.gov.br"
    ADMIN_PASSWORD: str = "Admin@123!"
    ADMIN_FULL_NAME: str = "Administrador do Sistema"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
