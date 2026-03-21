import json
import os

import httpx

ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1"


class ElevenLabsConfigError(RuntimeError):
    """Raised when required ElevenLabs configuration is missing."""


class ElevenLabsApiError(RuntimeError):
    """Raised when ElevenLabs returns an upstream error."""

    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def _get_api_key() -> str:
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        raise ElevenLabsConfigError("ELEVENLABS_API_KEY is not configured.")
    return api_key


def _extract_error_message(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text.strip() or "Unknown ElevenLabs error."

    if isinstance(payload, dict):
        detail = payload.get("detail") or payload.get("message") or payload.get("error")
        if isinstance(detail, dict):
            return detail.get("message") or json.dumps(detail, ensure_ascii=False)
        if isinstance(detail, list):
            return "; ".join(str(item) for item in detail)
        if detail:
            return str(detail)

    return json.dumps(payload, ensure_ascii=False)


def _raise_for_upstream_error(response: httpx.Response, action: str) -> None:
    if response.status_code < 400:
        return
    message = _extract_error_message(response)
    raise ElevenLabsApiError(
        f"ElevenLabs {action} failed with status {response.status_code}: {message}",
        status_code=response.status_code,
    )


async def create_single_use_token(token_type: str = "realtime_scribe") -> str:
    headers = {"xi-api-key": _get_api_key()}
    url = f"{ELEVENLABS_API_BASE}/single-use-token/{token_type}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, headers=headers)
    except httpx.HTTPError as exc:
        raise ElevenLabsApiError(f"ElevenLabs token request failed: {exc}") from exc

    _raise_for_upstream_error(response, "token request")

    try:
        payload = response.json()
    except ValueError as exc:
        raise ElevenLabsApiError("ElevenLabs token response was not valid JSON.") from exc

    token = payload.get("token") if isinstance(payload, dict) else None
    if not token:
        raise ElevenLabsApiError("ElevenLabs token response did not include a token.")
    return token
