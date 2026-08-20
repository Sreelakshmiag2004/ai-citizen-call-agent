"""Authentication & RBAC tests (see MASTER_TODO.md's "No
authentication/authorization anywhere" item).

Covers: successful registration, successful login, invalid credentials,
expired/invalid JWT, unauthenticated protected request -> 401, authorized
role -> success, unauthorized role -> 403, ownership (a citizen cannot
access another citizen's complaint), and logout.

Uses TestClient directly against the FastAPI app (in-process, no live
server needed) against the isolated test DB/ChromaDB from test_config.py --
never the presentation database.
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import test_config  # noqa: F401 -- must run before any `app.*` import; isolates DB/ChromaDB

from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.database.database import Base, SessionLocal, engine
from app.main import app
from app.services.user_service import seed_demo_users

client = TestClient(app)


def run_tests():
    print("==================================================")
    print("STARTING AUTHENTICATION & RBAC TESTS")
    print("==================================================")

    # Fresh tables every run, then seed the four demo accounts (mirrors
    # what main.py's lifespan does on a real startup -- TestClient() without
    # a `with` block does not trigger FastAPI lifespan events).
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_users(db)
    finally:
        db.close()

    # --- TEST 1: successful registration ---
    print("\n--- [TEST 1] SUCCESSFUL REGISTRATION ---")
    res = client.post(
        "/auth/register",
        json={"email": "auth.citizen1@example.com", "password": "TestPass123!", "full_name": "Auth Citizen One"},
    )
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    body = res.json()
    assert body["user"]["role"] == "citizen", "Self-registration must always yield a citizen role"
    assert "access_token" in body
    citizen1_token = body["access_token"]
    print("[OK] TEST 1 PASSED: registration succeeds and returns a citizen-role token.")

    # Duplicate email -> 409
    res = client.post(
        "/auth/register",
        json={"email": "auth.citizen1@example.com", "password": "TestPass123!", "full_name": "Dup"},
    )
    assert res.status_code == 409, f"Expected 409 for duplicate email, got {res.status_code}"
    print("[OK] duplicate registration correctly rejected with 409.")

    # A client-supplied "role" field on the public registration payload is
    # simply ignored (not a validation error) -- the endpoint's schema has
    # no such field, so it can never grant anything but 'citizen'.
    res = client.post(
        "/auth/register",
        json={
            "email": "auth.wannabe-admin@example.com",
            "password": "TestPass123!",
            "full_name": "Wannabe Admin",
            "role": "admin",
        },
    )
    assert res.status_code == 201
    assert res.json()["user"]["role"] == "citizen", "role field in public registration body must be ignored"
    print("[OK] client-supplied 'role' on public registration is ignored -- always citizen.")

    # --- TEST 2: successful login ---
    print("\n--- [TEST 2] SUCCESSFUL LOGIN ---")
    res = client.post("/auth/login", json={"email": "auth.citizen1@example.com", "password": "TestPass123!"})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    assert res.json()["token_type"] == "bearer"
    print("[OK] TEST 2 PASSED: login succeeds and returns a bearer token.")

    # --- TEST 3: invalid credentials ---
    print("\n--- [TEST 3] INVALID CREDENTIALS ---")
    res = client.post("/auth/login", json={"email": "auth.citizen1@example.com", "password": "wrong-password"})
    assert res.status_code == 401, f"Expected 401 for wrong password, got {res.status_code}"

    res = client.post("/auth/login", json={"email": "no-such-user@example.com", "password": "whatever123"})
    assert res.status_code == 401, f"Expected 401 for unknown email, got {res.status_code}"
    print("[OK] TEST 3 PASSED: wrong password and unknown email both return 401.")

    # --- TEST 4: expired / invalid JWT ---
    print("\n--- [TEST 4] EXPIRED / INVALID JWT ---")
    res = client.get("/auth/me", headers={"Authorization": "Bearer this-is-not-a-jwt"})
    assert res.status_code == 401, f"Expected 401 for a malformed token, got {res.status_code}"

    expired_token = create_access_token(user_id=1, expires_minutes=-5)
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401, f"Expected 401 for an expired token, got {res.status_code}"
    print("[OK] TEST 4 PASSED: malformed and expired tokens both return 401.")

    # --- TEST 5: unauthenticated protected request -> 401 ---
    print("\n--- [TEST 5] UNAUTHENTICATED PROTECTED REQUEST ---")
    res = client.get("/complaints")
    assert res.status_code == 401, f"Expected 401 with no Authorization header, got {res.status_code}"
    res = client.get("/analytics/summary")
    assert res.status_code == 401
    print("[OK] TEST 5 PASSED: protected endpoints reject requests with no token.")

    # --- TEST 6/7: authorized vs unauthorized role, and ownership ---
    print("\n--- [TEST 6] AUTHORIZED ROLE -> SUCCESS, UNAUTHORIZED ROLE -> 403 ---")
    citizen1_headers = {"Authorization": f"Bearer {citizen1_token}"}

    res = client.post(
        "/complaints",
        json={
            "transcript": "No water supply for two days.",
            "summary": "No water supply",
            "category": "Water Supply",
            "department": "Water",
            "priority": "HIGH",
        },
        headers=citizen1_headers,
    )
    assert res.status_code == 200, f"citizen should be able to create a complaint, got {res.status_code}: {res.text}"
    complaint = res.json()
    assert complaint["created_by_user_id"] is not None, "created_by_user_id must be stamped from the JWT"
    cmp_id = complaint["complaint_id"]
    print("[OK] citizen (authorized role) can create a complaint.")

    res = client.patch(f"/complaints/{cmp_id}/status", json={"status": "ASSIGNED"}, headers=citizen1_headers)
    assert res.status_code == 403, f"citizen updating status should be 403, got {res.status_code}"
    res = client.get("/analytics/summary", headers=citizen1_headers)
    assert res.status_code == 403, f"citizen viewing analytics should be 403, got {res.status_code}"
    print("[OK] TEST 6 PASSED: citizen (unauthorized role) blocked with 403 from status-update and analytics.")

    # Officer login (seeded demo account) -- authorized for both.
    res = client.post("/auth/login", json={"email": "priya.sharma@pwd.gov.in", "password": "Officer@123"})
    assert res.status_code == 200
    officer_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.patch(f"/complaints/{cmp_id}/status", json={"status": "ASSIGNED"}, headers=officer_headers)
    assert res.status_code == 200, f"officer should be able to update status, got {res.status_code}: {res.text}"
    res = client.get("/analytics/summary", headers=officer_headers)
    assert res.status_code == 200, f"officer should be able to view analytics, got {res.status_code}"
    print("[OK] officer (authorized role) succeeds at status-update and analytics.")

    # --- TEST 7: a user cannot access another user's protected resources ---
    print("\n--- [TEST 7] CROSS-USER OWNERSHIP ---")
    res = client.post(
        "/auth/register",
        json={"email": "auth.citizen2@example.com", "password": "TestPass123!", "full_name": "Auth Citizen Two"},
    )
    citizen2_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.get(f"/complaints/{cmp_id}", headers=citizen2_headers)
    assert res.status_code == 404, f"citizen2 must not see citizen1's complaint, got {res.status_code}"

    res = client.get("/complaints", headers=citizen2_headers)
    assert res.status_code == 200
    assert all(c["complaint_id"] != cmp_id for c in res.json()), "citizen2's list must not include citizen1's complaint"

    res = client.get(f"/complaints/{cmp_id}", headers=citizen1_headers)
    assert res.status_code == 200, "citizen1 (the owner) must still be able to view their own complaint"
    print("[OK] TEST 7 PASSED: a citizen cannot view or list another citizen's complaint; the owner still can.")

    # Admin-only endpoint blocked for a non-admin staff role.
    res = client.post(
        "/auth/users",
        json={"email": "should-fail@example.com", "password": "TestPass123!", "full_name": "X", "role": "officer"},
        headers=officer_headers,
    )
    assert res.status_code == 403, f"officer creating a user should be 403, got {res.status_code}"

    res = client.post("/auth/login", json={"email": "raj.kumar@gov.in", "password": "Admin@123"})
    admin_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}
    res = client.post(
        "/auth/users",
        json={"email": "new.officer@example.com", "password": "TestPass123!", "full_name": "New Officer", "role": "officer"},
        headers=admin_headers,
    )
    assert res.status_code == 201, f"admin creating a staff user should succeed, got {res.status_code}: {res.text}"
    print("[OK] admin-only user-provisioning endpoint enforces the admin role correctly.")

    # --- TEST 8: logout / authentication state ---
    print("\n--- [TEST 8] LOGOUT ---")
    res = client.post("/auth/logout", headers=citizen1_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    res = client.post("/auth/logout")
    assert res.status_code == 401, "logout without a token must still require authentication"
    print("[OK] TEST 8 PASSED: logout succeeds when authenticated, 401s when not.")

    print("\n==================================================")
    print("ALL AUTHENTICATION & RBAC TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
