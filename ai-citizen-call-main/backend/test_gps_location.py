"""Optional citizen GPS location capture tests (see MASTER_TODO.md context:
no existing GPS/location TODO item was found -- see the completion report
for this task). Covers: GPS fields accepted and persisted via the real
POST /complaints contract, NULL GPS remains valid for complaints that
never supply it, GET responses include GPS fields both when present and
absent, and the existing AI-extracted `location` text field is completely
unaffected either way.

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

from app.database.database import Base, SessionLocal, engine
from app.main import app
from app.services.complaint_service import complaint_service
from app.services.user_service import seed_demo_users

client = TestClient(app)


def run_tests():
    print("==================================================")
    print("STARTING GPS LOCATION CAPTURE TESTS")
    print("==================================================")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_users(db)
    finally:
        db.close()

    reg = client.post(
        "/auth/register",
        json={"email": "gps.citizen@example.com", "password": "TestPass123!", "full_name": "GPS Citizen"},
    )
    assert reg.status_code == 201, reg.text
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # --- TEST 1: GPS fields accepted and persisted via POST /complaints ---
    print("\n--- [TEST 1] GPS FIELDS ACCEPTED AND PERSISTED ---")
    resp = client.post(
        "/complaints",
        json={
            "transcript": "Pothole near the main junction.",
            "summary": "Pothole near the main junction.",
            "category": "Roads",
            "department": "Roads",
            "priority": "MEDIUM",
            "location": "Main Junction",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "location_accuracy_m": 12.5,
        },
        headers=headers,
    )
    assert resp.status_code == 200, f"expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["latitude"] == 13.0827, body.get("latitude")
    assert body["longitude"] == 80.2707, body.get("longitude")
    assert body["location_accuracy_m"] == 12.5, body.get("location_accuracy_m")
    # The existing AI-extracted/reported location field is completely
    # independent -- unaffected by GPS being supplied alongside it.
    assert body["location"] == "Main Junction", body.get("location")
    gps_cmp_id = body["complaint_id"]
    print(f"[OK] TEST 1 PASSED: complaint {gps_cmp_id} persisted with latitude/longitude/accuracy intact.")

    # --- TEST 2: GET reflects the same GPS values (round-trip) ---
    print("\n--- [TEST 2] GET /complaints/{id} RETURNS THE SAME GPS VALUES ---")
    resp = client.get(f"/complaints/{gps_cmp_id}", headers=headers)
    assert resp.status_code == 200
    fetched = resp.json()
    assert fetched["latitude"] == 13.0827
    assert fetched["longitude"] == 80.2707
    assert fetched["location_accuracy_m"] == 12.5
    print("[OK] TEST 2 PASSED: GET round-trips the exact GPS values.")

    # --- TEST 3: NULL GPS remains valid -- existing complaint creation
    # without GPS still works exactly as before (no fields sent at all,
    # matching every pre-existing caller of this endpoint). ---
    print("\n--- [TEST 3] COMPLAINT CREATION WITHOUT GPS STILL WORKS (NULL IS VALID) ---")
    resp = client.post(
        "/complaints",
        json={
            "transcript": "Garbage not collected for a week.",
            "summary": "Garbage not collected for a week.",
            "category": "Sanitation",
            "department": "Sanitation",
            "priority": "MEDIUM",
            "location": "Ward 12",
            # no latitude/longitude/location_accuracy_m at all
        },
        headers=headers,
    )
    assert resp.status_code == 200, f"expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["latitude"] is None, body.get("latitude")
    assert body["longitude"] is None, body.get("longitude")
    assert body["location_accuracy_m"] is None, body.get("location_accuracy_m")
    assert body["location"] == "Ward 12", "the existing AI-extracted location field must be unaffected"
    no_gps_cmp_id = body["complaint_id"]
    print(f"[OK] TEST 3 PASSED: complaint {no_gps_cmp_id} created with NULL GPS fields, location field intact.")

    # --- TEST 4: GET on the no-GPS complaint also returns NULL, not an error ---
    print("\n--- [TEST 4] GET /complaints/{id} FOR A NO-GPS COMPLAINT RETURNS NULL, NOT AN ERROR ---")
    resp = client.get(f"/complaints/{no_gps_cmp_id}", headers=headers)
    assert resp.status_code == 200
    fetched = resp.json()
    assert fetched["latitude"] is None
    assert fetched["longitude"] is None
    assert fetched["location_accuracy_m"] is None
    print("[OK] TEST 4 PASSED: NULL GPS fields round-trip cleanly, no error.")

    # --- TEST 5: GET /complaints (list) includes GPS fields for both rows ---
    print("\n--- [TEST 5] GET /complaints (LIST) INCLUDES GPS FIELDS ---")
    resp = client.get("/complaints", headers=headers)
    assert resp.status_code == 200
    listed = {c["complaint_id"]: c for c in resp.json()}
    assert listed[gps_cmp_id]["latitude"] == 13.0827
    assert listed[no_gps_cmp_id]["latitude"] is None
    print("[OK] TEST 5 PASSED: list endpoint carries GPS fields (populated and NULL) correctly per row.")

    # --- TEST 6: service layer directly -- pre-existing rows created via
    # complaint_service.create_complaint() *without* the new GPS kwargs at
    # all (matching every pre-existing caller: run_audio_pipeline, Twilio,
    # process-and-create-ticket) remain fully valid with NULL GPS. ---
    print("\n--- [TEST 6] SERVICE-LAYER CALL WITHOUT GPS KWARGS (Twilio/voice-pipeline shape) ---")
    db = SessionLocal()
    try:
        cmp_obj, tkt_obj = complaint_service.create_complaint(
            db=db,
            transcript="No streetlights working on the highway.",
            summary="No streetlights working on the highway.",
            category="Electricity",
            department="Electricity",
            priority="MEDIUM",
            location="Highway Stretch 4",
            # latitude/longitude/location_accuracy_m intentionally omitted --
            # this is exactly the call shape run_audio_pipeline() (used by
            # both the browser voice flow and Twilio) already uses.
        )
        res = complaint_service.get_complaint_by_id(db, cmp_obj.complaint_id)
        assert res["latitude"] is None
        assert res["longitude"] is None
        assert res["location_accuracy_m"] is None
        assert res["location"] == "Highway Stretch 4"
    finally:
        db.close()
    print("[OK] TEST 6 PASSED: service-layer calls with no GPS kwargs (the Twilio/voice-pipeline shape) remain valid, NULL GPS.")

    # --- TEST 7: invalid GPS values are rejected by schema validation
    # (bounds sanity, not a full validation suite -- just confirming the
    # Field(ge=/le=) constraints are wired up). ---
    print("\n--- [TEST 7] OUT-OF-RANGE GPS VALUES ARE REJECTED ---")
    resp = client.post(
        "/complaints",
        json={
            "transcript": "test",
            "summary": "test",
            "latitude": 999.0,  # out of the -90..90 range
        },
        headers=headers,
    )
    assert resp.status_code == 422, f"expected 422 for out-of-range latitude, got {resp.status_code}"
    print("[OK] TEST 7 PASSED: out-of-range latitude rejected with 422.")

    print("\n==================================================")
    print("ALL GPS LOCATION CAPTURE TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
