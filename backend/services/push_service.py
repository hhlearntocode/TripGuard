import httpx

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(token: str, title: str, body: str, data: dict = None):
    """Send via Expo Push Notifications — free, no Firebase setup needed."""
    if not token or not token.startswith("ExponentPushToken"):
        return  # Invalid token, skip silently
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                EXPO_PUSH_URL,
                json={
                    "to": token,
                    "title": title,
                    "body": body,
                    "data": data or {},
                    "sound": "default",
                },
                timeout=10,
            )
    except Exception:
        pass  # Don't fail the main flow if push fails
