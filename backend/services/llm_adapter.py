import json
import os
from abc import ABC, abstractmethod


class LLMAdapter(ABC):
    @abstractmethod
    def chat_with_tools(self, messages: list[dict], tools: list[dict]) -> dict:
        """Returns: {"content": str, "tool_calls": [{"id", "name", "arguments"}]}"""
        ...


class OpenRouterAdapter(LLMAdapter):
    def __init__(self, model="qwen/qwen-2.5-72b-instruct"):
        from openai import OpenAI
        self.client = OpenAI(
            api_key=os.environ["OPENROUTER_API_KEY"],
            base_url="https://openrouter.ai/api/v1",
        )
        self.model = model

    def chat_with_tools(self, messages, tools):
        kwargs = {"model": self.model, "messages": messages, "temperature": 0.1}
        if tools:
            kwargs.update({"tools": tools, "tool_choice": "auto"})
        resp = self.client.chat.completions.create(**kwargs)
        msg = resp.choices[0].message
        return {
            "content": msg.content or "",
            "tool_calls": [
                {"id": tc.id, "name": tc.function.name,
                 "arguments": json.loads(tc.function.arguments)}
                for tc in (msg.tool_calls or [])
            ],
        }


class OllamaAdapter(LLMAdapter):
    """Requires tool-calling capable model: qwen2.5:72b, llama3.3:70b, llama3.1:70b"""
    def __init__(self, model=None):
        import ollama
        self.client = ollama
        self.model = model or os.getenv("OLLAMA_MODEL", "qwen2.5:72b")

    def chat_with_tools(self, messages, tools):
        kwargs = {"model": self.model, "messages": messages}
        if tools:
            kwargs["tools"] = tools
        resp = self.client.chat(**kwargs)
        msg = resp["message"]
        return {
            "content": msg.get("content", ""),
            "tool_calls": [
                {"id": f"call_{i}", "name": tc["function"]["name"],
                 "arguments": tc["function"]["arguments"]}
                for i, tc in enumerate(msg.get("tool_calls") or [])
            ],
        }


def get_adapter() -> LLMAdapter:
    """Switch provider via LLM_PROVIDER env var — no code changes needed."""
    provider = os.getenv("LLM_PROVIDER", "ollama")
    if provider == "openrouter":
        return OpenRouterAdapter(os.getenv("OPENROUTER_MODEL", "qwen/qwen-2.5-72b-instruct"))
    return OllamaAdapter()
