"""Persistent citizen feedback (rating/comment) for a complaint -- see
MASTER_TODO.md's "Citizen feedback (rating/comment) is not persisted to
the backend" item.

Rating validation happens at the API boundary (FeedbackSubmitRequest's
`ge=1, le=5` in app/database/schemas.py), same pattern as every other
enum-like field in this codebase (status, priority, role, ...): validated
in Pydantic/the service layer, not via a SQLite CHECK constraint.

"Duplicate submission" handling: ComplaintFeedback.complaint_id is unique,
so resubmitting feedback for the same complaint updates the existing row
in place (rating/comment/updated_at) rather than creating a second one --
the natural semantics for "a citizen revises their opinion", and the
simplest way to satisfy "no duplicates" without extra infrastructure.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Tuple

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.models import ComplaintFeedback

logger = logging.getLogger(__name__)


class FeedbackService:
    def get_feedback(self, db: Session, complaint_id: str) -> Optional[ComplaintFeedback]:
        return db.query(ComplaintFeedback).filter(ComplaintFeedback.complaint_id == complaint_id).first()

    def submit_feedback(
        self,
        db: Session,
        complaint_id: str,
        user_id: int,
        rating: int,
        comment: Optional[str],
    ) -> Tuple[ComplaintFeedback, bool]:
        """Returns (feedback, created) -- `created` is False when this call
        updated an existing row instead of inserting a new one."""
        now = datetime.now(timezone.utc)
        existing = self.get_feedback(db, complaint_id)
        if existing:
            existing.rating = rating
            existing.comment = comment
            existing.updated_at = now
            db.commit()
            db.refresh(existing)
            logger.info("Updated feedback for complaint '%s' (user %d).", complaint_id, user_id)
            return existing, False

        feedback = ComplaintFeedback(
            complaint_id=complaint_id,
            user_id=user_id,
            rating=rating,
            comment=comment,
            created_at=now,
            updated_at=now,
        )
        db.add(feedback)
        try:
            db.commit()
        except IntegrityError:
            # Race: another request inserted the first feedback row for
            # this complaint between our check and this insert -- fall
            # back to updating it rather than erroring.
            db.rollback()
            existing = self.get_feedback(db, complaint_id)
            if existing is None:
                raise  # something other than the expected unique-constraint race
            existing.rating = rating
            existing.comment = comment
            existing.updated_at = now
            db.commit()
            db.refresh(existing)
            return existing, False

        db.refresh(feedback)
        logger.info("Created feedback for complaint '%s' (user %d).", complaint_id, user_id)
        return feedback, True


feedback_service = FeedbackService()
