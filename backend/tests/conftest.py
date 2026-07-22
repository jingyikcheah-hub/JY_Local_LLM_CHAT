from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas import ChatRequest, ModelInfo, RuntimeStatus


class FakeModelService:
    def __init__(self) -> None:
        self.ready = False

    def status(self) -> RuntimeStatus:
        if self.ready:
            return RuntimeStatus(state="ready", model_id="test.gguf", model_name="test.gguf")
        return RuntimeStatus(state="unloaded")

    def discover_models(self) -> list[ModelInfo]:
        return [
            ModelInfo(
                id="test.gguf",
                name="test.gguf",
                size_bytes=1024,
                size_label="1.0 KB",
                loaded=self.ready,
            )
        ]

    def load(self, model_id: str) -> RuntimeStatus:
        self.ready = True
        return self.status()

    def unload(self) -> RuntimeStatus:
        self.ready = False
        return self.status()

    def generate(self, request: ChatRequest) -> Iterator[str]:
        yield "Hello"
        yield " locally"


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        test_client.app.state.model_service = FakeModelService()
        yield test_client
