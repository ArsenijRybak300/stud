from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "StudentPlan API"
    api_prefix: str = "/api"
    database_url: str = "sqlite:///./studentplan.db"
    secret_key: str = "development_secret_key_change_me_1234567890"
    access_token_expire_minutes: int = 1440
    algorithm: str = "HS256"
    app_timezone: str = "Asia/Yekaterinburg"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    uploads_dir: str = "uploads"
    max_upload_size_mb: int = 20
    initial_admin_email: str = "admin@studentplan.ru"
    initial_admin_password: str = "Admin12345"
    initial_admin_name: str = "Администратор StudentPlan"
    initial_group_code: str = "НМТ-333901"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", enable_decoding=False)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("["):
                import json
                return json.loads(value)
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def uploads_path(self) -> Path:
        return Path(self.uploads_dir).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
