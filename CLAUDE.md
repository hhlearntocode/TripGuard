# TripGuard — AI Legal Companion for Foreign Tourists

Real-time legal advisory chatbot for foreign tourists in Vietnam.
Core question: **"Can I do this here?"**

---

## Architecture Overview

```
[ChromaDB — đã sẵn sàng]          [Backend — FastAPI — Agentic RAG]
┌─────────────────────┐            ┌────────────────────────────────────────┐
│  6 collections      │            │                                        │
│  traffic / drone    │◀──────────▶│  Agent (ReAct loop)                   │
│  residence / customs│            │  ├── retrieve_law()   → ChromaDB      │
│  drug / heritage    │            │  ├── lookup_fine()    → constants.py  │
└─────────────────────┘            │  ├── get_emergency()  → emergency.py  │
                                   │  ├── web_search()     → Tavily API    │
[Embedding: BAAI/bge-m3]             │  └── scrape_url()     → TinyFish API  │
                                   │                                        │
                                   │  Fallback: Search → Scrape            │
                                   │  ChromaDB miss → Tavily → TinyFish    │
                                   └────────────────────────────────────────┘
```

**Principles:**
- ChromaDB is pre-ingested — backend only needs to query, no re-embedding needed
- Embedding model: `BAAI/bge-m3`
- LLM: provider-agnostic — swap via `LLM_PROVIDER` env var
- Fine amounts + emergency: **hardcoded** — never let LLM generate these
- Search→Scrape is **fallback only** when ChromaDB has insufficient results

---

## Stack

| Layer | Tool | Notes |
|-------|------|---------|
| Frontend | React Native (Expo) | Mobile-first |
| Backend | FastAPI | Python |
| Vector DB | ChromaDB (persistent) | **Ready** — copy into `backend/chroma_db/` |
| Embedding | `BAAI/bge-m3` | Multilingual, swap via `EMBEDDING_MODEL` env var |
| LLM text | OpenRouter or Ollama | Swap via `LLM_PROVIDER` env var |
| LLM vision | OpenRouter → `google/gemini-2.5-flash-preview` | Sign identification |
| Web search | Tavily API | Fallback when ChromaDB misses |
| Web scrape | TinyFish API | Runs after Tavily, extracts content from URL. Docs: https://docs.tinyfish.ai/ |

---

## Project Structure

```
tripguard/
├── backend/
│   ├── main.py
│   ├── routers/
│   │   ├── chat.py
│   │   └── location.py           # POST /api/location — daily briefing trigger
│   ├── services/
│   │   ├── agent.py              # ReAct loop — main entry point
│   │   ├── tool_registry.py      # Tool schemas + execute_tool()
│   │   ├── llm_adapter.py        # Provider-agnostic LLM wrapper
│   │   ├── rag_service.py        # ChromaDB retrieval — BAAI/bge-m3
│   │   ├── web_search_service.py # Tavily search
│   │   ├── tinyfish_service.py   # TinyFish scrape
│   │   ├── vision_service.py     # Sign identification
│   │   ├── location_service.py   # Haversine distance + SQLite location history
│   │   ├── foursquare_service.py # Nearby places (free tier, Pro endpoints)
│   │   ├── briefing_service.py   # Orchestrate daily briefing → push
│   │   └── push_service.py       # Expo Push Notifications
│   ├── data/
│   │   ├── constants.py          # FINES, IDP_VALIDITY, VISA_FREE_DAYS, EMBASSY_CONTACTS
│   │   └── emergency.py          # EMERGENCY_SCRIPTS (hardcoded, offline-safe)
│   ├── models/
│   │   └── user_location.py      # SQLite schema: user_id, lat, lng, recorded_at
│   ├── chroma_db/                # ← Copy pre-ingested ChromaDB here
│   └── tripguard.db              # SQLite — location history (auto-created)
│
└── frontend/
    └── app/
        ├── (tabs)/chat.tsx
        ├── (tabs)/checklist.tsx
        ├── (tabs)/emergency.tsx
        ├── onboarding/profile.tsx
        └── tasks/morning-briefing.ts  # Expo background fetch task
```

---

## Agent — ReAct Loop

File: `backend/services/agent.py`

```python
import json, os

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
    from .llm_adapter import get_adapter
    from .tool_registry import TOOL_SCHEMAS, execute_tool

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
```

---
## UI Reference

Before coding any screen, read the corresponding image in `docs/ui/`.
Images are the source of truth for layout, spacing, and color — do not invent UI.

| Screen | File |
|--------|------|
| Chat | `docs/ui/chatbox_layout.jpg` |
| Layout | `docs/ui/layout.png` |
| UI | `docs/ui/io.jpeg` |
For other screens not listed, extrapolate from the reference images above to maintain visual consistency.

When implementing a screen:
1. Read the corresponding reference image
2. In the plan, list the components to be created based on the image
3. Match spacing, color, and layout as closely as possible

## Tool Registry

File: `backend/services/tool_registry.py`

### Tool Schemas

```python
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "retrieve_law",
            "description": (
                "Search Vietnamese law corpus for relevant legal provisions. "
                "Call BEFORE answering any legal question. "
                "Call multiple times with different categories for multi-domain queries."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string",
                              "description": "Search query in English or Vietnamese"},
                    "category": {"type": "string",
                                 "enum": ["traffic","drone","residence","customs","drug","heritage"],
                                 "description": "Omit if unsure — searches all collections"},
                    "n_results": {"type": "integer", "default": 3, "minimum": 1, "maximum": 5}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_fine",
            "description": "Get exact penalty amount from hardcoded table. MUST use instead of self-generating numbers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "violation": {
                        "type": "string",
                        "enum": ["no_license","red_light","no_helmet",
                                 "alcohol_l1","alcohol_l2","alcohol_l3",
                                 "drone_no_permit_basic","drone_no_permit_serious",
                                 "visa_overstay_1_5d","visa_overstay_6_10d","visa_overstay_over_30d"]
                    },
                    "vehicle": {"type": "string", "enum": ["motorbike","car"]}
                },
                "required": ["violation"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_emergency_steps",
            "description": "Get step-by-step emergency guide. Works offline — use for crisis situations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scenario": {"type": "string",
                                 "enum": ["police_stop","visa_overstay",
                                          "drone_confiscated","drug_test_positive"]},
                    "nationality": {"type": "string"}
                },
                "required": ["scenario"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Search web for realtime info when retrieve_law() is insufficient. "
                "Returns list of URLs to scrape. "
                "Use for: law updates, exchange rates, no-fly zone updates, embassy info. "
                "Do NOT use if retrieve_law() already returned clear provisions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string",
                              "description": "Add 'Vietnam 2025' and law domain for best results"},
                    "max_results": {"type": "integer", "default": 5}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "scrape_url",
            "description": (
                "Scrape specific URL to extract legal content. "
                "Use after web_search() to extract content from selected URLs. "
                "Prefer trusted sources: thuvienphapluat.vn, moj.gov.vn, chinhphu.vn."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string"},
                    "goal": {"type": "string",
                             "description": "Describe exactly what to extract. Include JSON output schema."}
                },
                "required": ["url", "goal"]
            }
        }
    },
]
```

### Tool Executor

```python
from .rag_service import retrieve
from .web_search_service import web_search as _web_search
from .tinyfish_service import tinyfish_scrape
from ..data.constants import FINES, EMBASSY_CONTACTS, lookup_fine as _lookup_fine
from ..data.emergency import EMERGENCY_SCRIPTS


def execute_tool(name: str, args: dict) -> str:
    if name == "retrieve_law":
        chunks = retrieve(
            query=args["query"],
            category=args.get("category"),
            n=args.get("n_results", 3),
        )
        return "\n\n---\n\n".join(chunks) if chunks else "No relevant provisions found in corpus."

    elif name == "lookup_fine":
        fine = _lookup_fine(args["violation"], args.get("vehicle", "motorbike"))
        if not fine:
            return "No fine data for this violation."
        usd = 25_000
        extra = f" Additional: {fine['extra']}." if fine.get("extra") else ""
        return (f"{fine['min']:,}–{fine['max']:,} VND "
                f"(~${fine['min']//usd}–${fine['max']//usd} USD).{extra} "
                f"Source: {fine.get('source', 'NĐ 168/2024/NĐ-CP')}")

    elif name == "get_emergency_steps":
        script = EMERGENCY_SCRIPTS.get(args["scenario"])
        if not script:
            return "No emergency script for this scenario."
        steps = "\n".join(f"{i+1}. {s}" for i, s in enumerate(script["steps"]))
        embassy = EMBASSY_CONTACTS.get(args.get("nationality", ""), "Contact your country's embassy in Hanoi")
        hotlines = script.get("hotlines", {})
        return f"{script['title']}\n{steps}\nHotlines: {hotlines}\nEmbassy: {embassy}"

    elif name == "web_search":
        return _web_search(args["query"], args.get("max_results", 5))

    elif name == "scrape_url":
        return tinyfish_scrape(args["url"], args["goal"])

    return f"Unknown tool: {name}"
```

---

## LLM Adapter

File: `backend/services/llm_adapter.py`

```python
import json, os
from abc import ABC, abstractmethod


class LLMAdapter(ABC):
    @abstractmethod
    def chat_with_tools(self, messages: list[dict], tools: list[dict]) -> dict:
        """Returns: {"content": str, "tool_calls": [{"id", "name", "arguments"}]}"""
        ...


class OpenRouterAdapter(LLMAdapter):
    def __init__(self, model="meta-llama/llama-3.3-70b-instruct"):
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
        return OpenRouterAdapter(os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct"))
    return OllamaAdapter()
```

---

## RAG Service

File: `backend/services/rag_service.py`

> ChromaDB is pre-ingested — just load and query.
> Embedding model: `BAAI/bge-m3` — swap via `EMBEDDING_MODEL` env var, no logic changes needed.

```python
import os
from sentence_transformers import SentenceTransformer
import chromadb

# ── Swap embedding model here if needed ──
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")

_embedder = None
_col      = None

def _init():
    global _embedder, _col
    if _embedder is None:
        _embedder = SentenceTransformer(EMBEDDING_MODEL)  # CPU is sufficient at runtime
        _col = chromadb.PersistentClient("backend/chroma_db").get_collection("vietnam_laws")

KEYWORDS = {
    "traffic":   ["motorbike","license","idp","drunk","helmet","speed","ride","xe máy","bằng lái","giao thông"],
    "drone":     ["drone","dji","flycam","uav","fly","aerial","permit","bay","tàu bay"],
    "customs":   ["bring","import","export","declare","customs","vape","cigarette","currency","gold","hải quan"],
    "residence": ["visa","overstay","stay","expire","immigration","passport","cư trú","thị thực"],
    "heritage":  ["temple","relic","heritage","antique","artifact","hoi an","hue","cổ vật","di sản"],
    "drug":      ["drug","cannabis","marijuana","adderall","prescription","nightclub","ma túy","thuốc"],
}

def classify(query: str) -> str | None:
    q = query.lower()
    scores = {cat: sum(1 for k in kws if k in q) for cat, kws in KEYWORDS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else None

def retrieve(query: str, category: str = None, n: int = 3) -> list[str]:
    _init()
    cat = category or classify(query)
    vec = _embedder.encode(query).tolist()

    results = _col.query(
        query_embeddings=[vec],
        n_results=n,
        where={"category": cat} if cat else None,
        include=["documents", "distances"],
    )
    docs, dists = results["documents"][0], results["distances"][0]

    # Filter by confidence threshold
    chunks = [doc for doc, dist in zip(docs, dists) if 1 - dist >= 0.55]

    # Fallback: drop category filter if insufficient results
    if len(chunks) < 2:
        r2 = _col.query(query_embeddings=[vec], n_results=n, include=["documents"])
        chunks = r2["documents"][0]

    return chunks
```

---

## Web Search Service

File: `backend/services/web_search_service.py`

```python
import os
from tavily import TavilyClient

TRUSTED_DOMAINS = [
    "thuvienphapluat.vn", "moj.gov.vn", "chinhphu.vn",
    "vbpl.vn", "baochinhphu.vn", "vietnamplus.vn",
]

_client = None

def _get_client():
    global _client
    if _client is None:
        _client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])
    return _client


def web_search(query: str, max_results: int = 5) -> str:
    try:
        results = _get_client().search(query=query, max_results=max_results, search_depth="basic")
        if not results.get("results"):
            return "No results found."

        lines = []
        for i, r in enumerate(results["results"], 1):
            domain = r["url"].split("/")[2] if "//" in r["url"] else ""
            trusted = " ✓ trusted source" if any(d in domain for d in TRUSTED_DOMAINS) else ""
            lines.append(
                f"{i}. {r['title']}{trusted}\n"
                f"   URL: {r['url']}\n"
                f"   Summary: {r.get('content', '')[:150]}..."
            )
        return "\n\n".join(lines)

    except Exception as e:
        return f"Web search error: {str(e)}"
```

---

## TinyFish Scrape Service

File: `backend/services/tinyfish_service.py`

```python
import os
import httpx

TINYFISH_API_KEY = os.environ["TINYFISH_API_KEY"]
TINYFISH_URL     = "https://agent.tinyfish.ai/v1/automation/run"

BLOCKED_DOMAINS = ["facebook.com", "tiktok.com", "youtube.com", "instagram.com"]


def tinyfish_scrape(url: str, goal: str, timeout: int = 25) -> str:
    domain = url.split("/")[2] if "//" in url else ""
    if any(b in domain for b in BLOCKED_DOMAINS):
        return f"Domain {domain} is not allowed."

    # Ensure structured output
    if "json" not in goal.lower():
        goal += '\nReturn JSON: {"content": "extracted text", "source": "law/article if found"}'

    try:
        resp = httpx.post(
            TINYFISH_URL,
            headers={"X-API-Key": TINYFISH_API_KEY},
            json={"url": url, "goal": goal, "browser_profile": "lite"},
            timeout=timeout,
        )
        data = resp.json()

        if data.get("status") == "COMPLETED" and data.get("result"):
            result = data["result"]
            # Browser worked but goal failed
            if isinstance(result, dict) and result.get("status") == "failure":
                return f"Could not extract: {result.get('reason', 'unknown')}"
            return str(result)

        elif data.get("status") == "FAILED":
            err = data.get("error", {}).get("message", "")
            if any(w in err.lower() for w in ["blocked","denied","captcha"]):
                return _retry_stealth(url, goal, timeout)
            return f"Scrape failed: {err}"

        return "No result."

    except httpx.TimeoutException:
        return "Scrape timeout (>25s) — skipping this URL."
    except Exception as e:
        return f"Scrape error: {str(e)}"


def _retry_stealth(url: str, goal: str, timeout: int) -> str:
    try:
        resp = httpx.post(
            TINYFISH_URL,
            headers={"X-API-Key": TINYFISH_API_KEY},
            json={"url": url, "goal": goal, "browser_profile": "stealth"},
            timeout=timeout + 15,
        )
        data = resp.json()
        if data.get("status") == "COMPLETED":
            return str(data.get("result", "No result."))
        return "Stealth mode also failed."
    except Exception as e:
        return f"Stealth retry error: {str(e)}"
```

---

## Vision Service

File: `backend/services/vision_service.py`

```python
import os, json
from openai import OpenAI

_client = None

def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.environ["OPENROUTER_API_KEY"],
            base_url="https://openrouter.ai/api/v1",
        )
    return _client


def identify_sign(image_b64: str) -> dict | None:
    resp = _get_client().chat.completions.create(
        model="google/gemini-2.5-flash-preview",
        max_tokens=200,
        messages=[{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
            {"type": "text", "text": (
                "Vietnamese traffic sign (QCVN 41:2024). "
                "Respond ONLY valid JSON, no markdown: "
                '{"code":"P.102","name":"No Entry","category":"prohibition","meaning":"..."} '
                'If not a traffic sign: {"code":null}'
            )},
        ]}],
    )
    try:
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return None
```

---

## Hardcoded Constants

File: `backend/data/constants.py`

```python
FINES = {
    "traffic": {
        "motorbike": {
            "no_license":    {"min": 2_000_000,  "max": 4_000_000,  "extra": "7-day impound",
                              "source": "NĐ 168/2024/NĐ-CP Điều 5"},
            "red_light":     {"min": 4_000_000,  "max": 6_000_000,  "extra": None,
                              "source": "NĐ 168/2024/NĐ-CP"},
            "no_helmet":     {"min": 400_000,    "max": 600_000,    "extra": None,
                              "source": "NĐ 168/2024/NĐ-CP"},
            "alcohol_l1":    {"min": 2_000_000,  "max": 3_000_000,  "extra": "license suspended 10-12m",
                              "source": "NĐ 168/2024/NĐ-CP"},
            "alcohol_l2":    {"min": 6_000_000,  "max": 8_000_000,  "extra": "license suspended 16-18m",
                              "source": "NĐ 168/2024/NĐ-CP"},
            "alcohol_l3":    {"min": 10_000_000, "max": 14_000_000, "extra": "license suspended 22-24m",
                              "source": "NĐ 168/2024/NĐ-CP"},
        },
        "car": {
            "no_license":    {"min": 10_000_000, "max": 12_000_000, "extra": None,
                              "source": "NĐ 168/2024/NĐ-CP"},
            "red_light":     {"min": 18_000_000, "max": 20_000_000, "extra": "4 points deducted",
                              "source": "NĐ 168/2024/NĐ-CP"},
            "alcohol_l3":    {"min": 30_000_000, "max": 40_000_000, "extra": "license revoked",
                              "source": "NĐ 168/2024/NĐ-CP"},
        },
    },
    "drone": {
        "no_permit_basic":   {"min": 1_000_000,  "max": 2_000_000,  "extra": None,
                              "source": "NĐ 288/2025/NĐ-CP"},
        "no_permit_serious": {"min": 20_000_000, "max": 30_000_000, "extra": "device confiscated",
                              "source": "NĐ 288/2025/NĐ-CP"},
    },
    "visa": {
        "overstay_1_5d":     {"min": 500_000,    "max": 1_500_000,  "extra": None,
                              "source": "NĐ 07/2023/NĐ-CP"},
        "overstay_6_10d":    {"min": 1_500_000,  "max": 3_000_000,  "extra": None,
                              "source": "NĐ 07/2023/NĐ-CP"},
        "overstay_over_30d": {"min": 15_000_000, "max": 25_000_000, "extra": "deportation + 1-3yr ban",
                              "source": "NĐ 07/2023/NĐ-CP"},
    },
}

IDP_VALIDITY = {
    "valid_1968":   ["Germany","France","United Kingdom","Italy","Spain","Netherlands",
                     "Belgium","Poland","Czech Republic","Sweden","Norway","Finland",
                     "Denmark","Switzerland","Austria","Portugal","Russia","Ukraine"],
    "invalid_1949": ["United States","Australia","Canada","New Zealand","India"],
    "asean_valid":  ["Thailand","Philippines","Indonesia","Malaysia","Singapore",
                     "Cambodia","Laos","Myanmar","Brunei"],
    "bilateral":    ["Japan","South Korea"],
}

VISA_FREE_DAYS = {
    45: ["Germany","France","United Kingdom","Italy","Spain","Russia","Japan","South Korea",
         "Australia","Denmark","Sweden","Norway","Finland","Switzerland","Poland","Czech Republic"],
    30: ["Thailand","Malaysia","Singapore","Indonesia","Philippines"],
    0:  ["United States","Canada","India","China"],
}

EMBASSY_CONTACTS = {
    "United States":  "+84 24 3850 5000",
    "Germany":        "+84 24 3845 3836",
    "France":         "+84 24 3944 5700",
    "Australia":      "+84 24 3774 0100",
    "United Kingdom": "+84 24 3936 0500",
    "Japan":          "+84 24 3846 3000",
    "South Korea":    "+84 24 3831 5110",
}


def lookup_fine(violation: str, vehicle: str = "motorbike") -> dict | None:
    if violation.startswith("drone"):
        return FINES["drone"].get(violation)
    if violation.startswith("visa"):
        return FINES["visa"].get(violation)
    return FINES["traffic"].get(vehicle, {}).get(violation)
```

---

## Emergency Scripts

File: `backend/data/emergency.py`

```python
EMERGENCY_SCRIPTS = {
    "police_stop": {
        "title": "Police Stopped Me",
        "steps": [
            "Stay calm. Do NOT run or argue.",
            "Show passport + IDP (1968 Vienna Convention only — US/AU IDP is invalid in Vietnam).",
            "Ask for officer's badge number and violation code.",
            "Max fine for no motorbike license: 4,000,000 VND + 7-day impound.",
            "Request official receipt (biên lai) — do NOT hand cash informally.",
            "If detained >30 mins: demand embassy contact immediately.",
        ],
        "hotlines": {"Traffic Police": "1800 599 928", "Emergency": "113"},
    },
    "visa_overstay": {
        "title": "Visa Overstayed",
        "steps": [
            "Go to nearest Immigration Department (Phòng Quản lý XNC) immediately.",
            "Do NOT exit via Cambodia/Laos — adds illegal exit charges.",
            "Fine for 1–5 days overstay: 500,000–1,500,000 VND.",
            "Bring: passport, return flight ticket, cash for fine.",
        ],
        "hotlines": {"Immigration Hotline": "1900 0368"},
    },
    "drone_confiscated": {
        "title": "Drone Confiscated",
        "steps": [
            "Do NOT resist — cooperate fully with authorities.",
            "Demand written receipt listing device serial number.",
            "Max administrative fine: 20,000,000–30,000,000 VND (~$800–1,200 USD).",
            "Criminal charges possible if flew near military zone.",
            "Contact embassy for consular support with device recovery.",
        ],
        "hotlines": {"Ministry of Defense": "069 533 200"},
    },
    "drug_test_positive": {
        "title": "Drug Test Positive",
        "steps": [
            "Do NOT admit anything before speaking with your embassy.",
            "Request embassy contact immediately — this is your legal right.",
            "Do NOT sign any documents you cannot read in your language.",
            "Penalties: 2–20 years prison depending on substance and quantity.",
        ],
        "hotlines": {"Emergency": "113"},
    },
}
```

---

## FastAPI Router

File: `backend/routers/chat.py`

```python
from fastapi import APIRouter
from pydantic import BaseModel
from ..services.agent import run_agent

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    user_profile: dict
    conversation_history: list[dict] = []

@router.post("/api/chat")
async def chat(req: ChatRequest):
    result = await run_agent(
        user_message=req.message,
        user_profile=req.user_profile,
        conversation_history=req.conversation_history,
    )
    return {
        "answer": result["answer"],
        "debug": {"steps": result["steps"], "tools_used": result["tools_used"]},
    }
```

---

## Daily Briefing Feature

Push a morning briefing at 9:00 AM **only if user has moved >50km** from yesterday's 9 AM location.

### Architecture

```
[Frontend — Expo]                    [Backend — FastAPI]
┌──────────────────────┐             ┌──────────────────────────────────────┐
│ Background location  │  POST /api  │                                      │
│ task at 9 AM         │─────────── ▶│  1. Compare with yesterday's coords  │
│ (expo-task-manager)  │  /location  │  2. If distance > 50km:              │
│                      │             │     a. Foursquare nearby search       │
│ Expo Push token      │             │     b. retrieve_law() for area        │
│ stored on backend    │             │     c. web_search() special alerts    │
└──────────────────────┘             │     d. LLM synthesize briefing        │
                                     │     e. Send via Expo Push             │
                                     │  3. If distance ≤ 50km: do nothing   │
                                     └──────────────────────────────────────┘
```

### New Files

```
backend/
├── routers/
│   └── location.py              # POST /api/location — receive coords, trigger briefing
├── services/
│   ├── location_service.py      # Haversine distance, store last location in DB
│   ├── foursquare_service.py    # Nearby places via Foursquare Places API (free tier)
│   ├── briefing_service.py      # Orchestrate: places + legal + alerts → LLM → push
│   └── push_service.py          # Expo Push Notifications
└── models/
    └── user_location.py         # SQLite: user_id, lat, lng, recorded_at
```

### location_service.py

```python
import math, sqlite3
from datetime import datetime, timedelta

DB_PATH = "backend/tripguard.db"

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def get_yesterday_location(user_id: str) -> dict | None:
    """Get user's location recorded closest to 9 AM yesterday."""
    with sqlite3.connect(DB_PATH) as conn:
        yesterday_9am = (datetime.now().replace(hour=9, minute=0, second=0)
                         - timedelta(days=1)).isoformat()
        row = conn.execute(
            """SELECT lat, lng FROM user_locations
               WHERE user_id = ? AND recorded_at >= ?
               ORDER BY recorded_at ASC LIMIT 1""",
            (user_id, yesterday_9am)
        ).fetchone()
    return {"lat": row[0], "lng": row[1]} if row else None

def save_location(user_id: str, lat: float, lng: float):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO user_locations (user_id, lat, lng, recorded_at) VALUES (?, ?, ?, ?)",
            (user_id, lat, lng, datetime.now().isoformat())
        )

def should_send_briefing(user_id: str, lat: float, lng: float) -> bool:
    """Returns True only if user moved >50km since yesterday 9 AM."""
    yesterday = get_yesterday_location(user_id)
    if not yesterday:
        return True  # First time → always send
    dist = haversine_km(yesterday["lat"], yesterday["lng"], lat, lng)
    return dist > 50
```

### foursquare_service.py

```python
import os, httpx

FSQ_API_KEY = os.environ["FOURSQUARE_API_KEY"]
FSQ_URL     = "https://api.foursquare.com/v3/places/nearby"

# Free tier: 10,000 calls/month on Pro endpoints — Nearby Search is Pro
TOURIST_CATEGORIES = "16000,13000,19000"  # Landmarks, Food, Travel

def get_nearby_places(lat: float, lng: float, limit: int = 5) -> list[dict]:
    """Returns top N tourist spots near coordinates."""
    try:
        resp = httpx.get(
            FSQ_URL,
            headers={
                "Authorization": FSQ_API_KEY,
                "Accept": "application/json",
            },
            params={
                "ll": f"{lat},{lng}",
                "categories": TOURIST_CATEGORIES,
                "limit": limit,
                "fields": "name,location,categories,distance",  # Pro fields only — stay free
            },
            timeout=10,
        )
        data = resp.json()
        places = []
        for r in data.get("results", []):
            places.append({
                "name": r.get("name"),
                "category": r["categories"][0]["name"] if r.get("categories") else "Place",
                "distance_m": r.get("distance"),
                "address": r.get("location", {}).get("formatted_address", ""),
            })
        return places
    except Exception as e:
        return []
```

### briefing_service.py

```python
from .foursquare_service import get_nearby_places
from .rag_service import retrieve
from .web_search_service import web_search
from .push_service import send_push
from .llm_adapter import get_adapter

BRIEFING_SYSTEM = """You are TripGuard's morning briefing assistant.
Generate a concise, friendly morning briefing for a tourist in Vietnam.

Structure (keep it short — this is a push notification):
1. 📍 Where you are: [area name if known]
2. 🏛️ Top spots nearby: list {places}
3. ⚖️ Legal reminders for this area: key rules from context
4. ⚠️ Special alerts: drone zones, photo restrictions, etc.

Keep total length under 300 words. Respond in the user's language: {language}.
Do NOT include generic tourism advice — only specific, actionable info."""

async def generate_and_send_briefing(
    user_id: str,
    lat: float,
    lng: float,
    user_profile: dict,
    push_token: str,
):
    llm = get_adapter()

    # 1. Nearby places (Foursquare)
    places = get_nearby_places(lat, lng)
    places_text = "\n".join(
        f"- {p['name']} ({p['category']}, {p['distance_m']}m)" for p in places
    ) or "No nearby tourist spots found."

    # 2. Legal context for this area (ChromaDB)
    area_query = f"tourist rules regulations Vietnam {lat} {lng}"
    law_chunks = retrieve(area_query, n=3)
    law_context = "\n---\n".join(law_chunks) if law_chunks else ""

    # 3. Special alerts via web search (drone zones, restricted areas)
    location_name = _reverse_geocode_approx(lat, lng)
    alerts_raw = web_search(f"drone ban photo restriction tourist warning {location_name} Vietnam 2025", max_results=3)

    # 4. LLM synthesize
    response = llm.chat_with_tools(
        messages=[
            {"role": "system", "content": BRIEFING_SYSTEM.format(
                places=places_text,
                language=user_profile.get("language", "English"),
            )},
            {"role": "user", "content": f"""
Location: {location_name} ({lat}, {lng})
User: {user_profile.get('nationality')}, has drone: {user_profile.get('has_drone')}

Legal context:
{law_context}

Web alerts:
{alerts_raw}
"""}
        ],
        tools=[],  # No tool calls in briefing — just synthesize
    )

    briefing_text = response["content"]

    # 5. Send push notification
    await send_push(
        token=push_token,
        title="Good morning from TripGuard",
        body=briefing_text[:150] + "...",  # Preview
        data={"full_briefing": briefing_text, "lat": lat, "lng": lng},
    )

def _reverse_geocode_approx(lat: float, lng: float) -> str:
    """Best-effort area name without API call — expand as needed."""
    # Known Vietnam tourist areas (rough bounding boxes)
    AREAS = [
        ((15.95, 108.15), (16.10, 108.30), "Hoi An"),
        ((10.70, 106.60), (10.90, 106.80), "Ho Chi Minh City"),
        ((21.00, 105.80), (21.10, 105.90), "Hanoi Old Quarter"),
        ((20.80, 106.95), (21.05, 107.20), "Ha Long Bay"),
        ((16.40, 107.55), (16.55, 107.70), "Hue"),
        ((10.90, 107.05), (11.10, 107.25), "Vung Tau"),
    ]
    for (lat_min, lng_min), (lat_max, lng_max), name in AREAS:
        if lat_min <= lat <= lat_max and lng_min <= lng <= lng_max:
            return name
    return f"Vietnam ({lat:.2f}, {lng:.2f})"
```

### push_service.py

```python
import httpx

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

async def send_push(token: str, title: str, body: str, data: dict = None):
    """Send via Expo Push Notifications — free, no Firebase setup needed."""
    if not token.startswith("ExponentPushToken"):
        return  # Invalid token, skip silently
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                EXPO_PUSH_URL,
                json={
                    "to": token,
                    "title": title,
                    "body": body,
                    "data": data or {},
                    "sound": "default",
                },
                timeout=10,
            )
    except Exception:
        pass  # Don't fail the main flow if push fails
```

### Frontend — Background Task (React Native / Expo)

```typescript
// app/tasks/morning-briefing.ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

const TASK_NAME = 'MORNING_BRIEFING';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const now = new Date();
    // Only run between 8:55–9:05 AM
    if (now.getHours() !== 9 || now.getMinutes() > 5) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const pushToken = (await Notifications.getExpoPushTokenAsync()).data;
    const userProfile = await getUserProfile(); // from AsyncStorage

    await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userProfile.userId,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        push_token: pushToken,
        user_profile: userProfile,
      }),
    });

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBriefingTask() {
  await BackgroundFetch.registerTaskAsync(TASK_NAME, {
    minimumInterval: 60 * 60 * 8, // every 8 hours max — OS decides actual timing
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
```

### API Endpoint

```python
# backend/routers/location.py
from fastapi import APIRouter
from pydantic import BaseModel
from ..services.location_service import save_location, should_send_briefing
from ..services.briefing_service import generate_and_send_briefing

router = APIRouter()

class LocationPayload(BaseModel):
    user_id: str
    lat: float
    lng: float
    push_token: str
    user_profile: dict

@router.post("/api/location")
async def receive_location(payload: LocationPayload):
    save_location(payload.user_id, payload.lat, payload.lng)

    if should_send_briefing(payload.user_id, payload.lat, payload.lng):
        await generate_and_send_briefing(
            user_id=payload.user_id,
            lat=payload.lat,
            lng=payload.lng,
            user_profile=payload.user_profile,
            push_token=payload.push_token,
        )
        return {"briefing_sent": True}

    return {"briefing_sent": False, "reason": "Location unchanged (<50km)"}
```

### DB Schema (SQLite)

```sql
CREATE TABLE IF NOT EXISTS user_locations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    recorded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_time ON user_locations(user_id, recorded_at);
```

### Key Design Decisions

- **Expo Push (not Firebase)** — free, zero setup, works with Expo managed workflow
- **Foursquare free tier** — 10,000 calls/month, Nearby Search is Pro (free), no credit card needed for dev
- **Background fetch not guaranteed at exactly 9 AM** — iOS/Android OS may delay; acceptable for a briefing use case
- **Distance check on backend** — frontend just sends coordinates, backend decides whether to send. Prevents spam if user opens app multiple times
- **Briefing ≤300 words** — push notification preview is 150 chars, full content in notification data payload

---

## Environment Variables

```bash
# .env

# LLM provider — swap without changing code
LLM_PROVIDER=ollama                                    # or "openrouter"
OLLAMA_MODEL=qwen2.5:72b                               # better than llama3.3 for Vietnamese
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct

# Embedding model
EMBEDDING_MODEL=BAAI/bge-m3

# External APIs
TAVILY_API_KEY=tvly-...
TINYFISH_API_KEY=tf-...
OPENROUTER_API_KEY=sk-or-...    # also used for vision (Gemini Flash)
FOURSQUARE_API_KEY=fsq3...      # free tier: 10,000 calls/month

# Frontend
GOOGLE_MAPS_API_KEY=...
EXPO_PUBLIC_API_URL=http://localhost:8000
```

---

## Demo Script (5 min)

```
1. Onboarding  → "United States" + motorbike + DJI Mini 4 Pro

2. Checklist   → Pure logic, no API call:
                 ❌ US IDP (1949 Geneva) invalid in Vietnam
                 ❌ DJI Mini 4 Pro = 895g → requires permit + Vietnamese org sponsor
                 ❌ US citizens require e-visa (0 visa-free days)

3. Chat text   → "Can I ride a motorbike with my US license?"
                 retrieve_law(traffic) → lookup_fine(no_license) → ❌ + 2-4M VND

4. Chat text   → "I want to fly my drone and ride motorbike in Hoi An, what laws apply?"
                 retrieve_law(drone) → retrieve_law(traffic) → synthesizes both

5. Chat image  → Upload red circle sign photo
                 Vision API → P.102 No Entry + violation consequences

6. Emergency   → "Police stopped me"
                 get_emergency_steps() — 100% hardcoded, works offline
```

---

## Notes for Claude Code

### Planning — required before coding

For every task, Claude Code **must produce a full plan first, pause for confirmation, then begin writing any code.**

**Required plan format:**

```
## Plan

### Files to create/modify
- `path/to/file.py` — [purpose, what this file does]
- `path/to/file2.py` — [mục đích]
- (add more as needed)

### Steps
1. [bước cụ thể — tên file + action]
2. [bước cụ thể]
3. ...

### Assumptions
- [any assumptions being made — omit section if none]

---
Ready to proceed? (y/n)
```

**Mandatory rules:**
- After showing plan → **stop completely**, do not write code or create files
- Only continue after receiving explicit confirmation (y / yes / ok / go / proceed or equivalent)
- If user requests plan changes → update plan, display again, wait for confirmation again
- If during coding a significant scope change is needed → stop, notify user, wait for confirmation before continuing

### General notes

- `backend/chroma_db/` is ready — no re-ingestion needed, just copy into place
- Embedding model: `BAAI/bge-m3` — swap via `EMBEDDING_MODEL` env var in `rag_service.py`, no logic changes
- LLM provider swap via `LLM_PROVIDER` env var — `ollama` (default) or `openrouter`
- Fine amounts and emergency scripts **must** come from hardcoded constants — never let LLM generate them
- Search→Scrape is fallback only — agent decides when `retrieve_law()` has insufficient confidence
- Emergency mode must work **offline** — `get_emergency_steps()` calls no external APIs
- TinyFish `/run` (sync) timeout is 25s — on timeout, skip the URL, do not retry
- Daily briefing only triggers when `haversine_km() > 50` — backend enforces, frontend just sends coords
- Foursquare Nearby Search uses **Pro fields only** (`name, location, categories, distance`) — stays on free tier
- SQLite `tripguard.db` auto-created on first run — no migration needed
- Expo background fetch is **not guaranteed at exactly 9 AM** — OS may delay; acceptable for briefing use case
- UI UX Pro Max skill is active — run `design-system/MASTER.md` generation once before building any UI (see UI Reference section). Reference images in `docs/ui/` override the generated design system for layout decisions.
- `.gitignore`: `backend/chroma_db/`, `rag/`, `venv*/`, `.env`, `backend/tripguard.db`
