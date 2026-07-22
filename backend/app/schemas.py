from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Message(ApiModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)

    @field_validator("content")
    @classmethod
    def reject_blank_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Message content cannot be blank")
        return value


class ChatRequest(ApiModel):
    messages: list[Message] = Field(min_length=1)
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=1024, ge=1, le=8192)
    top_p: float = Field(default=0.95, gt=0, le=1)
    repeat_penalty: float = Field(default=1.1, ge=0.5, le=2)


class ModelLoadRequest(ApiModel):
    model_id: str = Field(min_length=1, max_length=500)


class ModelInfo(ApiModel):
    id: str
    name: str
    size_bytes: int
    size_label: str
    loaded: bool


class RuntimeStatus(ApiModel):
    state: Literal["unloaded", "loading", "ready", "error"]
    model_id: str | None = None
    model_name: str | None = None
    error: str | None = None


class HealthResponse(ApiModel):
    status: Literal["ok"] = "ok"
    version: str
    model: RuntimeStatus
