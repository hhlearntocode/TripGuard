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
