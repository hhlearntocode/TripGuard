import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm RAG only when local corpus retrieval is enabled.
    from backend.services.rag_service import _init, local_rag_disabled
    if not local_rag_disabled():
        _init()
    yield


app = FastAPI(title="TripGuard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.routers import chat as chat_router
from backend.routers import voice as voice_router
app.include_router(chat_router.router)
app.include_router(voice_router.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
