import logging

from .foursquare_service import get_nearby_places
from .rag_service import retrieve
from .web_search_service import web_search
from .push_service import send_push
from .llm_adapter import get_adapter

logger = logging.getLogger(__name__)

BRIEFING_SYSTEM = """You are TripGuard's morning briefing assistant.
Generate a concise, friendly morning briefing for a tourist in Vietnam.

Structure (keep it short — this is a push notification):
1. 📍 Where you are: [area name if known]
2. 🏛️ Top spots nearby: list {places}
3. ⚖️ Legal reminders for this area: key rules from context
4. ⚠️ Special alerts: drone zones, photo restrictions, etc.

Keep total length under 300 words. Respond in the user's language: {language}.
Do NOT include generic tourism advice — only specific, actionable info."""


def _reverse_geocode_approx(lat: float, lng: float) -> str:
    """Best-effort area name without API call."""
    AREAS = [
        ((15.95, 108.15), (16.10, 108.30), "Hoi An"),
        ((10.70, 106.60), (10.90, 106.80), "Ho Chi Minh City"),
        ((21.00, 105.80), (21.10, 105.90), "Hanoi Old Quarter"),
        ((20.80, 106.95), (21.05, 107.20), "Ha Long Bay"),
        ((16.40, 107.55), (16.55, 107.70), "Hue"),
        ((10.90, 107.05), (11.10, 107.25), "Vung Tau"),
    ]
    for (lat_min, lng_min), (lat_max, lng_max), name in AREAS:
        if lat_min <= lat <= lat_max and lng_min <= lng <= lng_max:
            return name
    return f"Vietnam ({lat:.2f}, {lng:.2f})"


async def generate_and_send_briefing(
    user_id: str,
    lat: float,
    lng: float,
    user_profile: dict,
    push_token: str,
):
    llm = get_adapter()
    location_name = _reverse_geocode_approx(lat, lng)

    # 1. Nearby places (Foursquare) — silent on failure
    places = get_nearby_places(lat, lng)
    places_text = (
        "\n".join(f"- {p['name']} ({p['category']}, {p['distance_m']}m)" for p in places)
        or "No nearby tourist spots found."
    )

    # 2. Legal context for this area (ChromaDB)
    law_chunks = retrieve(f"tourist rules regulations Vietnam {location_name}", n=3)
    law_context = "\n---\n".join(law_chunks) if law_chunks else "No specific provisions found."

    # 3. Special alerts via web search (drone zones, restricted areas)
    alerts_raw = web_search(
        f"drone ban photo restriction tourist warning {location_name} Vietnam 2025",
        max_results=3,
    )

    # 4. LLM synthesize briefing
    try:
        response = llm.chat_with_tools(
            messages=[
                {
                    "role": "system",
                    "content": BRIEFING_SYSTEM.format(
                        places=places_text,
                        language=user_profile.get("language", "English"),
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Location: {location_name} ({lat}, {lng})\n"
                        f"User: {user_profile.get('nationality')}, "
                        f"has drone: {user_profile.get('has_drone')}\n\n"
                        f"Legal context:\n{law_context}\n\n"
                        f"Web alerts:\n{alerts_raw}"
                    ),
                },
            ],
            tools=[],  # No tool calls in briefing — just synthesize
        )
        briefing_text = response["content"]
    except Exception as e:
        logger.error("[BRIEFING] LLM error: %s", e)
        briefing_text = (
            f"Good morning! You're in {location_name}. "
            "Check TripGuard for local legal tips before exploring today."
        )

    # 5. Send push notification
    await send_push(
        token=push_token,
        title="Good morning from TripGuard 🌅",
        body=briefing_text[:150] + ("..." if len(briefing_text) > 150 else ""),
        data={"full_briefing": briefing_text, "lat": lat, "lng": lng},
    )

    logger.info("[BRIEFING] Sent to user %s at %s", user_id, location_name)
