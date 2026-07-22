from fastapi.testclient import TestClient


def test_health_reports_runtime_state(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["model"]["state"] == "unloaded"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_models_can_be_discovered_and_loaded(client: TestClient) -> None:
    models = client.get("/api/v1/models")
    loaded = client.post("/api/v1/models/load", json={"model_id": "test.gguf"})

    assert models.json()[0]["name"] == "test.gguf"
    assert loaded.status_code == 200
    assert loaded.json()["state"] == "ready"


def test_chat_requires_loaded_model(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/stream",
        json={"messages": [{"role": "user", "content": "Hello"}]},
    )

    assert response.status_code == 409


def test_chat_stream_emits_tokens(client: TestClient) -> None:
    client.post("/api/v1/models/load", json={"model_id": "test.gguf"})

    response = client.post(
        "/api/v1/chat/stream",
        json={"messages": [{"role": "user", "content": "Hello"}]},
    )

    assert response.status_code == 200
    assert "event: token" in response.text
    assert '\"text\": \"Hello\"' in response.text
    assert "event: done" in response.text


def test_chat_rejects_blank_messages(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/stream",
        json={"messages": [{"role": "user", "content": "  "}]},
    )

    assert response.status_code == 422
