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
    Send the image to GPT vision and return sign metadata.
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
    logger.info("[VISION] GPT raw response: %s", raw[:300])

    try:
        data = json.loads(raw)
    except Exception:
        logger.warning("[VISION] Failed to parse JSON: %s", raw[:300])
        return None

    if not data.get("code"):
        logger.info("[VISION] No traffic sign detected.")
        return None

    return data
