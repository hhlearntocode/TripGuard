import os
import json
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
        model="google/gemini-2.5-flash",
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
