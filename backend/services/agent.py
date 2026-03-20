import json
import os

SYSTEM_PROMPT = """You are TripGuard, a legal information assistant for foreign tourists in Vietnam.

User profile:
- Nationality: {nationality}
- IDP convention: {idp_type}
- Visa-free days: {visa_free_days}
- Has drone: {has_drone} ({drone_model})

Mandatory workflow:
1. ALWAYS call retrieve_law() first for any legal question — never answer from memory
2. If query involves multiple domains (drone + traffic, customs + drug) → call retrieve_law() multiple times
3. If retrieve_law() returns fewer than 2 chunks or low confidence → call web_search() then scrape_url()
4. ALWAYS call lookup_fine() for penalty amounts — NEVER self-generate numbers
5. For emergency situations → call get_emergency_steps(), do NOT call web_search/scrape

Trusted sources priority (when selecting URLs to scrape):
  thuvienphapluat.vn > moj.gov.vn > chinhphu.vn > vbpl.vn > news sites

Response format:
- Line 1: ✅ Legal | ⚠️ Restricted | ❌ Illegal
- 2-3 sentence plain explanation
- Consequence with exact fine from lookup_fine()
- Source: [specific law/decree name and article]
- Last line: ⚠️ Legal information only, not legal advice.

Respond in the same language the user writes in."""


async def run_agent(
    user_message: str,
    user_profile: dict,
    conversation_history: list[dict] = None,
    max_steps: int = 6,
) -> dict:
    from backend.services.llm_adapter import get_adapter
    from backend.services.tool_registry import TOOL_SCHEMAS, execute_tool

    llm = get_adapter()
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.format(**user_profile)},
        *(conversation_history or []),
        {"role": "user", "content": user_message},
    ]
    steps_log, tools_used = [], []

    for step in range(max_steps):
        response = llm.chat_with_tools(messages, TOOL_SCHEMAS)

        if not response["tool_calls"]:
            return {"answer": response["content"], "steps": steps_log, "tools_used": tools_used}

        messages.append({
            "role": "assistant",
            "content": response["content"],
            "tool_calls": [
                {"id": tc["id"], "type": "function",
                 "function": {"name": tc["name"], "arguments": json.dumps(tc["arguments"])}}
                for tc in response["tool_calls"]
            ],
        })

        for tc in response["tool_calls"]:
            result = execute_tool(tc["name"], tc["arguments"])
            tools_used.append({"tool": tc["name"], "args": tc["arguments"]})
            steps_log.append(f"Step {step+1}: {tc['name']} → {str(result)[:120]}...")
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})

    # Force generate if max_steps exhausted
    messages.append({"role": "user", "content": "Summarize available information and answer."})
    final = llm.chat_with_tools(messages, [])
    return {"answer": final["content"], "steps": steps_log, "tools_used": tools_used}
