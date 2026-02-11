from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://lka:lka_dev_password@postgres:5432/lka",
    )

    # Redis
    redis_url: str = Field(default="redis://redis:6379/0")

    # MinIO
    minio_endpoint: str = Field(default="minio:9000")
    minio_access_key: str = Field(default="minioadmin")
    minio_secret_key: str = Field(default="minioadmin123")
    minio_bucket: str = Field(default="originals")
    minio_use_ssl: bool = Field(default=False)

    # Embedder
    embedder_url: str = Field(default="http://embedder:8000")

    # Tika
    tika_url: str = Field(default="http://tika:9998")

    # App
    secret_key: str = Field(default="change-me-in-production")
    admin_email: str = Field(default="admin@local.host")
    admin_password: str = Field(default="changeme123")
    log_level: str = Field(default="INFO")

    # JWT
    jwt_access_token_expire_minutes: int = Field(default=30)
    jwt_refresh_token_expire_days: int = Field(default=7)
    jwt_algorithm: str = Field(default="HS256")

    # Upload limits
    max_file_size_mb: int = Field(default=200)
    max_batch_size_mb: int = Field(default=2048)


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
