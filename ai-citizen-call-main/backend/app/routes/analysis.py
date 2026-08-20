import asyncio
import logging
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.core.rate_limit import ai_rate_limit
from app.database.models import User
from app.services.analysis_service import (
    LLMQuotaExceededError,
    LLMUnavailableError,
    analysis_service,
)
from app.services.audio_validation import validate_and_read_audio_file
from app.services.whisper_service import whisper_service

logger = logging.getLogger(__name__)

router = APIRouter()

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BACKEND_DIR / "uploads"


class AnalyzeRequest(BaseModel):
    transcript: str = Field(..., description="Transcript text of the citizen complaint")


@router.post("/analyze")
async def analyze_transcript(
    request: AnalyzeRequest, current_user: User = Depends(ai_rate_limit)
) -> Dict[str, Any]:
    if not request.transcript or not request.transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Transcript is required and cannot be empty.",
        )

    try:
        result = await asyncio.to_thread(
            analysis_service.analyze_complaint, request.transcript
        )
        return result
    except LLMQuotaExceededError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except LLMUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=500, detail=str(re))
    except Exception:
        logger.exception("Unexpected error during transcript analysis")
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze complaint transcript.",
        )


@router.post("/process-complaint")
async def process_complaint(
    file: UploadFile = File(...), current_user: User = Depends(ai_rate_limit)
) -> Dict[str, Any]:
    # Validates filename/extension/size/content BEFORE anything derived
    # from the (possibly absent/malicious) filename is touched.
    contents = await validate_and_read_audio_file(file)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_filename = Path(file.filename).name
    file_path = UPLOAD_DIR / safe_filename

    try:
        file_path.write_bytes(contents)

        stt_result = await asyncio.to_thread(
            whisper_service.transcribe, str(file_path)
        )
        transcript = stt_result.get("transcript", "")

        analysis_result = await asyncio.to_thread(
            analysis_service.analyze_complaint, transcript
        )

        return {
            "filename": safe_filename,
            "language": stt_result["language"],
            "language_probability": stt_result["language_probability"],
            "transcript": transcript,
            "analysis": analysis_result,
        }
    except HTTPException:
        raise
    except LLMQuotaExceededError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except LLMUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=500, detail=str(re))
    except Exception:
        logger.exception("Processing complaint failed for file: %s", file.filename)
        raise HTTPException(
            status_code=500,
            detail="Processing complaint failed. Please ensure the audio file is valid and try again.",
        )
    finally:
        if file_path.exists():
            file_path.unlink()
