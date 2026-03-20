import pytest
from unittest.mock import patch, MagicMock
import httpx


def test_tinyfish_completed():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "status": "COMPLETED",
        "result": {"content": "Law article text", "source": "NĐ 168/2024"}
    }

    with patch("backend.services.tinyfish_service.httpx.post", return_value=mock_resp):
        from backend.services.tinyfish_service import tinyfish_scrape
        result = tinyfish_scrape("https://thuvienphapluat.vn/test", "extract law content")

    assert "Law article text" in result


def test_tinyfish_blocked_domain():
    from backend.services.tinyfish_service import tinyfish_scrape
    result = tinyfish_scrape("https://facebook.com/page", "extract content")
    assert "not allowed" in result


def test_tinyfish_failed_blocked_retries_stealth():
    fail_resp = MagicMock()
    fail_resp.json.return_value = {
        "status": "FAILED",
        "error": {"message": "Access blocked by site"}
    }
    stealth_resp = MagicMock()
    stealth_resp.json.return_value = {
        "status": "COMPLETED",
        "result": "Stealth result"
    }

    with patch("backend.services.tinyfish_service.httpx.post", side_effect=[fail_resp, stealth_resp]):
        from backend.services.tinyfish_service import tinyfish_scrape
        result = tinyfish_scrape("https://chinhphu.vn/test", "extract law")

    assert "Stealth result" in result


def test_tinyfish_timeout():
    with patch("backend.services.tinyfish_service.httpx.post", side_effect=httpx.TimeoutException("timeout")):
        from backend.services.tinyfish_service import tinyfish_scrape
        result = tinyfish_scrape("https://example.com", "extract content")

    assert "timeout" in result.lower()


def test_tinyfish_failure_result():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "status": "COMPLETED",
        "result": {"status": "failure", "reason": "Page not found"}
    }

    with patch("backend.services.tinyfish_service.httpx.post", return_value=mock_resp):
        from backend.services.tinyfish_service import tinyfish_scrape
        result = tinyfish_scrape("https://moj.gov.vn/test", "extract content")

    assert "Could not extract" in result


def test_tinyfish_adds_json_goal():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"status": "COMPLETED", "result": "done"}

    captured_json = {}
    def capture_post(url, **kwargs):
        captured_json.update(kwargs.get("json", {}))
        return mock_resp

    with patch("backend.services.tinyfish_service.httpx.post", side_effect=capture_post):
        from backend.services.tinyfish_service import tinyfish_scrape
        tinyfish_scrape("https://example.com", "extract law text")

    assert "json" in captured_json["goal"].lower()
