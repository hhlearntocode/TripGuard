import pytest
from unittest.mock import patch, MagicMock


def test_web_search_trusted_domain():
    mock_client = MagicMock()
    mock_client.search.return_value = {
        "results": [
            {
                "title": "Traffic Law Vietnam",
                "url": "https://thuvienphapluat.vn/van-ban/traffic",
                "content": "Motorbike license requirements..."
            }
        ]
    }

    with patch("backend.services.web_search_service._client", mock_client):
        from backend.services.web_search_service import web_search
        result = web_search("Vietnam motorbike license law", max_results=5)

    assert "Traffic Law Vietnam" in result
    assert "✓ trusted source" in result
    assert "thuvienphapluat.vn" in result


def test_web_search_untrusted_domain():
    mock_client = MagicMock()
    mock_client.search.return_value = {
        "results": [
            {
                "title": "Blog Post",
                "url": "https://random-blog.com/vietnam-laws",
                "content": "Some content..."
            }
        ]
    }

    with patch("backend.services.web_search_service._client", mock_client):
        from backend.services.web_search_service import web_search
        result = web_search("Vietnam law", max_results=3)

    assert "Blog Post" in result
    assert "✓ trusted source" not in result


def test_web_search_no_results():
    mock_client = MagicMock()
    mock_client.search.return_value = {"results": []}

    with patch("backend.services.web_search_service._client", mock_client):
        from backend.services.web_search_service import web_search
        result = web_search("obscure query")

    assert "No results found" in result


def test_web_search_error_handling():
    mock_client = MagicMock()
    mock_client.search.side_effect = Exception("API error")

    with patch("backend.services.web_search_service._client", mock_client):
        from backend.services.web_search_service import web_search
        result = web_search("test query")

    assert "Web search error" in result
