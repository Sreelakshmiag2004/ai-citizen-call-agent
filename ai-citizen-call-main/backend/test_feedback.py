"""Citizen feedback persistence tests (see MASTER_TODO.md's "Citizen
feedback (rating/comment) is not persisted to the backend" item).

Covers: valid submission, rating validation, authenticated access,
unauthorized/non-owner access, duplicate/repeated submission (update, not
duplicate), persistence across a fresh DB session (simulating page/session
reload), retrieval, and that existing complaint functionality (GET
/complaints, /complaints/{id}) still works with the new `feedback` field.
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import test_config  # noqa: F401 -- must run before any `app.*` import; isolates DB/ChromaDB

from fastapi.testclient import TestClient

from app.database.database import Base, SessionLocal, engine
from app.database.models import ComplaintFeedback
from app.main import app
from app.services.user_service import seed_demo_users

client = TestClient(app)


def run_tests():
    print("==================================================")
    print("STARTING CITIZEN FEEDBACK PERSISTENCE TESTS")
    print("==================================================")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_demo_users(db)

    # --- Auth setup ---
    reg = client.post(
        "/auth/register",
        json={"email": "feedback.citizen1@example.com", "password": "TestPass123!", "full_name": "Feedback Citizen One"},
    )
    assert reg.status_code == 201, reg.text
    citizen_headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    officer_login = client.post("/auth/login", json={"email": "priya.sharma@pwd.gov.in", "password": "Officer@123"})
    officer_headers = {"Authorization": f"Bearer {officer_login.json()['access_token']}"}

    # Citizen creates their own complaint (feedback can only be submitted by the owner).
    create_res = client.post(
        "/complaints",
        json={
            "transcript": "Streetlight has been out for a week.",
            "summary": "Streetlight out",
            "category": "Streetlight",
            "department": "Electricity",
            "priority": "MEDIUM",
        },
        headers=citizen_headers,
    )
    assert create_res.status_code == 200, create_res.text
    cmp_id = create_res.json()["complaint_id"]
    assert create_res.json()["feedback"] is None, "a brand-new complaint must have no feedback yet"

    # --------------------------------------------------------------
    # TEST 1: valid feedback submission
    # --------------------------------------------------------------
    print("\n--- [TEST 1] VALID FEEDBACK SUBMISSION ---")
    resp = client.post(
        f"/complaints/{cmp_id}/feedback",
        json={"rating": 4, "comment": "Resolved reasonably quickly."},
        headers=citizen_headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["rating"] == 4
    assert body["comment"] == "Resolved reasonably quickly."
    assert body["complaint_id"] == cmp_id
    assert body["created"] is True
    assert "user_id" in body and "created_at" in body and "updated_at" in body
    print("[OK] TEST 1 PASSED: feedback submitted and persisted with rating, comment, user_id, timestamp.")

    # --------------------------------------------------------------
    # TEST 2: rating validation
    # --------------------------------------------------------------
    print("\n--- [TEST 2] RATING VALIDATION ---")
    for bad_rating in [0, 6, -1, 100]:
        resp = client.post(f"/complaints/{cmp_id}/feedback", json={"rating": bad_rating}, headers=citizen_headers)
        assert resp.status_code == 422, f"rating {bad_rating} should be rejected, got {resp.status_code}"
    resp = client.post(f"/complaints/{cmp_id}/feedback", json={}, headers=citizen_headers)
    assert resp.status_code == 422, "missing rating should be rejected"
    for good_rating in [1, 5]:
        resp = client.post(f"/complaints/{cmp_id}/feedback", json={"rating": good_rating}, headers=citizen_headers)
        assert resp.status_code == 200, f"rating {good_rating} should be accepted"
    print("[OK] TEST 2 PASSED: ratings outside 1-5 (and missing rating) rejected with 422; 1 and 5 accepted.")

    # --------------------------------------------------------------
    # TEST 3: authenticated access (unauthenticated -> 401)
    # --------------------------------------------------------------
    print("\n--- [TEST 3] AUTHENTICATED ACCESS ---")
    resp = client.post(f"/complaints/{cmp_id}/feedback", json={"rating": 5})
    assert resp.status_code == 401, "unauthenticated submission must be rejected"
    resp = client.get(f"/complaints/{cmp_id}/feedback")
    assert resp.status_code == 401, "unauthenticated retrieval must be rejected"
    print("[OK] TEST 3 PASSED: unauthenticated requests get 401 for both submit and retrieve.")

    # --------------------------------------------------------------
    # TEST 4: unauthorized / non-owner access
    # --------------------------------------------------------------
    print("\n--- [TEST 4] UNAUTHORIZED / NON-OWNER ACCESS ---")
    reg2 = client.post(
        "/auth/register",
        json={"email": "feedback.citizen2@example.com", "password": "TestPass123!", "full_name": "Feedback Citizen Two"},
    )
    citizen2_headers = {"Authorization": f"Bearer {reg2.json()['access_token']}"}

    resp = client.post(f"/complaints/{cmp_id}/feedback", json={"rating": 1, "comment": "not mine"}, headers=citizen2_headers)
    assert resp.status_code == 404, f"a non-owner citizen must not be able to submit feedback, got {resp.status_code}"

    resp = client.get(f"/complaints/{cmp_id}/feedback", headers=citizen2_headers)
    assert resp.status_code == 404, "a non-owner citizen must not be able to retrieve feedback either"

    # Staff must not be able to submit feedback (citizen-only action) even
    # though they can view any complaint.
    resp = client.post(f"/complaints/{cmp_id}/feedback", json={"rating": 3}, headers=officer_headers)
    assert resp.status_code == 403, f"staff submitting feedback should be 403, got {resp.status_code}"

    # Staff CAN view feedback on any complaint (quality assurance).
    resp = client.get(f"/complaints/{cmp_id}/feedback", headers=officer_headers)
    assert resp.status_code == 200, "staff should be able to view feedback on any complaint"
    print("[OK] TEST 4 PASSED: non-owner citizen -> 404 (submit & retrieve); staff submit -> 403; staff retrieve -> 200.")

    # --------------------------------------------------------------
    # TEST 5: duplicate / repeated submission -> update, not duplicate
    # --------------------------------------------------------------
    print("\n--- [TEST 5] DUPLICATE / REPEATED SUBMISSION BEHAVIOR ---")
    resp = client.post(
        f"/complaints/{cmp_id}/feedback", json={"rating": 2, "comment": "Actually, on reflection, less happy."}, headers=citizen_headers
    )
    assert resp.status_code == 200
    assert resp.json()["created"] is False, "resubmission must update, not create a new row"
    assert resp.json()["rating"] == 2
    assert resp.json()["comment"] == "Actually, on reflection, less happy."

    row_count = db.query(ComplaintFeedback).filter(ComplaintFeedback.complaint_id == cmp_id).count()
    assert row_count == 1, f"expected exactly 1 feedback row for this complaint, found {row_count}"
    print("[OK] TEST 5 PASSED: resubmitting feedback updates the existing row in place; exactly 1 row persisted.")

    # --------------------------------------------------------------
    # TEST 6: persistence after page/session reload (fresh DB session,
    # fresh HTTP call -- nothing cached client-side)
    # --------------------------------------------------------------
    print("\n--- [TEST 6] PERSISTENCE AFTER RELOAD ---")
    fresh_db = SessionLocal()
    try:
        persisted = fresh_db.query(ComplaintFeedback).filter(ComplaintFeedback.complaint_id == cmp_id).first()
        assert persisted is not None
        assert persisted.rating == 2
        assert persisted.comment == "Actually, on reflection, less happy."
    finally:
        fresh_db.close()

    resp = client.get(f"/complaints/{cmp_id}", headers=citizen_headers)
    assert resp.status_code == 200
    assert resp.json()["feedback"] is not None
    assert resp.json()["feedback"]["rating"] == 2
    print("[OK] TEST 6 PASSED: feedback survives a fresh DB session and is embedded in GET /complaints/{id}.")

    # --------------------------------------------------------------
    # TEST 7: retrieval
    # --------------------------------------------------------------
    print("\n--- [TEST 7] RETRIEVAL ---")
    resp = client.get(f"/complaints/{cmp_id}/feedback", headers=citizen_headers)
    assert resp.status_code == 200
    assert resp.json()["rating"] == 2

    # A complaint with no feedback yet -> 404 on the dedicated endpoint,
    # and `feedback: null` embedded in the complaint response.
    create_res2 = client.post(
        "/complaints",
        json={"transcript": "Garbage not collected.", "summary": "Garbage not collected", "category": "Sanitation", "department": "Sanitation", "priority": "LOW"},
        headers=citizen_headers,
    )
    cmp_id2 = create_res2.json()["complaint_id"]
    resp = client.get(f"/complaints/{cmp_id2}/feedback", headers=citizen_headers)
    assert resp.status_code == 404
    resp = client.get(f"/complaints/{cmp_id2}", headers=citizen_headers)
    assert resp.json()["feedback"] is None
    print("[OK] TEST 7 PASSED: feedback retrieval works; a complaint with none yet correctly reports absence.")

    # --------------------------------------------------------------
    # TEST 8: existing complaint functionality still works
    # --------------------------------------------------------------
    print("\n--- [TEST 8] EXISTING COMPLAINT FUNCTIONALITY UNAFFECTED ---")
    resp = client.get("/complaints", headers=citizen_headers)
    assert resp.status_code == 200
    ids = [c["complaint_id"] for c in resp.json()]
    assert cmp_id in ids and cmp_id2 in ids
    assert all("feedback" in c for c in resp.json())

    resp = client.patch(f"/complaints/{cmp_id}/status", json={"status": "ASSIGNED"}, headers=officer_headers)
    assert resp.status_code == 200

    resp = client.get(f"/complaints/{cmp_id}/history", headers=citizen_headers)
    assert resp.status_code == 200
    print("[OK] TEST 8 PASSED: GET /complaints, PATCH status, GET history all still work correctly.")

    print("\n==================================================")
    print("ALL CITIZEN FEEDBACK PERSISTENCE TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
