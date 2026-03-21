import os
import httpx

TINYFISH_API_KEY = os.environ.get("TINYFISH_API_KEY", "")
TINYFISH_URL     = "https://agent.tinyfish.ai/v1/automation/run"

BLOCKED_DOMAINS = ["facebook.com", "tiktok.com", "youtube.com", "instagram.com"]


def _build_legal_goal(user_goal: str) -> str:
    """
    Build a rich, structured goal for extracting Vietnamese legal content.
    Follows TinyFish best practices: objective + target + fields + schema + steps + guardrails + edge cases.
    """
    return f"""You are extracting Vietnamese legal content from an official government or legal database website.

OBJECTIVE:
{user_goal}

STEPS (follow in order):
1. If a cookie consent banner or popup appears, close or accept it before proceeding.
2. If the page requires login or shows a paywall, note this and stop — do not attempt to log in.
3. Locate the main legal document content on the page (law text, decree articles, regulations).
4. If the document is paginated or has a "Xem thêm" / "Tải về" button, click it to load the full content before extracting.
5. Extract ALL of the following fields from the page. Remember each value as you find it.
6. Return the result as a single JSON object with the schema below.

OUTPUT SCHEMA (return exactly this JSON structure, no extra text outside the JSON):
{{
  "document_title": "Full title of the law/decree/resolution in Vietnamese",
  "document_code": "Official code, e.g. NĐ 168/2024/NĐ-CP or Nghị quyết 98/2023/QH15",
  "issuing_authority": "Ministry or body that issued the document, e.g. Chính phủ, Quốc hội",
  "effective_date": "Date the law took effect, ISO format if possible",
  "relevant_articles": [
    {{
      "article_number": "Điều X",
      "article_title": "Title of the article if present",
      "content": "Full text of the article, verbatim in Vietnamese"
    }}
  ],
  "summary": "2–4 sentence plain-language summary of what this document regulates and the key penalties or rules",
  "source_url": "The URL of this page",
  "extraction_status": "success | partial | failed",
  "failure_reason": "null if success, otherwise explain what could not be extracted"
}}

GUARDRAILS:
- Do NOT click any purchase, subscription, or external link buttons.
- Do NOT navigate away from the current page except to expand collapsed content.
- Do NOT fill in any forms.
- If the page is entirely in Vietnamese, extract the Vietnamese text verbatim — do not translate.
- Stop after extracting the relevant articles — do not scrape the entire site.

EDGE CASES:
- If the page shows "Đăng nhập để xem" (login to view), set extraction_status to "failed" and failure_reason to "login required".
- If only partial content is visible, extract what is available and set extraction_status to "partial".
- If the document has more than 10 articles, extract only the articles most relevant to: {user_goal}
- If no legal document is found on the page (e.g. it's a news article), extract the article text in the "summary" field and set document_code to null."""


def tinyfish_scrape(url: str, goal: str, timeout: int = 60) -> str:
    domain = url.split("/")[2] if "//" in url else ""
    if any(b in domain for b in BLOCKED_DOMAINS):
        return f"Domain {domain} is not allowed."

    structured_goal = _build_legal_goal(goal)

    try:
        resp = httpx.post(
            TINYFISH_URL,
            headers={"X-API-Key": TINYFISH_API_KEY},
            json={
                "url": url,
                "goal": structured_goal,
                "browser_profile": "lite",
            },
            timeout=timeout,
        )
        data = resp.json()

        if data.get("status") == "COMPLETED" and data.get("result"):
            result = data["result"]
            if isinstance(result, dict):
                if result.get("extraction_status") == "failed":
                    reason = result.get("failure_reason", "unknown")
                    # Retry with stealth if it looks like a bot block
                    if any(w in str(reason).lower() for w in ["block", "captcha", "denied", "403"]):
                        return _retry_stealth(url, structured_goal, timeout)
                    return f"Could not extract: {reason}"
                return _format_result(result)
            # Plain string result
            if isinstance(result, str) and result.strip():
                return result
            return "No structured content returned."

        elif data.get("status") == "FAILED":
            err = data.get("error", {})
            msg = err.get("message", "") if isinstance(err, dict) else str(err)
            category = err.get("category", "") if isinstance(err, dict) else ""
            if any(w in msg.lower() for w in ["blocked", "denied", "captcha", "site_blocked"]):
                return _retry_stealth(url, structured_goal, timeout)
            if category == "BILLING_FAILURE":
                return "Scrape unavailable: billing issue with scraping service."
            return f"Scrape failed: {msg}"

        return "No result returned from scraping service."

    except httpx.TimeoutException:
        return f"Scrape timeout (>{timeout}s) — skipping this URL."
    except Exception as e:
        return f"Scrape error: {str(e)}"


def _format_result(result: dict) -> str:
    """Format structured legal extraction result into readable text for the agent."""
    parts = []

    if result.get("document_title"):
        parts.append(f"Document: {result['document_title']}")
    if result.get("document_code"):
        parts.append(f"Code: {result['document_code']}")
    if result.get("issuing_authority"):
        parts.append(f"Issued by: {result['issuing_authority']}")
    if result.get("effective_date"):
        parts.append(f"Effective: {result['effective_date']}")

    articles = result.get("relevant_articles", [])
    if articles:
        parts.append("\n--- RELEVANT ARTICLES ---")
        for art in articles:
            num = art.get("article_number", "")
            title = art.get("article_title", "")
            content = art.get("content", "")
            header = f"{num} — {title}" if title else num
            parts.append(f"\n{header}\n{content}")

    if result.get("summary"):
        parts.append(f"\nSummary: {result['summary']}")
    if result.get("source_url"):
        parts.append(f"Source URL: {result['source_url']}")

    return "\n".join(parts) if parts else str(result)


def _retry_stealth(url: str, goal: str, timeout: int) -> str:
    try:
        resp = httpx.post(
            TINYFISH_URL,
            headers={"X-API-Key": TINYFISH_API_KEY},
            json={
                "url": url,
                "goal": goal,
                "browser_profile": "stealth",
                "proxy_config": {"enabled": True, "country_code": "US"},
            },
            timeout=timeout + 30,
        )
        data = resp.json()
        if data.get("status") == "COMPLETED" and data.get("result"):
            result = data["result"]
            if isinstance(result, dict):
                return _format_result(result)
            return str(result)
        return "Stealth mode also failed to extract content."
    except Exception as e:
        return f"Stealth retry error: {str(e)}"
