import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    with patch("backend.services.rag_service._init"):
        from backend.main import app
        return TestClient(app)


def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_chat_endpoint(client, sample_user_profile):
    mock_result = {
        "answer": "❌ Illegal — test answer.",
        "sources": ["NĐ 168/2024/NĐ-CP Điều 5"],
        "steps": ["Step 1: retrieve_law → chunk..."],
        "tools_used": [{"tool": "retrieve_law", "args": {"query": "motorbike"}}],
    }

    with patch("backend.routers.chat.run_agent", new=AsyncMock(return_value=mock_result)):
        resp = client.post("/api/chat", json={
            "message": "Can I ride a motorbike?",
            "user_profile": sample_user_profile,
            "conversation_history": [],
        })

    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert "sources" in data
    assert "debug" in data
    assert data["answer"] == "❌ Illegal — test answer."
    assert "steps" in data["debug"]
    assert "tools_used" in data["debug"]


def test_chat_endpoint_missing_fields(client):
    resp = client.post("/api/chat", json={"message": "test"})
    assert resp.status_code == 422  # Validation error


def test_vision_endpoint(client):
    mock_sign = {"code": "P.102", "name": "No Entry", "category": "prohibition", "meaning": "..."}

    with patch("backend.routers.chat.identify_sign", return_value=mock_sign):
        resp = client.post("/api/vision", json={"image_b64": "base64data"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "P.102"
    assert data["name"] == "No Entry"


def test_vision_endpoint_no_sign(client):
    with patch("backend.routers.chat.identify_sign", return_value=None):
        resp = client.post("/api/vision", json={"image_b64": "base64data"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] is None


def test_scribe_token_endpoint(client):
    with patch("backend.routers.voice.create_single_use_token", new=AsyncMock(return_value="scribe-token")):
        resp = client.post("/api/voice/scribe-token")

    assert resp.status_code == 200
    assert resp.json() == {"token": "scribe-token"}


def test_scribe_token_endpoint_missing_config(client):
    from backend.services.elevenlabs_service import ElevenLabsConfigError

    with patch(
        "backend.routers.voice.create_single_use_token",
        new=AsyncMock(side_effect=ElevenLabsConfigError("ELEVENLABS_API_KEY is not configured.")),
    ):
        resp = client.post("/api/voice/scribe-token")

    assert resp.status_code == 500
    assert resp.json()["detail"] == "ELEVENLABS_API_KEY is not configured."
