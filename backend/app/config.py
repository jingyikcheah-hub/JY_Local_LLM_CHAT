from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime configuration, loaded from environment variables or `.env`."""

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_prefix="LOCALCHAT_",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "LocalChat"
    environment: str = "production"
    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)
    open_browser: bool = False
    models_dir: Path = PROJECT_ROOT / "models"
    default_model: str | None = None
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    context_size: int = Field(default=4096, ge=512, le=131072)
    threads: int = Field(default_factory=lambda: max(1, (os.cpu_count() or 4) - 1), ge=1)
    gpu_layers: int = Field(default=0, ge=-1)
    batch_size: int = Field(default=512, ge=32, le=4096)
    chat_format: str | None = None

    max_message_chars: int = Field(default=16_000, ge=256, le=100_000)
    max_messages: int = Field(default=80, ge=2, le=500)

    @field_validator("models_dir", mode="before")
    @classmethod
    def expand_models_dir(cls, value: str | Path) -> Path:
        return Path(value).expanduser().resolve()

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
