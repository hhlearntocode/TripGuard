import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm RAG service on startup
    from backend.services.rag_service import _init
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
app.include_router(chat_router.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
