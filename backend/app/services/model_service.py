from __future__ import annotations

import logging
import threading
from collections.abc import Iterator
from pathlib import Path
from typing import Any

from backend.app.config import Settings
from backend.app.schemas import ChatRequest, ModelInfo, RuntimeStatus

logger = logging.getLogger(__name__)


class ModelUnavailableError(RuntimeError):
    pass


class ModelBusyError(RuntimeError):
    pass


class ModelNotFoundError(ValueError):
    pass


def human_size(size_bytes: int) -> str:
    value = float(size_bytes)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if value < 1024 or unit == "TB":
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024
    return f"{size_bytes} B"


class ModelService:
    """Owns the llama.cpp model lifecycle and serializes local inference."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.settings.models_dir.mkdir(parents=True, exist_ok=True)
        self._llm: Any | None = None
        self._model_id: str | None = None
        self._state = "unloaded"
        self._error: str | None = None
        self._lifecycle_lock = threading.RLock()
        self._generation_lock = threading.Lock()

    def status(self) -> RuntimeStatus:
        with self._lifecycle_lock:
            name = Path(self._model_id).name if self._model_id else None
            return RuntimeStatus(
                state=self._state,
                model_id=self._model_id,
                model_name=name,
                error=self._error,
            )

    def discover_models(self) -> list[ModelInfo]:
        active = self.status().model_id
        models: list[ModelInfo] = []
        for path in sorted(self.settings.models_dir.rglob("*.gguf"), key=lambda item: item.name.lower()):
            if not path.is_file():
                continue
            relative = path.relative_to(self.settings.models_dir).as_posix()
            size = path.stat().st_size
            models.append(
                ModelInfo(
                    id=relative,
                    name=path.name,
                    size_bytes=size,
                    size_label=human_size(size),
                    loaded=relative == active,
                )
            )
        return models

    def resolve_model(self, model_id: str) -> Path:
        root = self.settings.models_dir.resolve()
        candidate = (root / model_id).resolve()
        try:
            candidate.relative_to(root)
        except ValueError as exc:
            raise ModelNotFoundError("Model must be inside the configured models directory") from exc
        if candidate.suffix.lower() != ".gguf" or not candidate.is_file():
            raise ModelNotFoundError(f"GGUF model not found: {model_id}")
        return candidate

    def load(self, model_id: str) -> RuntimeStatus:
        path = self.resolve_model(model_id)
        with self._lifecycle_lock:
            if self._state == "ready" and self._model_id == model_id:
                return self.status()
            self._state = "loading"
            self._error = None
            self._llm = None
            self._model_id = None

            try:
                from llama_cpp import Llama

                options: dict[str, Any] = {
                    "model_path": str(path),
                    "n_ctx": self.settings.context_size,
                    "n_threads": self.settings.threads,
                    "n_batch": self.settings.batch_size,
                    "n_gpu_layers": self.settings.gpu_layers,
                    "verbose": False,
                }
                if self.settings.chat_format:
                    options["chat_format"] = self.settings.chat_format
                self._llm = Llama(**options)
                self._model_id = path.relative_to(self.settings.models_dir).as_posix()
                self._state = "ready"
                logger.info("Loaded local model %s", self._model_id)
            except Exception as exc:
                logger.exception("Unable to load model %s", model_id)
                self._state = "error"
                self._error = "The model could not be loaded. Check its format and your runtime settings."
                raise ModelUnavailableError(self._error) from exc
        return self.status()

    def unload(self) -> RuntimeStatus:
        with self._lifecycle_lock:
            self._llm = None
            self._model_id = None
            self._state = "unloaded"
            self._error = None
        return self.status()

    def generate(self, request: ChatRequest) -> Iterator[str]:
        if not self._generation_lock.acquire(blocking=False):
            raise ModelBusyError("The model is already answering another request")

        try:
            with self._lifecycle_lock:
                llm = self._llm
            if llm is None or self.status().state != "ready":
                raise ModelUnavailableError("Select and load a local model before chatting")

            stream = llm.create_chat_completion(
                messages=[message.model_dump() for message in request.messages],
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
                repeat_penalty=request.repeat_penalty,
                stream=True,
            )
            for chunk in stream:
                text = chunk.get("choices", [{}])[0].get("delta", {}).get("content")
                if text:
                    yield text
        finally:
            self._generation_lock.release()
