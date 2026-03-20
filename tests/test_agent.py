import pytest
import asyncio
from unittest.mock import patch, MagicMock


@pytest.mark.asyncio
async def test_agent_no_tool_calls(sample_user_profile, mock_llm_adapter):
    # get_adapter and execute_tool are imported locally inside run_agent,
    # so patch at source module level
    with patch("backend.services.llm_adapter.get_adapter", return_value=mock_llm_adapter), \
         patch("backend.services.tool_registry.execute_tool"):
        from backend.services.agent import run_agent
        result = await run_agent("Can I ride a motorbike?", sample_user_profile)

    assert "answer" in result
    assert "steps" in result
    assert "tools_used" in result
    assert len(result["steps"]) == 0


@pytest.mark.asyncio
async def test_agent_with_tool_call(sample_user_profile):
    adapter = MagicMock()
    adapter.chat_with_tools.side_effect = [
        {
            "content": "",
            "tool_calls": [{"id": "call_1", "name": "retrieve_law", "arguments": {"query": "motorbike"}}],
        },
        {
            "content": "❌ Illegal — no valid IDP.\n\n⚠️ Legal information only, not legal advice.",
            "tool_calls": [],
        },
    ]

    with patch("backend.services.llm_adapter.get_adapter", return_value=adapter), \
         patch("backend.services.tool_registry.execute_tool", return_value="Law chunk text"):
        from backend.services.agent import run_agent
        result = await run_agent("Can I ride a motorbike?", sample_user_profile)

    assert "answer" in result
    assert len(result["tools_used"]) == 1
    assert result["tools_used"][0]["tool"] == "retrieve_law"


@pytest.mark.asyncio
async def test_agent_max_steps_exhausted(sample_user_profile):
    """When max_steps hit, agent should still return an answer."""
    adapter = MagicMock()

    call_count = 0

    def side_effect(messages, tools):
        nonlocal call_count
        call_count += 1
        if not tools:  # Final forced call has no tools
            return {"content": "Summary answer.", "tool_calls": []}
        return {
            "content": "",
            "tool_calls": [{"id": f"call_{call_count}", "name": "retrieve_law", "arguments": {"query": "test"}}],
        }

    adapter.chat_with_tools.side_effect = side_effect

    with patch("backend.services.llm_adapter.get_adapter", return_value=adapter), \
         patch("backend.services.tool_registry.execute_tool", return_value="chunk"):
        from backend.services.agent import run_agent
        result = await run_agent("test", sample_user_profile, max_steps=3)

    assert result["answer"] == "Summary answer."
    assert len(result["steps"]) == 3
