"""Persistent in-app notifications for SLA at-risk/breach escalation
events (see MASTER_TODO.md's "SLA breach/escalation has no actual delivery
mechanism" item). Email/SMS/push/webhook delivery is explicitly out of
scope for this task -- these notifications are read by the frontend via
GET /notifications (see app/routes/notifications.py).

Design note -- why this works without a background scheduler: SLA state
is computed on-read (see sla_service.sync_complaint_sla), not on a timer.
notify_sla_event() is called from there, right after a state change is
persisted, so a notification is created at the moment ANY read of that
complaint's SLA state (GET /complaints, GET /complaints/{id}/sla,
GET /sla/summary, GET /analytics/sla, ...) discovers a new transition.
This piggybacks on traffic the app already generates instead of adding a
poller/cron job, which would be more infrastructure than this project
needs.

Duplicate prevention: notify_sla_event() is called on every read of an
AT_RISK/BREACHED complaint's SLA state, not just when something changed on
that particular read -- otherwise a complaint that was already breached
before a recipient (or this feature) existed would never get notified,
since its persisted state never changes again. This is safe because
Notification.dedup_key carries a DB uniqueness constraint on
(recipient, complaint, transition): every call attempts an insert per
recipient, and any repeat for a transition that recipient was already
notified about simply hits the constraint and is discarded (see the
IntegrityError handling below) -- so calling this often is cheap and
correct, not wasteful, at this project's scale.
"""

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.models import Complaint, Notification, User

logger = logging.getLogger(__name__)

# Level 1 (breach just occurred) alerts the officer handling complaints;
# level 2 (still unresolved a full SLA duration past deadline) escalates
# further to admins -- mirrors the existing "Level 1 (Officer) / Level 2
# (Supervisor)" convention already shown on the Admin SLA dashboard.
_EVENT_TITLES = {
    "AT_RISK": "SLA At Risk",
    "BREACHED_L1": "SLA Breached",
    "BREACHED_L2": "SLA Breach Escalated",
}
_EVENT_MESSAGES = {
    "AT_RISK": "Complaint {id} ({priority} priority, {department}) is approaching its SLA deadline.",
    "BREACHED_L1": "Complaint {id} ({priority} priority, {department}) has breached its SLA deadline.",
    "BREACHED_L2": (
        "Complaint {id} ({priority} priority, {department}) remains unresolved well past its "
        "SLA deadline and has been escalated to supervisor level."
    ),
}
# NotificationItem['type'] union values already understood by the existing
# frontend notification UI (see govportal-citizen-assistant/src/types/index.ts) --
# reused as-is rather than inventing new ones the UI wouldn't render an icon for.
_EVENT_NOTIFICATION_TYPE = {
    "AT_RISK": "reminder",
    "BREACHED_L1": "sla_breach",
    "BREACHED_L2": "sla_breach",
}


class NotificationService:
    def _event_type_for(self, sla_status: str, escalation_level: int) -> Optional[str]:
        if sla_status == "AT_RISK":
            return "AT_RISK"
        if sla_status == "BREACHED":
            if escalation_level >= 2:
                return "BREACHED_L2"
            if escalation_level >= 1:
                return "BREACHED_L1"
        return None

    def _recipients_for(self, db: Session, complaint: Complaint, event: str) -> List[User]:
        roles = {"officer"}
        if event == "BREACHED_L2":
            roles.add("admin")

        recipients: List[User] = list(
            db.query(User).filter(User.role.in_(roles), User.is_active.is_(True)).all()
        )

        if complaint.created_by_user_id:
            owner = (
                db.query(User)
                .filter(User.id == complaint.created_by_user_id, User.is_active.is_(True))
                .first()
            )
            if owner and owner.id not in {u.id for u in recipients}:
                recipients.append(owner)

        return recipients

    def notify_sla_event(self, db: Session, complaint: Complaint, sla_state: Dict[str, Any]) -> int:
        """Creates one Notification per relevant recipient for the SLA
        transition described by `sla_state` (the dict returned by
        sla_service.evaluate_sla_state/sync_complaint_sla). No-op (returns
        0) for any status other than AT_RISK/BREACHED -- resolving or
        completing a complaint is not itself a notification-worthy SLA
        escalation event."""
        event = self._event_type_for(sla_state.get("sla_status", ""), sla_state.get("escalation_level", 0))
        if event is None:
            return 0

        title = _EVENT_TITLES[event]
        message = _EVENT_MESSAGES[event].format(
            id=complaint.complaint_id, priority=complaint.priority, department=complaint.department
        )
        notif_type = _EVENT_NOTIFICATION_TYPE[event]

        created = 0
        for user in self._recipients_for(db, complaint, event):
            notification = Notification(
                user_id=user.id,
                complaint_id=complaint.complaint_id,
                type=notif_type,
                escalation_level=sla_state.get("escalation_level", 0),
                title=title,
                message=message,
                dedup_key=f"{user.id}|{complaint.complaint_id}|{event}",
            )
            db.add(notification)
            try:
                db.commit()
                created += 1
            except IntegrityError:
                # Already notified this exact user about this exact
                # transition -- not an error, just the dedup constraint
                # doing its job.
                db.rollback()

        if created:
            logger.info(
                "Created %d SLA '%s' notification(s) for complaint '%s'.",
                created,
                event,
                complaint.complaint_id,
            )
        return created


notification_service = NotificationService()
