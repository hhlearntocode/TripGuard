from fastapi import APIRouter, HTTPException

from backend.services.elevenlabs_service import (
    ElevenLabsApiError,
    ElevenLabsConfigError,
    create_single_use_token,
)

router = APIRouter()


def _translate_voice_error(exc: Exception) -> HTTPException:
    if isinstance(exc, ElevenLabsConfigError):
        return HTTPException(status_code=500, detail=str(exc))
    if isinstance(exc, ElevenLabsApiError):
        return HTTPException(status_code=exc.status_code, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=422, detail=str(exc))
    return HTTPException(status_code=500, detail="Unexpected voice service error.")


@router.post("/api/voice/scribe-token")
async def get_scribe_token():
    try:
        token = await create_single_use_token("realtime_scribe")
    except Exception as exc:  # pragma: no cover - routed through tests
        raise _translate_voice_error(exc) from exc
    return {"token": token}
