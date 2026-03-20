import pytest
import json
from unittest.mock import patch, MagicMock


def test_openrouter_adapter_no_tool_calls():
    mock_msg = MagicMock()
    mock_msg.content = "Test response"
    mock_msg.tool_calls = None

    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock(message=mock_msg)]

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_resp

    # OpenAI is imported inside __init__ with `from openai import OpenAI`
    # so patch at the openai module level
    with patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-key"}), \
         patch("openai.OpenAI", return_value=mock_client):
        from backend.services.llm_adapter import OpenRouterAdapter
        adapter = OpenRouterAdapter()
        result = adapter.chat_with_tools([{"role": "user", "content": "test"}], [])

    assert result["content"] == "Test response"
    assert result["tool_calls"] == []


def test_openrouter_adapter_with_tool_calls():
    tc = MagicMock()
    tc.id = "call_123"
    tc.function.name = "retrieve_law"
    tc.function.arguments = json.dumps({"query": "motorbike", "category": "traffic"})

    mock_msg = MagicMock()
    mock_msg.content = ""
    mock_msg.tool_calls = [tc]

    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock(message=mock_msg)]

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_resp

    with patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-key"}), \
         patch("openai.OpenAI", return_value=mock_client):
        from backend.services.llm_adapter import OpenRouterAdapter
        adapter = OpenRouterAdapter()
        result = adapter.chat_with_tools([{"role": "user", "content": "test"}], [{}])

    assert len(result["tool_calls"]) == 1
    assert result["tool_calls"][0]["name"] == "retrieve_law"
    assert result["tool_calls"][0]["id"] == "call_123"


def test_ollama_adapter_no_tool_calls():
    mock_ollama = MagicMock()
    mock_ollama.chat.return_value = {
        "message": {"content": "Ollama response", "tool_calls": None}
    }

    with patch.dict("backend.services.llm_adapter.__dict__", {}), \
         patch("backend.services.llm_adapter.OllamaAdapter.__init__") as mock_init:
        mock_init.return_value = None
        from backend.services.llm_adapter import OllamaAdapter
        adapter = OllamaAdapter.__new__(OllamaAdapter)
        adapter.client = mock_ollama
        adapter.model = "qwen2.5:72b"
        result = adapter.chat_with_tools([{"role": "user", "content": "test"}], [])

    assert result["content"] == "Ollama response"
    assert result["tool_calls"] == []


def test_get_adapter_openrouter():
    with patch.dict("os.environ", {"LLM_PROVIDER": "openrouter", "OPENROUTER_API_KEY": "test"}), \
         patch("openai.OpenAI"):
        from backend.services.llm_adapter import get_adapter, OpenRouterAdapter
        adapter = get_adapter()
        assert isinstance(adapter, OpenRouterAdapter)


def test_get_adapter_default_ollama():
    mock_ollama = MagicMock()
    with patch.dict("os.environ", {"LLM_PROVIDER": "ollama"}), \
         patch.dict("sys.modules", {"ollama": mock_ollama}):
        import importlib
        import backend.services.llm_adapter as mod
        importlib.reload(mod)
        with patch.object(mod.OllamaAdapter, "__init__", return_value=None):
            adapter = mod.get_adapter()
            assert isinstance(adapter, mod.OllamaAdapter)
