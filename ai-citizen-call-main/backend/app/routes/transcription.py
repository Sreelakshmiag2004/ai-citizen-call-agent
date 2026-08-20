import asyncio
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.rate_limit import ai_rate_limit
from app.database.models import User
from app.services.audio_validation import validate_and_read_audio_file
from app.services.providers.exceptions import LLMQuotaExceededError, LLMUnavailableError
from app.services.whisper_service import whisper_service

logger = logging.getLogger(__name__)

router = APIRouter()

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BACKEND_DIR / "uploads"


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), current_user: User = Depends(ai_rate_limit)):
    # Validates filename/extension/size/content BEFORE anything derived
    # from the (possibly absent/malicious) filename is touched.
    contents = await validate_and_read_audio_file(file)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_filename = Path(file.filename).name
    file_path = UPLOAD_DIR / safe_filename

    try:
        file_path.write_bytes(contents)

        result = await asyncio.to_thread(whisper_service.transcribe, str(file_path))

        return {
            "filename": safe_filename,
            "language": result["language"],
            "language_probability": result["language_probability"],
            "transcript": result["transcript"],
            "segments": result["segments"],
        }
    except HTTPException:
        raise
    # Only reachable when STT_PROVIDER=groq (local faster-whisper never
    # raises these) -- mirrors the same 429/503 mapping
    # app/routes/analysis.py already uses for LLM analysis errors, so a
    # Groq outage/quota limit is reported precisely instead of a generic 500.
    except LLMQuotaExceededError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except LLMUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception:
        logger.exception("Transcription failed for file: %s", file.filename)
        raise HTTPException(
            status_code=500,
            detail=(
                "Transcription failed. Please ensure the audio file is valid "
                "and try again."
            ),
        )
    finally:
        if file_path.exists():
            file_path.unlink()
