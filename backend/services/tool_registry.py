from backend.services.rag_service import retrieve
from backend.services.web_search_service import web_search as _web_search
from backend.services.tinyfish_service import tinyfish_scrape
from backend.data.constants import FINES, EMBASSY_CONTACTS, lookup_fine as _lookup_fine
from backend.data.emergency import EMERGENCY_SCRIPTS

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
                              "description": (
                                  "Write the query in VIETNAMESE for official government results. "
                                  "Use site: operator for trusted sources. Examples: "
                                  "'quy định nhập khẩu thuốc lá điện tử Việt Nam site:thuvienphapluat.vn', "
                                  "'xử phạt vi phạm giao thông 2024 site:thuvienphapluat.vn', "
                                  "'quy định drone flycam Việt Nam 2025 site:vbpl.vn'"
                              )},
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


def execute_tool(name: str, args: dict) -> str:
    if name == "retrieve_law":
        chunks = retrieve(
            query=args["query"],
            category=args.get("category"),
            n=int(args.get("n_results", 3)),
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
