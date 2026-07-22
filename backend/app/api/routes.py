from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from backend.app.config import Settings, get_settings
from backend.app.schemas import ChatRequest, HealthResponse, ModelInfo, ModelLoadRequest, RuntimeStatus
from backend.app.services.model_service import (
    ModelBusyError,
    ModelNotFoundError,
    ModelService,
    ModelUnavailableError,
)

router = APIRouter(prefix="/api/v1")


def get_model_service(request: Request) -> ModelService:
    return request.app.state.model_service


ModelServiceDep = Annotated[ModelService, Depends(get_model_service)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def sse(event: str, data: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.get("/health", response_model=HealthResponse, tags=["system"])
def health(service: ModelServiceDep) -> HealthResponse:
    return HealthResponse(version="2.0.0", model=service.status())


@router.get("/models", response_model=list[ModelInfo], tags=["models"])
def models(service: ModelServiceDep) -> list[ModelInfo]:
    return service.discover_models()


@router.post("/models/load", response_model=RuntimeStatus, tags=["models"])
def load_model(
    body: ModelLoadRequest,
    service: ModelServiceDep,
) -> RuntimeStatus:
    try:
        return service.load(body.model_id)
    except ModelNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/models/unload", response_model=RuntimeStatus, tags=["models"])
def unload_model(service: ModelServiceDep) -> RuntimeStatus:
    return service.unload()


@router.post("/chat/stream", tags=["chat"])
def chat_stream(
    body: ChatRequest,
    service: ModelServiceDep,
    settings: SettingsDep,
) -> StreamingResponse:
    if len(body.messages) > settings.max_messages:
        raise HTTPException(
            status_code=422,
            detail=f"A chat can include at most {settings.max_messages} messages",
        )
    if any(len(message.content) > settings.max_message_chars for message in body.messages):
        raise HTTPException(status_code=422, detail="A message is longer than the configured safety limit")
    if service.status().state != "ready":
        raise HTTPException(status_code=409, detail="Select and load a local model before chatting")

    def events() -> Iterator[str]:
        try:
            yield sse("start", {"model": service.status().model_name or "local model"})
            for token in service.generate(body):
                yield sse("token", {"text": token})
            yield sse("done", {})
        except ModelBusyError as exc:
            yield sse("error", {"message": str(exc), "code": "MODEL_BUSY"})
        except ModelUnavailableError as exc:
            yield sse("error", {"message": str(exc), "code": "MODEL_UNAVAILABLE"})
        except Exception:
            yield sse("error", {"message": "Generation stopped unexpectedly", "code": "GENERATION_FAILED"})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )
