import pytest
from unittest.mock import patch, MagicMock


def test_execute_retrieve_law():
    with patch("backend.services.tool_registry.retrieve") as mock_retrieve:
        mock_retrieve.return_value = ["chunk1", "chunk2"]
        from backend.services.tool_registry import execute_tool
        result = execute_tool("retrieve_law", {"query": "motorbike license"})
        assert "chunk1" in result
        assert "chunk2" in result
        mock_retrieve.assert_called_once_with(query="motorbike license", category=None, n=3)


def test_execute_retrieve_law_empty():
    with patch("backend.services.tool_registry.retrieve") as mock_retrieve:
        mock_retrieve.return_value = []
        from backend.services.tool_registry import execute_tool
        result = execute_tool("retrieve_law", {"query": "something"})
        assert "No relevant provisions" in result


def test_execute_lookup_fine_motorbike():
    from backend.services.tool_registry import execute_tool
    result = execute_tool("lookup_fine", {"violation": "no_license", "vehicle": "motorbike"})
    assert "2,000,000" in result
    assert "4,000,000" in result


def test_execute_lookup_fine_unknown():
    from backend.services.tool_registry import execute_tool
    result = execute_tool("lookup_fine", {"violation": "no_license", "vehicle": "bicycle"})
    assert "No fine data" in result


def test_execute_get_emergency_steps():
    from backend.services.tool_registry import execute_tool
    result = execute_tool("get_emergency_steps", {"scenario": "police_stop", "nationality": "United States"})
    assert "Police Stopped Me" in result
    assert "+84 24 3850 5000" in result  # US embassy


def test_execute_get_emergency_steps_unknown():
    from backend.services.tool_registry import execute_tool
    result = execute_tool("get_emergency_steps", {"scenario": "unknown_scenario"})
    assert "No emergency script" in result


def test_execute_web_search():
    with patch("backend.services.tool_registry._web_search") as mock_search:
        mock_search.return_value = "1. Test result\n   URL: https://example.com"
        from backend.services.tool_registry import execute_tool
        result = execute_tool("web_search", {"query": "Vietnam drone laws 2025"})
        assert "Test result" in result
        mock_search.assert_called_once_with("Vietnam drone laws 2025", 5)


def test_execute_scrape_url():
    with patch("backend.services.tool_registry.tinyfish_scrape") as mock_scrape:
        mock_scrape.return_value = '{"content": "scraped content"}'
        from backend.services.tool_registry import execute_tool
        result = execute_tool("scrape_url", {"url": "https://thuvienphapluat.vn/test", "goal": "extract law"})
        assert "scraped content" in result


def test_execute_unknown_tool():
    from backend.services.tool_registry import execute_tool
    result = execute_tool("nonexistent_tool", {})
    assert "Unknown tool" in result
