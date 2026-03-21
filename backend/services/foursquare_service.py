import os

import httpx

FSQ_URL = "https://api.foursquare.com/v3/places/nearby"

# Free-tier Pro fields — do NOT add fields outside this set
_FIELDS = "name,location,categories,distance"

# Landmarks (16000), Food & Drink (13000), Travel & Transportation (19000)
_TOURIST_CATEGORIES = "16000,13000,19000"


def get_nearby_places(lat: float, lng: float, limit: int = 5) -> list[dict]:
    """Return top N tourist spots near coordinates. Returns [] on any error."""
    api_key = os.getenv("FOURSQUARE_API_KEY", "")
    if not api_key:
        return []

    try:
        resp = httpx.get(
            FSQ_URL,
            headers={"Authorization": api_key, "Accept": "application/json"},
            params={
                "ll": f"{lat},{lng}",
                "categories": _TOURIST_CATEGORIES,
                "limit": limit,
                "fields": _FIELDS,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        places = []
        for r in data.get("results", []):
            places.append({
                "name": r.get("name", "Unknown"),
                "category": (
                    r["categories"][0]["name"] if r.get("categories") else "Place"
                ),
                "distance_m": r.get("distance"),
                "address": r.get("location", {}).get("formatted_address", ""),
            })
        return places

    except Exception:
        return []
