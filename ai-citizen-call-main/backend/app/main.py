import asyncio
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

from app.database.database import (
    Base,
    SessionLocal,
    engine,
    ensure_created_by_user_id_column,
    ensure_gps_columns,
    ensure_keywords_column,
)
from app.routes.analysis import router as analysis_router
from app.routes.analytics import router as analytics_router
from app.routes.auth import router as auth_router
from app.routes.chatbot import router as chatbot_router
from app.routes.complaints import router as complaints_router
from app.routes.duplicate import router as duplicate_router
from app.routes.notifications import router as notifications_router
from app.routes.sla import router as sla_router
from app.routes.transcription import router as transcription_router
from app.routes.twilio import router as twilio_router
from app.services.user_service import seed_demo_users
from app.services.whisper_service import whisper_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _init_db() -> None:
    logger.info("Initializing SQLite database tables...")
    Base.metadata.create_all(bind=engine)
    ensure_keywords_column()
    ensure_created_by_user_id_column()
    ensure_gps_columns()
    db = SessionLocal()
    try:
        seed_demo_users(db)
    finally:
        db.close()
    logger.info("Database tables initialized successfully.")


def _load_whisper_model() -> None:
    _ = whisper_service.model
    logger.info("Whisper model loaded and ready.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_db()
    logger.info("Loading Whisper model in background...")
    asyncio.create_task(asyncio.to_thread(_load_whisper_model))
    yield


app = FastAPI(
    title="AI Citizen Call Intelligence Platform API",
    description="Multilingual Speech-to-Text, LLM Complaint Analysis, Semantic Duplicate Detection, Ticket Management, and SLA Escalation API.",
    lifespan=lifespan,
)

# Dev-only CORS: allow the local Vite frontend to call this API.
# Only the specific local dev origin is allowed -- not a wildcard. Port
# 3000 is the govportal-citizen-assistant frontend (its package.json pins
# `vite --port=3000`) -- the only frontend in this repo since `frontend/`
# (which used Vite's 5173 default) was removed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chatbot_router)
app.include_router(transcription_router)
app.include_router(analysis_router)
app.include_router(duplicate_router)
app.include_router(complaints_router)
app.include_router(notifications_router)
app.include_router(sla_router)
app.include_router(analytics_router)
app.include_router(twilio_router)


@app.get("/")
def home():
    return {"message": "Multilingual STT API is running"}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logging.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )
