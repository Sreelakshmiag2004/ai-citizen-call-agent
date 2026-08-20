import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

from app.database.models import VALID_ROLES

# Deliberately not pydantic's EmailStr -- that requires the optional
# `email-validator` package, an extra dependency this project doesn't
# otherwise need. A pragmatic format check is enough here: the backend
# never sends mail, email is just this app's unique login identifier.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

VALID_STATUSES = {"PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"}
VALID_PRIORITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
VALID_DEPARTMENTS = {
    "Water",
    "Electricity",
    "Roads",
    "Sanitation",
    "Healthcare",
    "Police",
    "Transport",
    "Municipal",
    "Disaster Management",
    "Other",
}


class ComplaintCreate(BaseModel):
    transcript: str = Field(..., description="Original transcript text")
    language: Optional[str] = Field("en", description="Transcript language")
    category: Optional[str] = Field("Other", description="Complaint category")
    department: Optional[str] = Field("Other", description="Assigned department")
    priority: Optional[str] = Field("MEDIUM", description="Complaint priority")
    summary: str = Field(..., description="Summary of the complaint")
    location: Optional[str] = Field(None, description="Location of issue")
    # Optional device GPS -- distinct from `location` above, which stays
    # the AI-extracted/reported place name and is unaffected by these.
    # Only ever sent by browser-submitted text/voice complaints where the
    # citizen explicitly opted in; absent/null for Twilio-originated ones.
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="Optional device GPS latitude")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="Optional device GPS longitude")
    location_accuracy_m: Optional[float] = Field(None, ge=0, description="Optional GPS accuracy radius in meters")
    keywords: Optional[List[str]] = Field(None, description="AI-extracted keywords")
    duplicate_status: Optional[str] = Field(
        "NEW", description="Duplicate status (NEW, RELATED, DUPLICATE)"
    )
    duplicate_of: Optional[str] = Field(None, description="ID of original complaint if duplicate")
    similarity_score: Optional[float] = Field(None, description="Similarity score if duplicate")
    complaint_id: Optional[str] = Field(
        None, description="Optional custom complaint ID (e.g. CMP-1001)"
    )


class StatusUpdateRequest(BaseModel):
    status: str = Field(..., description="New status value")


class TicketResponse(BaseModel):
    ticket_id: str
    complaint_id: str
    department: str
    priority: str
    status: str
    parent_ticket: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FeedbackSubmitRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="1-5 star rating")
    comment: Optional[str] = Field(None, max_length=2000, description="Optional free-text feedback")


class FeedbackResponse(BaseModel):
    complaint_id: str
    user_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComplaintResponse(BaseModel):
    complaint_id: str
    transcript: str
    language: str
    category: str
    department: str
    priority: str
    summary: str
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_accuracy_m: Optional[float] = None
    keywords: List[str] = Field(default_factory=list)
    status: str
    duplicate_status: str
    duplicate_of: Optional[str] = None
    similarity_score: Optional[float] = None
    report_count: int = 1
    sla_duration_hours: int = 24
    sla_deadline: Optional[datetime] = None
    sla_status: str = "ACTIVE"
    escalation_level: int = 0
    escalated_at: Optional[datetime] = None
    was_breached: bool = False
    created_at: datetime
    updated_at: datetime
    ticket: Optional[TicketResponse] = None
    feedback: Optional[FeedbackResponse] = None

    class Config:
        from_attributes = True


class StatusHistoryResponse(BaseModel):
    id: int
    complaint_id: str
    old_status: str
    new_status: str
    changed_at: datetime

    class Config:
        from_attributes = True


class ProcessAndCreateTicketResponse(BaseModel):
    complaint: Dict[str, Any]
    ticket: Dict[str, Any]
    duplicate: Dict[str, Any]


class SLAResponse(BaseModel):
    complaint_id: str
    ticket_id: Optional[str] = None
    priority: str
    sla_duration_hours: int
    created_at: datetime
    sla_deadline: datetime
    sla_status: str
    remaining_seconds: float
    remaining_hours: float
    escalation_level: int
    escalated_at: Optional[datetime] = None
    was_breached: bool = False


class SLASummaryResponse(BaseModel):
    total_active: int
    active: int
    at_risk: int
    breached: int
    completed: int


class SLABreachedItem(BaseModel):
    complaint_id: str
    ticket_id: Optional[str] = None
    department: str
    priority: str
    location: Optional[str] = None
    status: str
    sla_deadline: datetime
    escalation_level: int
    escalated_at: Optional[datetime] = None


class SLAAtRiskItem(BaseModel):
    complaint_id: str
    ticket_id: Optional[str] = None
    department: str
    priority: str
    location: Optional[str] = None
    status: str
    sla_deadline: datetime
    remaining_hours: float


# ----------------------------------------------------------------------------
# Authentication / authorization
# ----------------------------------------------------------------------------


class UserRegisterRequest(BaseModel):
    """Public self-registration. Deliberately has NO `role` field -- every
    self-registered account is a citizen. Officer/call-center/admin
    accounts can only be created by an existing admin via
    POST /auth/users, so privilege can never be granted by an
    unauthenticated request."""

    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=32)

    @field_validator("email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address.")
        return v


class AdminCreateUserRequest(UserRegisterRequest):
    """Admin-only: same shape as self-registration but with a required
    role, so staff accounts (officer/call-center/admin) can be provisioned
    without opening that up to public registration."""

    role: str = Field(..., description="citizen | call-center | officer | admin")

    @field_validator("role")
    @classmethod
    def _valid_role(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in VALID_ROLES:
            raise ValueError(f"role must be one of {sorted(VALID_ROLES)}")
        return v


class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserResponse


# ----------------------------------------------------------------------------
# Notifications (SLA escalation delivery -- see app/services/notification_service.py)
# ----------------------------------------------------------------------------


class NotificationResponse(BaseModel):
    id: int
    complaint_id: Optional[str] = None
    type: str
    escalation_level: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ----------------------------------------------------------------------------
# Chatbot (public RAG FAQ assistant -- see app/services/chatbot_service.py)
# ----------------------------------------------------------------------------


class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="The citizen's question for the GovPortal FAQ assistant.",
    )


class ChatResponse(BaseModel):
    reply: str = Field(..., description="The assistant's answer, grounded only in retrieved GovPortal knowledge.")
    sources: List[str] = Field(
        default_factory=list,
        description="Human-friendly titles of the knowledge documents the answer was grounded in (empty if none were sufficiently relevant).",
    )
