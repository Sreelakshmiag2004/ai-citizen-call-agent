"""Public GovPortal FAQ chatbot -- RAG over the chatbot_knowledge ChromaDB
collection (see app/services/chatbot_service.py), answered by Groq via
GroqChatProvider. Deliberately UNAUTHENTICATED by product decision (see
MASTER_TODO.md's Portal chatbot item): no `Depends(get_current_user)`
anywhere in this file. It answers general FAQ/procedure questions only --
it has no access to complaint or user data, and "track my complaint" is
explicitly a separate, future, authenticated capability, not implemented
here.
"""

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core.rate_limit import chatbot_rate_limit
from app.database.schemas import ChatRequest, ChatResponse
from app.services.chatbot_service import answer_question
from app.services.providers.exceptions import LLMQuotaExceededError, LLMUnavailableError

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chatbot/message", response_model=ChatResponse, dependencies=[Depends(chatbot_rate_limit)])
async def chatbot_message(request: ChatRequest) -> ChatResponse:
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message is required and cannot be empty.")

    try:
        # answer_question() does synchronous, blocking work (SentenceTransformer
        # embedding, a ChromaDB query, and a blocking Groq SDK call) -- run it
        # in a worker thread so it doesn't block the event loop for every
        # other concurrent request, matching the asyncio.to_thread pattern
        # every other AI-cost route already uses (see app/routes/transcription.py,
        # analysis.py, duplicate.py, complaints.py's run_audio_pipeline).
        result = await asyncio.to_thread(answer_question, request.message.strip())
        return ChatResponse(**result)
    except LLMQuotaExceededError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except LLMUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception:
        logger.exception("Chatbot message handling failed.")
        raise HTTPException(
            status_code=500,
            detail="Unable to answer that right now. Please try again later.",
        )
