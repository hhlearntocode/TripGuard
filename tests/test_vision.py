import pytest
import json
from unittest.mock import patch, MagicMock


def test_identify_sign_valid():
    mock_msg = MagicMock()
    mock_msg.content = json.dumps({
        "code": "P.102",
        "name": "No Entry",
        "category": "prohibition",
        "meaning": "No vehicles allowed to enter"
    })
    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock(message=mock_msg)]

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_resp

    with patch("backend.services.vision_service._client", mock_client):
        from backend.services.vision_service import identify_sign
        result = identify_sign("base64encodedimage")

    assert result is not None
    assert result["code"] == "P.102"
    assert result["name"] == "No Entry"


def test_identify_sign_not_traffic_sign():
    mock_msg = MagicMock()
    mock_msg.content = json.dumps({"code": None})
    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock(message=mock_msg)]

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_resp

    with patch("backend.services.vision_service._client", mock_client):
        from backend.services.vision_service import identify_sign
        result = identify_sign("base64image")

    assert result is not None
    assert result["code"] is None


def test_identify_sign_malformed_json():
    mock_msg = MagicMock()
    mock_msg.content = "Not valid JSON at all"
    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock(message=mock_msg)]

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_resp

    with patch("backend.services.vision_service._client", mock_client):
        from backend.services.vision_service import identify_sign
        result = identify_sign("base64image")

    assert result is None
