from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/csinsights"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    cookie_secure: bool = False

    cors_origins: list[str] = ["http://localhost:3000"]

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"

    admin_email: str = "admin@csinsights.io"
    admin_password: str = "Welcome123"

    @field_validator("database_url")
    @classmethod
    def use_asyncpg(cls, value: str) -> str:
        # Hosts like Render hand out postgres:// URLs; SQLAlchemy needs the async driver.
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+asyncpg://" + value.removeprefix(prefix)
        return value


settings = Settings()
