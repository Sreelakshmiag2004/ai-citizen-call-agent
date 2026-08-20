import asyncio
import logging
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.auth.dependencies import STAFF_ROLES, assert_can_access_complaint, get_current_user, require_role
from app.core.rate_limit import ai_rate_limit
from app.database.database import get_db
from app.database.models import User
from app.database.schemas import ComplaintCreate, FeedbackSubmitRequest, StatusUpdateRequest
from app.services.analysis_service import analysis_service
from app.services.audio_validation import validate_and_read_audio_file
from app.services.complaint_service import complaint_service
from app.services.department_routing import department_routing_service
from app.services.duplicate_service import duplicate_service
from app.services.feedback_service import feedback_service
from app.services.providers.exceptions import LLMQuotaExceededError, LLMUnavailableError
from app.services.whisper_service import whisper_service

logger = logging.getLogger(__name__)

router = APIRouter()

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BACKEND_DIR / "uploads"


@router.post("/complaints")
async def create_complaint(
    request: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    if not request.transcript or not request.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is required.")

    if not request.summary or not request.summary.strip():
        raise HTTPException(status_code=400, detail="Summary is required.")

    try:
        cmp_obj, tkt_obj = complaint_service.create_complaint(
            db=db,
            transcript=request.transcript,
            summary=request.summary,
            category=request.category,
            department=request.department,
            priority=request.priority,
            location=request.location,
            keywords=request.keywords,
            language=request.language,
            duplicate_status=request.duplicate_status,
            duplicate_of=request.duplicate_of,
            similarity_score=request.similarity_score,
            requested_complaint_id=request.complaint_id,
            # Ownership always comes from the authenticated JWT identity,
            # never from the request body -- ComplaintCreate has no
            # created_by/user_id field a client could set.
            created_by_user_id=current_user.id,
        )
        return complaint_service.get_complaint_by_id(db, cmp_obj.complaint_id)
    except ValueError as ve:
        # e.g. a caller-supplied complaint_id that already exists.
        raise HTTPException(status_code=409, detail=str(ve))
    except Exception as e:
        logger.exception("Error creating complaint: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to create complaint: {str(e)}")


@router.get("/complaints")
async def list_complaints(
    department: Optional[str] = Query(None, description="Filter by department"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    location: Optional[str] = Query(None, description="Filter by location"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    try:
        # Citizens only ever see their own complaints; staff roles (call
        # center / officer / admin) see everything. This scoping is applied
        # server-side regardless of what filters the client sends.
        owner_filter = None if current_user.role in STAFF_ROLES else current_user.id
        return complaint_service.list_complaints(
            db=db,
            department=department,
            priority=priority,
            status=status,
            category=category,
            location=location,
            created_by_user_id=owner_filter,
        )
    except Exception as e:
        logger.exception("Error listing complaints: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to list complaints.")


@router.get("/complaints/{complaint_id}")
async def get_complaint(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    assert_can_access_complaint(db, current_user, complaint_id)
    res = complaint_service.get_complaint_by_id(db, complaint_id)
    if not res:
        raise HTTPException(
            status_code=404, detail=f"Complaint '{complaint_id}' not found."
        )
    return res


@router.patch("/complaints/{complaint_id}/status")
async def update_complaint_status(
    complaint_id: str,
    request: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("call-center", "officer", "admin")),
) -> Dict[str, Any]:
    if not request.status or not request.status.strip():
        raise HTTPException(status_code=400, detail="Status field is required.")

    try:
        updated = complaint_service.update_status(
            db=db, complaint_id=complaint_id, new_status=request.status
        )
        return updated
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error updating status for '%s': %s", complaint_id, str(e))
        raise HTTPException(status_code=500, detail="Failed to update complaint status.")


@router.get("/departments/{department}/complaints")
async def get_department_queue(
    department: str,
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("call-center", "officer", "admin")),
) -> List[Dict[str, Any]]:
    norm_dept = department_routing_service.normalize_department(department)
    try:
        return complaint_service.list_complaints(
            db=db, department=norm_dept, priority=priority, status=status
        )
    except Exception as e:
        logger.exception("Error querying department queue: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch department queue.")


@router.get("/complaints/{complaint_id}/history")
async def get_complaint_status_history(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    assert_can_access_complaint(db, current_user, complaint_id)
    cmp_res = complaint_service.get_complaint_by_id(db, complaint_id)
    if not cmp_res:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")
    return complaint_service.get_status_history(db, complaint_id)


@router.post("/complaints/{complaint_id}/feedback")
async def submit_complaint_feedback(
    complaint_id: str,
    request: FeedbackSubmitRequest,
    db: Session = Depends(get_db),
    # Citizen-only: staff must never be able to submit feedback on a
    # citizen's behalf. Combined with the ownership check below, this
    # matches requirement "only the appropriate citizen can submit
    # feedback for their complaint" -- identity/ownership always comes
    # from the validated JWT, never anything the client sends.
    current_user: User = Depends(require_role("citizen")),
) -> Dict[str, Any]:
    # Same not-found-for-both-cases pattern as every other ownership check
    # in this app (see assert_can_access_complaint) -- doesn't leak
    # whether a complaint exists to a citizen who doesn't own it. Safe to
    # reuse directly here: current_user.role is guaranteed "citizen" by
    # require_role above, so assert_can_access_complaint's staff-bypass
    # branch can never be reached through this route.
    assert_can_access_complaint(db, current_user, complaint_id)

    feedback, created = feedback_service.submit_feedback(
        db=db,
        complaint_id=complaint_id,
        user_id=current_user.id,
        rating=request.rating,
        comment=request.comment,
    )
    return {
        "complaint_id": feedback.complaint_id,
        "user_id": feedback.user_id,
        "rating": feedback.rating,
        "comment": feedback.comment,
        "created_at": feedback.created_at,
        "updated_at": feedback.updated_at,
        "created": created,
    }


@router.get("/complaints/{complaint_id}/feedback")
async def get_complaint_feedback(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    assert_can_access_complaint(db, current_user, complaint_id)
    feedback = feedback_service.get_feedback(db, complaint_id)
    if not feedback:
        raise HTTPException(status_code=404, detail=f"No feedback submitted for complaint '{complaint_id}'.")
    return {
        "complaint_id": feedback.complaint_id,
        "user_id": feedback.user_id,
        "rating": feedback.rating,
        "comment": feedback.comment,
        "created_at": feedback.created_at,
        "updated_at": feedback.updated_at,
    }


async def run_audio_pipeline(
    file_path: str,
    db: Session,
    call_sid: Optional[str] = None,
    recording_sid: Optional[str] = None,
    created_by_user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """The ONE existing audio-processing pipeline shared by every input
    source (browser upload today, Twilio phone calls in Module 8A).

    audio file -> Whisper -> LLM analysis -> duplicate detection ->
    complaint/ticket creation (which also assigns department + SLA).

    Do not duplicate this sequence elsewhere -- new input sources should
    call this function, not reimplement it.
    """
    # Step 1: STT (existing Whisper service, unchanged)
    stt_result = await asyncio.to_thread(whisper_service.transcribe, str(file_path))
    transcript = (stt_result.get("transcript") or "").strip()
    if not transcript:
        transcript = "Citizen call audio recorded."
    lang = stt_result.get("language", "en")

    # Step 2: LLM Analysis (existing analysis service, unchanged)
    analysis_result = await asyncio.to_thread(analysis_service.analyze_complaint, transcript)

    # Step 3: Semantic Duplicate Detection (existing ChromaDB service, unchanged)
    temp_cmp_id = f"CMP-{uuid.uuid4().hex[:8].upper()}"
    dup_input = {
        "complaint_id": temp_cmp_id,
        "transcript": transcript,
        "category": analysis_result.get("category", "Other"),
        "department": analysis_result.get("department", "Other"),
        "priority": analysis_result.get("priority", "MEDIUM"),
        "summary": analysis_result.get("summary", transcript),
        "location": analysis_result.get("location"),
        "call_sid": call_sid or "",
        "recording_sid": recording_sid or "",
    }
    dup_result = await asyncio.to_thread(duplicate_service.check_and_store_complaint, dup_input)

    dup_status = dup_result.get("status", "NEW")
    duplicate_of = dup_result.get("duplicate_of")
    similarity = dup_result.get("similarity", 0.0)
    temp_cmp_id = dup_result.get("complaint_id")

    # Step 4: Create SQLite Complaint & Ticket Record (existing service; this
    # also assigns department routing and the SLA deadline, same as before)
    cmp_obj, _tkt_obj = complaint_service.create_complaint(
        db=db,
        transcript=transcript,
        summary=analysis_result.get("summary", transcript),
        category=analysis_result.get("category", "Other"),
        department=analysis_result.get("department", "Other"),
        priority=analysis_result.get("priority", "MEDIUM"),
        location=analysis_result.get("location"),
        keywords=analysis_result.get("keywords"),
        language=lang,
        duplicate_status=dup_status,
        duplicate_of=duplicate_of,
        similarity_score=similarity,
        requested_complaint_id=temp_cmp_id,
        created_by_user_id=created_by_user_id,
    )

    return {
        "full_complaint": complaint_service.get_complaint_by_id(db, cmp_obj.complaint_id),
        "dup_status": dup_status,
        "duplicate_of": duplicate_of,
        "similarity": similarity,
    }


@router.post("/process-and-create-ticket")
async def process_and_create_ticket(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(ai_rate_limit),
) -> Dict[str, Any]:
    # Validates filename/extension/size/content BEFORE anything derived
    # from the (possibly absent/malicious) filename is touched.
    contents = await validate_and_read_audio_file(file)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_filename = Path(file.filename).name
    file_path = UPLOAD_DIR / safe_filename

    try:
        file_path.write_bytes(contents)

        pipeline_result = await run_audio_pipeline(str(file_path), db, created_by_user_id=current_user.id)
        full_complaint = pipeline_result["full_complaint"]

        return {
            "complaint": {
                "complaint_id": full_complaint["complaint_id"],
                "category": full_complaint["category"],
                "department": full_complaint["department"],
                "priority": full_complaint["priority"],
                "summary": full_complaint["summary"],
                "location": full_complaint["location"],
                "status": full_complaint["status"],
            },
            "ticket": {
                "ticket_id": full_complaint["ticket"]["ticket_id"] if full_complaint.get("ticket") else None,
                "department": full_complaint["department"],
                "priority": full_complaint["priority"],
                "status": full_complaint["status"],
            },
            "duplicate": {
                "status": pipeline_result["dup_status"],
                "duplicate_of": pipeline_result["duplicate_of"],
                "similarity": pipeline_result["similarity"],
            },
        }

    except HTTPException:
        raise
    # Same 429/503 mapping app/routes/analysis.py already uses for AI
    # provider errors -- previously missing here, so a Gemini/Groq quota
    # limit or outage reaching run_audio_pipeline() fell through to a
    # generic 500 instead of a precise status code. Fixed for both
    # providers, not just Groq, since they share this exact code path.
    except LLMQuotaExceededError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except LLMUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Processing complaint and creating ticket failed: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to process complaint audio and create ticket.",
        )
    finally:
        if file_path.exists():
            file_path.unlink()
