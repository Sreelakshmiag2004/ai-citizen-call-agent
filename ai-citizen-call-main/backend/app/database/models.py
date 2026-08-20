from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database.database import Base

# Keep in sync with the frontend's `PortalType`
# (govportal-citizen-assistant/src/types/index.ts) -- these are the only
# four roles the RBAC dependencies in app/auth/dependencies.py recognize.
VALID_ROLES = {"citizen", "call-center", "officer", "admin"}


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="citizen")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(String, unique=True, index=True, nullable=False)
    transcript = Column(Text, nullable=False)
    language = Column(String, default="en")
    category = Column(String, nullable=False)
    department = Column(String, nullable=False)
    priority = Column(String, default="MEDIUM")
    summary = Column(Text, nullable=False)
    location = Column(String, nullable=True)
    keywords = Column(Text, nullable=True)  # JSON-encoded list[str] from Module 2 analysis
    status = Column(String, default="PENDING", nullable=False)
    # Which authenticated user submitted this complaint (nullable so the 3
    # pre-existing rows from before authentication existed, and complaints
    # created by call-center/officer/admin on a citizen's behalf, remain
    # valid). No FK constraint -- consistent with how the rest of this
    # table already references other rows by plain string ID (duplicate_of)
    # rather than a SQL foreign key. Used to scope a citizen's "my
    # complaints" view server-side; see require_owner_or_staff() in
    # app/auth/dependencies.py.
    created_by_user_id = Column(Integer, nullable=True, index=True)
    duplicate_status = Column(String, default="NEW", nullable=False)
    duplicate_of = Column(String, nullable=True)
    similarity_score = Column(Float, nullable=True)
    sla_duration_hours = Column(Integer, default=24, nullable=False)
    sla_deadline = Column(DateTime, nullable=False)
    sla_status = Column(String, default="ACTIVE", nullable=False)
    escalation_level = Column(Integer, default=0, nullable=False)
    escalated_at = Column(DateTime, nullable=True)
    was_breached = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    ticket = relationship("Ticket", back_populates="complaint", uselist=False)


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(String, unique=True, index=True, nullable=False)
    complaint_id = Column(
        String, ForeignKey("complaints.complaint_id"), nullable=False
    )
    department = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    status = Column(String, default="PENDING", nullable=False)
    parent_ticket = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    complaint = relationship("Complaint", back_populates="ticket")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(String, nullable=False)
    old_status = Column(String, nullable=False)
    new_status = Column(String, nullable=False)
    changed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Notification(Base):
    """Persistent, per-recipient in-app notification. Currently only
    populated by SLA at-risk/breach escalation events (see
    app/services/notification_service.py) -- see MASTER_TODO.md's "SLA
    breach/escalation has no actual delivery mechanism" item. Deliberately
    fanned out at write-time (one row per recipient) rather than a
    role-broadcast row with separate read-receipts, since that would be
    more infrastructure than this project needs.
    """

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # Specific recipient -- no FK constraint, consistent with the rest of
    # this schema's convention of referencing other rows by plain id/string.
    user_id = Column(Integer, nullable=False, index=True)
    complaint_id = Column(String, nullable=True, index=True)
    type = Column(String, nullable=False)
    escalation_level = Column(Integer, default=0, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    # Uniquely identifies "this recipient was already notified about this
    # exact SLA transition for this complaint" -- e.g.
    # "7|CMP-1001|BREACHED_L1". This is THE duplicate-prevention mechanism:
    # notify_sla_event() (see notification_service.py) is called on every
    # read of an AT_RISK/BREACHED complaint, and relies entirely on this
    # constraint (via insert-and-catch-IntegrityError) to make repeat
    # attempts for an already-notified transition a cheap no-op.
    dedup_key = Column(String, unique=True, nullable=False, index=True)


class ComplaintFeedback(Base):
    """Citizen-submitted rating/comment for a resolved (or any) complaint --
    see MASTER_TODO.md's "Citizen feedback (rating/comment) is not
    persisted to the backend" item. `complaint_id` is unique: a complaint
    has at most one feedback row, and resubmitting (see
    feedback_service.submit_feedback) updates it in place rather than
    creating a second one -- both the natural real-world semantics (one
    citizen, one complaint, one opinion that can be revised) and the
    simplest way to satisfy "no duplicate submissions" without extra
    infrastructure.
    """

    __tablename__ = "complaint_feedback"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(String, unique=True, nullable=False, index=True)
    # The citizen who submitted it -- always taken from the validated JWT
    # (see app/auth/dependencies.py), never from the request body. No FK
    # constraint, consistent with the rest of this schema.
    user_id = Column(Integer, nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
