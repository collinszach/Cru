from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Environment
    environment: str = "development"

    # PostgreSQL
    postgres_user: str = "cru"
    postgres_password: str
    postgres_host: str = "cru-db"
    postgres_port: int = 5432
    postgres_db: str = "cru"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        """Synchronous URL for Alembic migrations."""
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # Redis
    redis_url: str = "redis://cru-redis:6379/0"

    # MinIO
    minio_endpoint: str = "cru-minio:9000"
    minio_root_user: str = "minioadmin"
    minio_root_password: str
    minio_bucket_labels: str = "cru-labels"
    minio_bucket_photos: str = "cru-photos"
    minio_secure: bool = False

    # Clerk
    clerk_secret_key: str
    clerk_jwks_url: str = "https://api.clerk.dev/v1/jwks"

    # AI
    anthropic_api_key: str
    openai_api_key: str

    # App
    secret_key: str
    allowed_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
