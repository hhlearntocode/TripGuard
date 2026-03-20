import os
import httpx

TINYFISH_API_KEY = os.environ.get("TINYFISH_API_KEY", "")
TINYFISH_URL     = "https://agent.tinyfish.ai/v1/automation/run"

BLOCKED_DOMAINS = ["facebook.com", "tiktok.com", "youtube.com", "instagram.com"]


def tinyfish_scrape(url: str, goal: str, timeout: int = 25) -> str:
    domain = url.split("/")[2] if "//" in url else ""
    if any(b in domain for b in BLOCKED_DOMAINS):
        return f"Domain {domain} is not allowed."

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
