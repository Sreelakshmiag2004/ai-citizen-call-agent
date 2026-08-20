"""SLA escalation notification tests (see MASTER_TODO.md's "SLA
breach/escalation has no actual delivery mechanism" item).

Covers: SLA at-risk notification, SLA breach notification, escalation
level progression, duplicate prevention on repeated reads, notification
retrieval, authorization/ownership, and that the existing SLA endpoints
still work unchanged.

Complaints are backdated via `custom_created_at` (the same mechanism
test_module5.py/test_module6.py already use) so their SLA state is
already AT_RISK/BREACHED at real wall-clock "now" -- no sleeping in the
test, no scheduler involved, matching how notify_sla_event() itself is
triggered purely by on-read SLA state changes.
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import test_config  # noqa: F401 -- must run before any `app.*` import; isolates DB/ChromaDB

from fastapi.testclient import TestClient

from app.database.database import Base, SessionLocal, engine
from app.database.models import Notification, User
from app.main import app
from app.services.complaint_service import complaint_service
from app.services.sla_service import sla_service
from app.services.user_service import seed_demo_users

client = TestClient(app)


def run_tests():
    print("==================================================")
    print("STARTING SLA ESCALATION NOTIFICATION TESTS")
    print("==================================================")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_demo_users(db)

    # --- Auth setup ---
    reg = client.post(
        "/auth/register",
        json={"email": "notif.citizen1@example.com", "password": "TestPass123!", "full_name": "Notif Citizen One"},
    )
    assert reg.status_code == 201, reg.text
    citizen_id = reg.json()["user"]["id"]
    citizen_headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    officer_login = client.post("/auth/login", json={"email": "priya.sharma@pwd.gov.in", "password": "Officer@123"})
    officer_headers = {"Authorization": f"Bearer {officer_login.json()['access_token']}"}

    admin_login = client.post("/auth/login", json={"email": "raj.kumar@gov.in", "password": "Admin@123"})
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    now = datetime.now(timezone.utc)

    # --------------------------------------------------------------
    # TEST 1: SLA AT-RISK notification
    # --------------------------------------------------------------
    print("\n--- [TEST 1] SLA AT-RISK NOTIFICATION ---")
    # HIGH = 8h SLA duration, 20% at-risk threshold = 1.6h remaining.
    # Backdated so ~1.1h remain -> AT_RISK, with a safe margin either side.
    cmp1, _ = complaint_service.create_complaint(
        db=db,
        transcript="No water supply for two days.",
        summary="No water supply",
        category="Water Supply",
        department="Water",
        priority="HIGH",
        custom_created_at=now - timedelta(hours=6.9),
        created_by_user_id=citizen_id,
    )

    resp = client.get(f"/complaints/{cmp1.complaint_id}/sla", headers=citizen_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["sla_status"] == "AT_RISK", resp.json()
    print(f"[OK] Complaint {cmp1.complaint_id} correctly computed as AT_RISK.")

    citizen_notifs = client.get("/notifications", headers=citizen_headers).json()
    cmp1_citizen_notifs = [n for n in citizen_notifs if n["complaint_id"] == cmp1.complaint_id]
    assert len(cmp1_citizen_notifs) == 1, cmp1_citizen_notifs
    assert cmp1_citizen_notifs[0]["type"] == "reminder"
    assert cmp1_citizen_notifs[0]["escalation_level"] == 0

    officer_notifs = client.get("/notifications", headers=officer_headers).json()
    assert any(n["complaint_id"] == cmp1.complaint_id for n in officer_notifs), "officer should be notified too"

    admin_notifs = client.get("/notifications", headers=admin_headers).json()
    assert not any(n["complaint_id"] == cmp1.complaint_id for n in admin_notifs), "AT_RISK must not reach admin"
    print("[OK] TEST 1 PASSED: owning citizen + officer notified, admin not (not yet breached).")

    # --------------------------------------------------------------
    # TEST 2: duplicate prevention on repeated reads
    # --------------------------------------------------------------
    print("\n--- [TEST 2] DUPLICATE PREVENTION ON REPEATED READS ---")
    for _ in range(4):
        client.get(f"/complaints/{cmp1.complaint_id}/sla", headers=citizen_headers)
        client.get("/sla/summary", headers=officer_headers)
    citizen_notifs_after = client.get("/notifications", headers=citizen_headers).json()
    cmp1_notifs_after = [n for n in citizen_notifs_after if n["complaint_id"] == cmp1.complaint_id]
    assert len(cmp1_notifs_after) == 1, f"expected exactly 1, got {len(cmp1_notifs_after)} after repeated reads"
    print("[OK] TEST 2 PASSED: 5 total reads of the same AT_RISK state produced exactly 1 notification.")

    # --------------------------------------------------------------
    # TEST 3: SLA BREACH notification (level 1)
    # --------------------------------------------------------------
    print("\n--- [TEST 3] SLA BREACH NOTIFICATION (LEVEL 1) ---")
    cmp2, _ = complaint_service.create_complaint(
        db=db,
        transcript="Streetlight broken for a week.",
        summary="Streetlight broken",
        category="Streetlight",
        department="Electricity",
        priority="HIGH",
        custom_created_at=now - timedelta(hours=9),  # deadline = now-1h; overdue 1h <= 8h duration -> level 1
        created_by_user_id=citizen_id,
    )
    resp = client.get(f"/complaints/{cmp2.complaint_id}/sla", headers=citizen_headers)
    assert resp.status_code == 200
    assert resp.json()["sla_status"] == "BREACHED"
    assert resp.json()["escalation_level"] == 1
    print(f"[OK] Complaint {cmp2.complaint_id} correctly computed as BREACHED, level 1.")

    citizen_notifs = client.get("/notifications", headers=citizen_headers).json()
    cmp2_notifs = [n for n in citizen_notifs if n["complaint_id"] == cmp2.complaint_id]
    assert len(cmp2_notifs) == 1
    assert cmp2_notifs[0]["type"] == "sla_breach"
    assert cmp2_notifs[0]["escalation_level"] == 1

    admin_notifs = client.get("/notifications", headers=admin_headers).json()
    assert not any(n["complaint_id"] == cmp2.complaint_id for n in admin_notifs), "level 1 must not reach admin"
    print("[OK] TEST 3 PASSED: level-1 breach notifies citizen + officer, not admin.")

    # --------------------------------------------------------------
    # TEST 4: escalation level progression (0 -> 1 -> 2), admin joins at 2
    # --------------------------------------------------------------
    print("\n--- [TEST 4] ESCALATION LEVEL PROGRESSION ---")
    cmp3, _ = complaint_service.create_complaint(
        db=db,
        transcript="Garbage not collected.",
        summary="Garbage not collected",
        category="Sanitation",
        department="Sanitation",
        priority="HIGH",
        custom_created_at=now,
        created_by_user_id=citizen_id,
    )
    state0 = sla_service.get_complaint_sla(db, cmp3.complaint_id, override_now=now)
    assert state0["sla_status"] == "ACTIVE" and state0["escalation_level"] == 0
    assert db.query(Notification).filter(Notification.complaint_id == cmp3.complaint_id).count() == 0
    print("[OK] level 0 (ACTIVE): no notification, as expected.")

    state1 = sla_service.get_complaint_sla(db, cmp3.complaint_id, override_now=now + timedelta(hours=9))
    assert state1["sla_status"] == "BREACHED" and state1["escalation_level"] == 1
    level1_notifs = db.query(Notification).filter(Notification.complaint_id == cmp3.complaint_id).all()
    assert len(level1_notifs) >= 1 and all(n.escalation_level == 1 for n in level1_notifs)
    print(f"[OK] level 1 reached: {len(level1_notifs)} notification(s) created.")

    state2 = sla_service.get_complaint_sla(db, cmp3.complaint_id, override_now=now + timedelta(hours=17))
    assert state2["sla_status"] == "BREACHED" and state2["escalation_level"] == 2
    level2_notifs = db.query(Notification).filter(
        Notification.complaint_id == cmp3.complaint_id, Notification.escalation_level == 2
    ).all()
    assert len(level2_notifs) >= 1

    admin_user = db.query(User).filter(User.email == "raj.kumar@gov.in").first()
    assert any(n.user_id == admin_user.id for n in level2_notifs), "level 2 must reach admin"
    officer_user = db.query(User).filter(User.email == "priya.sharma@pwd.gov.in").first()
    assert any(n.user_id == officer_user.id for n in level2_notifs), "officer should still be notified at level 2"

    # Re-reading at the same (already-level-2) time must not duplicate.
    sla_service.get_complaint_sla(db, cmp3.complaint_id, override_now=now + timedelta(hours=17))
    level2_notifs_after = db.query(Notification).filter(
        Notification.complaint_id == cmp3.complaint_id, Notification.escalation_level == 2
    ).all()
    assert len(level2_notifs_after) == len(level2_notifs), "re-reading the same level must not duplicate"
    print("[OK] TEST 4 PASSED: 0 -> 1 -> 2 escalation each notified exactly once; admin joins only at level 2.")

    # --------------------------------------------------------------
    # TEST 5: notification retrieval + mark as read / read-all
    # --------------------------------------------------------------
    print("\n--- [TEST 5] NOTIFICATION RETRIEVAL & READ STATE ---")
    unread = client.get("/notifications?unread_only=true", headers=citizen_headers).json()
    assert len(unread) >= 1
    target_id = unread[0]["id"]

    resp = client.patch(f"/notifications/{target_id}/read", headers=citizen_headers)
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True

    unread_after = client.get("/notifications?unread_only=true", headers=citizen_headers).json()
    assert all(n["id"] != target_id for n in unread_after)

    resp = client.post("/notifications/read-all", headers=citizen_headers)
    assert resp.status_code == 200
    unread_after_all = client.get("/notifications?unread_only=true", headers=citizen_headers).json()
    assert unread_after_all == []
    print("[OK] TEST 5 PASSED: retrieval, single mark-as-read, and mark-all-as-read all work correctly.")

    # --------------------------------------------------------------
    # TEST 6: authorization / ownership
    # --------------------------------------------------------------
    print("\n--- [TEST 6] AUTHORIZATION / OWNERSHIP ---")
    resp = client.get("/notifications")
    assert resp.status_code == 401, "unauthenticated request must be rejected"

    reg2 = client.post(
        "/auth/register",
        json={"email": "notif.citizen2@example.com", "password": "TestPass123!", "full_name": "Notif Citizen Two"},
    )
    citizen2_headers = {"Authorization": f"Bearer {reg2.json()['access_token']}"}

    citizen2_notifs = client.get("/notifications", headers=citizen2_headers).json()
    assert citizen2_notifs == [], "a brand-new citizen must not see anyone else's notifications"

    citizen1_notifs = client.get("/notifications", headers=citizen_headers).json()
    assert len(citizen1_notifs) > 0
    other_persons_notif_id = citizen1_notifs[0]["id"]

    resp = client.patch(f"/notifications/{other_persons_notif_id}/read", headers=citizen2_headers)
    assert resp.status_code == 404, "citizen2 must not be able to mark citizen1's notification as read"
    print("[OK] TEST 6 PASSED: unauthenticated -> 401; cross-user notification access -> 404, list is scoped.")

    # --------------------------------------------------------------
    # TEST 7: existing SLA endpoints still work (calculation unchanged)
    # --------------------------------------------------------------
    print("\n--- [TEST 7] EXISTING SLA ENDPOINTS STILL WORK ---")
    resp = client.get("/sla/summary", headers=officer_headers)
    assert resp.status_code == 200
    summary = resp.json()
    # Only cmp2 is genuinely breached at real wall-clock "now" -- cmp3 was
    # only ever pushed into BREACHED/level-2 via simulated override_now
    # calls in TEST 4 (exactly like test_module5.py's escalation tests do);
    # sync_complaint_sla recomputes from the real clock on every read, so
    # it correctly reports cmp3 as ACTIVE again here. This is existing,
    # unmodified SLA behavior -- confirming it still holds is the point.
    assert summary["breached"] >= 1, summary
    print("SLA Summary:", summary)

    resp = client.get(f"/complaints/{cmp3.complaint_id}/sla", headers=citizen_headers)
    assert resp.status_code == 200
    assert resp.json()["sla_status"] == "ACTIVE", (
        "cmp3's real deadline is still hours away; simulated override_now reads in TEST 4 "
        "must not have permanently corrupted its real-time SLA state"
    )

    resp = client.get("/sla/breached", headers=officer_headers)
    assert resp.status_code == 200
    assert any(c["complaint_id"] == cmp2.complaint_id for c in resp.json())

    resp = client.get("/sla/at-risk", headers=officer_headers)
    assert resp.status_code == 200

    resp = client.get(f"/complaints/{cmp1.complaint_id}/sla", headers=citizen_headers)
    assert resp.status_code == 200
    assert resp.json()["sla_status"] == "AT_RISK"  # calculation itself is unchanged
    print("[OK] TEST 7 PASSED: /sla/summary, /sla/breached, /sla/at-risk, /complaints/{id}/sla all unaffected.")

    print("\n==================================================")
    print("ALL SLA ESCALATION NOTIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
