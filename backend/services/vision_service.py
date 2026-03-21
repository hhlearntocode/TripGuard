import json
import logging
import os

from openai import OpenAI

logger = logging.getLogger(__name__)

VISION_MODEL = os.getenv("VISION_MODEL", "gpt-4o-mini")

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


def identify_sign(image_b64: str) -> dict | None:
    """
    Identify a Vietnamese traffic sign in the image.
    Returns {code, name, category, meaning} or None if no traffic sign detected.
    """
    resp = _get_client().chat.completions.create(
        model=VISION_MODEL,
        max_tokens=200,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
                },
                {
                    "type": "text",
                    "text": (
                        "Look at this image. If it contains a Vietnamese traffic sign "
                        "(QCVN 41:2024), respond ONLY with valid JSON — no markdown, no explanation:\n"
                        '{"code":"P.102","name":"No Entry","category":"prohibition",'
                        '"meaning":"Short plain-English meaning of the sign"}\n'
                        "Use the official sign code from QCVN 41:2024. "
                        "If the image does not contain a recognisable Vietnamese traffic sign, "
                        'respond exactly: {"code":null}'
                    ),
                },
            ],
        }],
    )

    raw = resp.choices[0].message.content or ""
    logger.info("[VISION] identify_sign raw: %s", raw[:300])

    try:
        data = json.loads(raw)
    except Exception:
        logger.warning("[VISION] Failed to parse JSON: %s", raw[:300])
        return None

    if not data.get("code"):
        return None

    return data


def analyze_image(image_b64: str) -> dict:
    """
    General-purpose image analysis for any user-uploaded photo.

    Single GPT call that handles two cases:
      - Vietnamese traffic sign  → {type:"sign", code, name, category, meaning}
      - Any other object/scene  → {type:"object", description, law_relevance}

    The description is injected into the chat so the agent knows what the
    user is asking about (vape, drug, passport, vehicle, food, etc.).
    """
    resp = _get_client().chat.completions.create(
        model=VISION_MODEL,
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
                },
                {
                    "type": "text",
                    "text": (
                        "You are helping a foreign tourist understand Vietnamese law. "
                        "Analyze this image and respond ONLY with valid JSON — no markdown.\n\n"
                        "CASE 1 — if the image contains a Vietnamese traffic sign (QCVN 41:2024):\n"
                        '{"type":"sign","code":"P.102","name":"No Entry","category":"prohibition",'
                        '"meaning":"vehicles may not enter"}\n\n'
                        "CASE 2 — if the image contains anything else:\n"
                        '{"type":"object","description":"a vape device / e-cigarette",'
                        '"law_relevance":"customs, import ban"}\n\n'
                        "For CASE 2, description should be a short noun phrase (1 sentence max). "
                        "law_relevance should name the legal domain: "
                        "customs, traffic, drug, drone, heritage, residence, or general.\n"
                        "If the image is completely unclear or blank: "
                        '{"type":"unknown"}'
                    ),
                },
            ],
        }],
    )

    raw = resp.choices[0].message.content or ""
    logger.info("[VISION] analyze_image raw: %s", raw[:300])

    try:
        data = json.loads(raw)
    except Exception:
        logger.warning("[VISION] Failed to parse analyze_image JSON: %s", raw[:300])
        return {"type": "unknown"}

    return data
