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
