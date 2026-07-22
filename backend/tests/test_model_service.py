from pathlib import Path

import pytest

from backend.app.config import Settings
from backend.app.schemas import ChatRequest, Message
from backend.app.services.model_service import (
    ModelNotFoundError,
    ModelService,
    ModelUnavailableError,
    human_size,
)


def service_for(models_dir: Path) -> ModelService:
    return ModelService(Settings(models_dir=models_dir))


def test_discovers_nested_gguf_models(tmp_path: Path) -> None:
    nested = tmp_path / "small"
    nested.mkdir()
    (nested / "assistant.gguf").write_bytes(b"model")
    (nested / "ignore.txt").write_text("not a model")

    models = service_for(tmp_path).discover_models()

    assert [model.id for model in models] == ["small/assistant.gguf"]
    assert models[0].size_bytes == 5


def test_rejects_paths_outside_model_directory(tmp_path: Path) -> None:
    outside = tmp_path.parent / "outside.gguf"
    outside.write_bytes(b"model")

    with pytest.raises(ModelNotFoundError, match="inside"):
        service_for(tmp_path).resolve_model("../outside.gguf")


def test_unloaded_model_cannot_generate(tmp_path: Path) -> None:
    request = ChatRequest(messages=[Message(role="user", content="Hello")])

    with pytest.raises(ModelUnavailableError, match="Select and load"):
        list(service_for(tmp_path).generate(request))


@pytest.mark.parametrize(
    ("size", "label"),
    [(12, "12 B"), (1024, "1.0 KB"), (1024 * 1024 * 2, "2.0 MB")],
)
def test_human_size_is_readable(size: int, label: str) -> None:
    assert human_size(size) == label
