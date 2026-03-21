import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from backend.services.agent import run_agent
from backend.services.vision_service import identify_sign

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    user_profile: dict
    conversation_history: list[dict] = []


class VisionRequest(BaseModel):
    image_b64: str


@router.post("/api/chat")
async def chat(req: ChatRequest):
    result = await run_agent(
        user_message=req.message,
        user_profile=req.user_profile,
        conversation_history=req.conversation_history,
    )
    return {
        "answer": result["answer"],
        "sources": result["sources"],
        "debug": {"steps": result["steps"], "tools_used": result["tools_used"]},
    }


@router.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    queue: asyncio.Queue = asyncio.Queue()

    async def _run():
        try:
            result = await run_agent(
                user_message=req.message,
                user_profile=req.user_profile,
                conversation_history=req.conversation_history,
                on_event=lambda e: queue.put_nowait(e),
            )
            await queue.put({"type": "done", "answer": result["answer"], "sources": result["sources"]})
        except Exception as exc:
            await queue.put({"type": "error", "message": str(exc)})
        finally:
            await queue.put(None)  # sentinel

    async def _generate():
        asyncio.create_task(_run())
        while True:
            event = await queue.get()
            if event is None:
                break
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        _generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/api/vision")
async def vision(req: VisionRequest):
    result = identify_sign(req.image_b64)
    if result is None:
        return {"code": None, "name": None, "meaning": None}
    return result
