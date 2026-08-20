import json
import math
import struct
import time
import uuid
import wave
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

BASE_URL = "http://127.0.0.1:8001"


def make_sample_wav(filename: str = "sample_test.wav") -> str:
    path = Path(__file__).parent / filename
    with wave.open(str(path), 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(16000)  # 16kHz
        for i in range(16000):
            value = int(10000.0 * math.sin(2.0 * math.pi * 440.0 * i / 16000.0))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)
    return str(path)


def _post_json(url: str, payload: dict, token: str = None) -> dict:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def _get_json(url: str, token: str = None) -> dict:
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def test_all_endpoints():
    print("==================================================")
    print("TESTING ALL API ENDPOINTS ON http://127.0.0.1:8001")
    print("==================================================")

    # Wait for server startup
    for _ in range(10):
        try:
            req = urllib.request.urlopen(f"{BASE_URL}/")
            if req.getcode() == 200:
                print("\n[GET /] Server is alive!")
                print("Response:", req.read().decode())
                break
        except Exception:
            time.sleep(1)

    # 0. Authenticate. Every route below (except '/') now requires a JWT
    # (see MASTER_TODO.md's "No authentication/authorization anywhere"
    # item) -- register a throwaway citizen for the citizen-level calls,
    # and log in as the seeded demo officer for the two staff-only calls
    # (status update, department queue).
    print("\n[POST /auth/register] Registering a throwaway citizen for this run...")
    unique_email = f"api-test-{uuid.uuid4().hex[:8]}@example.com"
    reg_res = _post_json(
        f"{BASE_URL}/auth/register",
        {"email": unique_email, "password": "TestPass123!", "full_name": "API Test Citizen"},
    )
    assert reg_res["user"]["role"] == "citizen"
    citizen_token = reg_res["access_token"]
    print(f"SUCCESS: registered '{unique_email}' and obtained a citizen token.")

    print("\n[POST /auth/login] Logging in as the seeded demo officer...")
    officer_res = _post_json(
        f"{BASE_URL}/auth/login", {"email": "priya.sharma@pwd.gov.in", "password": "Officer@123"}
    )
    officer_token = officer_res["access_token"]
    print("SUCCESS: /auth/login works for the seeded officer account.")

    # 0b. Unauthenticated request to a protected route -> 401
    try:
        urllib.request.urlopen(f"{BASE_URL}/complaints")
        raise AssertionError("Expected 401 for an unauthenticated /complaints request.")
    except urllib.error.HTTPError as e:
        assert e.code == 401, f"Expected 401, got {e.code}"
        print("SUCCESS: unauthenticated /complaints correctly returns 401.")

    # 1. POST /transcribe
    print("\n[POST /transcribe] Testing STT endpoint...")
    wav_path = make_sample_wav("sample_test.wav")
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    with open(wav_path, "rb") as f:
        file_bytes = f.read()

    body1 = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="sample_test.wav"\r\n'
        f"Content-Type: audio/wav\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/transcribe",
        data=body1,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Authorization": f"Bearer {citizen_token}",
        },
    )
    with urllib.request.urlopen(req) as resp:
        stt_res = json.loads(resp.read().decode())
        print("Response:", json.dumps(stt_res, indent=2))
        assert "transcript" in stt_res
        print("SUCCESS: /transcribe endpoint works!")

    # 2. POST /analyze
    print("\n[POST /analyze] Testing LLM analysis endpoint...")
    analyze_res = _post_json(
        f"{BASE_URL}/analyze",
        {"transcript": "There has been no drinking water supply in Anna Nagar for the past three days."},
        token=citizen_token,
    )
    print("Response:", json.dumps(analyze_res, indent=2))
    assert analyze_res["category"] == "Water Supply"
    print("SUCCESS: /analyze endpoint works!")

    # 3. POST /duplicate-check
    print("\n[POST /duplicate-check] Testing duplicate check endpoint...")
    dup_res = _post_json(
        f"{BASE_URL}/duplicate-check",
        {
            "complaint_id": "CMP-HTTP-9001",
            "transcript": "There has been no drinking water supply in Anna Nagar for three days.",
            "category": "Water Supply",
            "department": "Water",
            "priority": "HIGH",
            "summary": "No drinking water supply in Anna Nagar for three days",
            "location": "Anna Nagar",
        },
        token=citizen_token,
    )
    print("Response:", json.dumps(dup_res, indent=2))
    assert "status" in dup_res
    print("SUCCESS: /duplicate-check endpoint works!")

    # 4. POST /complaints (Module 4)
    print("\n[POST /complaints] Testing Create Complaint & Ticket endpoint...")
    create_res = _post_json(
        f"{BASE_URL}/complaints",
        {
            "transcript": "There has been no drinking water supply in Anna Nagar for three days.",
            "language": "en",
            "category": "Water Supply",
            "department": "Water",
            "priority": "HIGH",
            "summary": "No drinking water supply for three days",
            "location": "Anna Nagar",
            "duplicate_status": "NEW",
            "duplicate_of": None,
        },
        token=citizen_token,
    )
    print("Response:", json.dumps(create_res, indent=2))
    created_cmp_id = create_res["complaint_id"]
    assert created_cmp_id.startswith("CMP-")
    assert create_res["ticket"]["ticket_id"].startswith("TKT-")
    assert create_res["status"] == "PENDING"
    print(f"SUCCESS: Created complaint {created_cmp_id} and ticket {create_res['ticket']['ticket_id']}")

    # 5. GET /complaints/{complaint_id} -- as the owning citizen
    print(f"\n[GET /complaints/{created_cmp_id}] Testing Get Complaint endpoint...")
    get_res = _get_json(f"{BASE_URL}/complaints/{created_cmp_id}", token=citizen_token)
    print("Response:", json.dumps(get_res, indent=2))
    assert get_res["complaint_id"] == created_cmp_id
    assert get_res["report_count"] >= 1
    print("SUCCESS: /complaints/{{id}} endpoint works!")

    # 5b. A different citizen must NOT be able to see it (ownership) -- 404
    other_reg = _post_json(
        f"{BASE_URL}/auth/register",
        {"email": f"api-test-other-{uuid.uuid4().hex[:8]}@example.com", "password": "TestPass123!", "full_name": "Other Citizen"},
    )
    other_token = other_reg["access_token"]
    try:
        urllib.request.urlopen(
            urllib.request.Request(
                f"{BASE_URL}/complaints/{created_cmp_id}", headers={"Authorization": f"Bearer {other_token}"}
            )
        )
        raise AssertionError("Expected 404: another citizen must not access this complaint.")
    except urllib.error.HTTPError as e:
        assert e.code == 404, f"Expected 404, got {e.code}"
        print("SUCCESS: another citizen correctly gets 404 for someone else's complaint.")

    # 6. GET /complaints -- as staff (officer), sees everything
    print("\n[GET /complaints] Testing List Complaints endpoint...")
    list_res = _get_json(f"{BASE_URL}/complaints?department=Water", token=officer_token)
    print(f"Response (Found {len(list_res)} water complaints)")
    assert len(list_res) > 0
    print("SUCCESS: /complaints endpoint works!")

    # 7. PATCH /complaints/{complaint_id}/status -- staff-only
    print(f"\n[PATCH /complaints/{created_cmp_id}/status] Testing Status Update endpoint...")
    # A citizen attempting this must be rejected with 403.
    try:
        urllib.request.urlopen(
            urllib.request.Request(
                f"{BASE_URL}/complaints/{created_cmp_id}/status",
                data=json.dumps({"status": "ASSIGNED"}).encode("utf-8"),
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {citizen_token}"},
                method="PATCH",
            )
        )
        raise AssertionError("Expected 403: citizens cannot update complaint status.")
    except urllib.error.HTTPError as e:
        assert e.code == 403, f"Expected 403, got {e.code}"
        print("SUCCESS: citizen correctly gets 403 attempting a status update.")

    req = urllib.request.Request(
        f"{BASE_URL}/complaints/{created_cmp_id}/status",
        data=json.dumps({"status": "ASSIGNED"}).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {officer_token}"},
        method="PATCH",
    )
    with urllib.request.urlopen(req) as resp:
        patch_res = json.loads(resp.read().decode())
        print("Response:", json.dumps(patch_res, indent=2))
        assert patch_res["status"] == "ASSIGNED"
        assert patch_res["ticket"]["status"] == "ASSIGNED"
        print("SUCCESS: /complaints/{{id}}/status endpoint works (as officer)!")

    # 8. GET /departments/Water/complaints -- staff-only
    print("\n[GET /departments/Water/complaints] Testing Department Queue endpoint...")
    dept_res = _get_json(f"{BASE_URL}/departments/Water/complaints", token=officer_token)
    print(f"Response (Found {len(dept_res)} complaints in Water queue)")
    assert len(dept_res) > 0
    print("SUCCESS: /departments/{{dept}}/complaints endpoint works!")

    # 9. POST /process-and-create-ticket
    print("\n[POST /process-and-create-ticket] Testing Combined Audio Pipeline...")
    body2 = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="sample_test.wav"\r\n'
        f"Content-Type: audio/wav\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/process-and-create-ticket",
        data=body2,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Authorization": f"Bearer {citizen_token}",
        },
    )
    with urllib.request.urlopen(req) as resp:
        pipeline_res = json.loads(resp.read().decode())
        print("Response:", json.dumps(pipeline_res, indent=2))
        assert "complaint" in pipeline_res
        assert "ticket" in pipeline_res
        assert "duplicate" in pipeline_res
        print("SUCCESS: /process-and-create-ticket endpoint works!")

    print("\n==================================================")
    print("ALL MODULE 1, 2, 3, 4 + AUTH API REGRESSION TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    test_all_endpoints()
