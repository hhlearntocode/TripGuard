from fastapi import APIRouter
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


@router.post("/api/vision")
async def vision(req: VisionRequest):
    result = identify_sign(req.image_b64)
    if result is None:
        return {"code": None, "name": None, "meaning": None}
    return result
