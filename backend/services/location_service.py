import math
import sqlite3
from datetime import datetime, timedelta

DB_PATH = "backend/tripguard.db"


def _init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_locations (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     TEXT NOT NULL,
                lat         REAL NOT NULL,
                lng         REAL NOT NULL,
                recorded_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_time
            ON user_locations(user_id, recorded_at)
        """)


_init_db()


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def get_yesterday_location(user_id: str) -> dict | None:
    """Return user's location recorded closest to 9 AM yesterday."""
    yesterday_9am = (
        datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
        - timedelta(days=1)
    ).isoformat()
    try:
        with sqlite3.connect(DB_PATH) as conn:
            row = conn.execute(
                """SELECT lat, lng FROM user_locations
                   WHERE user_id = ? AND recorded_at >= ?
                   ORDER BY recorded_at ASC LIMIT 1""",
                (user_id, yesterday_9am),
            ).fetchone()
        return {"lat": row[0], "lng": row[1]} if row else None
    except Exception:
        return None


def save_location(user_id: str, lat: float, lng: float):
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute(
                "INSERT INTO user_locations (user_id, lat, lng, recorded_at) VALUES (?, ?, ?, ?)",
                (user_id, lat, lng, datetime.now().isoformat()),
            )
    except Exception:
        pass


def should_send_briefing(user_id: str, lat: float, lng: float) -> bool:
    """Return True only if user moved >50 km since yesterday 9 AM."""
    yesterday = get_yesterday_location(user_id)
    if not yesterday:
        return True  # First-time user → always send
    dist = haversine_km(yesterday["lat"], yesterday["lng"], lat, lng)
    return dist > 50
