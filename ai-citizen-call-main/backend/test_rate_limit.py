"""Rate limiting tests (see MASTER_TODO.md's "No rate limiting on any
backend endpoint" item, and app/core/rate_limit.py).

Rate limiting is OFF by default for the rest of the test suite (see
test_config.py) so unrelated tests making many rapid AI-endpoint / login
calls aren't accidentally 429'd. This file is the one place that turns it
back on -- with tight, explicit limits so the assertions below run fast
and deterministically -- and restores the "off" default when it's done,
since `run_tests.py` runs every test module in one process and later
copies `os.environ` for the live-server subprocess used by
`test_api_endpoints.py`.

`analysis_service.analyze_complaint` (the LLM call -- Groq or Gemini,
whichever `LLM_PROVIDER` is active) is mocked throughout: this file is
testing the rate limiter, not the LLM provider, and mocking avoids
spending real API quota on request volume that exists purely to cross a
rate limit. TEST 6 does call the real STT provider (`STT_PROVIDER`,
currently Groq's Whisper API in this project's configured environment --
see MASTER_TODO.md; local faster-whisper if `STT_PROVIDER=local`) a
handful of times to prove `/transcribe` and the two ticket-creating
endpoints still work end-to-end, and `/duplicate-check` for real (local
sentence-transformers + ChromaDB, no external API either way).
"""

import io
import os
import sys
import time
from pathlib import Path
from unittest.mock import patch

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import test_config  # noqa: F401 -- must run before any `app.*` import; isolates DB/ChromaDB

from fastapi.testclient import TestClient

import app.core.rate_limit as rate_limit
from app.database.database import Base, SessionLocal, engine
from app.main import app
from app.services.user_service import seed_demo_users

client = TestClient(app)

SAMPLE_WAV = backend_dir / "sample_test.wav"

_MOCK_ANALYSIS = {
    "category": "Water Supply",
    "department": "Water",
    "priority": "MEDIUM",
    "summary": "Mocked analysis for rate-limit testing.",
    "location": None,
    "keywords": ["test"],
}


def _register(email: str) -> str:
    resp = client.post(
        "/auth/register",
        json={"email": email, "password": "TestPass123!", "full_name": "Rate Limit Tester"},
        headers={"X-Forwarded-For": "203.0.113.250"},  # outside every IP-bucket test below
    )
    assert resp.status_code == 201, f"registration for {email} failed: {resp.status_code} {resp.text}"
    return resp.json()["access_token"]


def _set_ai_limit(requests: int, window_seconds: int) -> None:
    os.environ["RATE_LIMIT_AI_REQUESTS"] = str(requests)
    os.environ["RATE_LIMIT_AI_WINDOW_SECONDS"] = str(window_seconds)


def _set_auth_limit(requests: int, window_seconds: int) -> None:
    os.environ["RATE_LIMIT_AUTH_REQUESTS"] = str(requests)
    os.environ["RATE_LIMIT_AUTH_WINDOW_SECONDS"] = str(window_seconds)


def run_tests():
    print("==================================================")
    print("STARTING RATE LIMITING TESTS")
    print("==================================================")

    if not SAMPLE_WAV.exists():
        raise RuntimeError(f"Missing fixture audio file: {SAMPLE_WAV}")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_users(db)
    finally:
        db.close()

    os.environ["RATE_LIMIT_ENABLED"] = "true"
    rate_limit._reset_for_tests()

    analyze_patch = patch(
        "app.services.analysis_service.analysis_service.analyze_complaint",
        return_value=_MOCK_ANALYSIS,
    )
    analyze_patch.start()

    try:
        # --- TEST 1: requests below the limit succeed ---
        print("\n--- [TEST 1] REQUESTS BELOW THE LIMIT SUCCEED ---")
        _set_ai_limit(requests=3, window_seconds=30)
        rate_limit._reset_for_tests()
        token_a = _register("ratelimit.userA@example.com")
        headers_a = {"Authorization": f"Bearer {token_a}"}
        for i in range(3):
            resp = client.post("/analyze", json={"transcript": f"pothole on main road {i}"}, headers=headers_a)
            assert resp.status_code == 200, f"request {i+1}/3 should succeed, got {resp.status_code}: {resp.text}"
        print("[OK] TEST 1 PASSED: 3 requests under a limit of 3 all succeeded.")

        # --- TEST 2: exceeding the limit returns 429 with Retry-After ---
        print("\n--- [TEST 2] EXCEEDING THE LIMIT RETURNS 429 WITH RETRY-AFTER ---")
        resp = client.post("/analyze", json={"transcript": "one too many"}, headers=headers_a)
        assert resp.status_code == 429, f"4th request should be rate-limited, got {resp.status_code}: {resp.text}"
        assert "Retry-After" in resp.headers, "429 response must include a Retry-After header"
        retry_after = int(resp.headers["Retry-After"])
        assert retry_after > 0, f"Retry-After should be a positive number of seconds, got {retry_after}"
        print(f"[OK] TEST 2 PASSED: 429 returned with Retry-After: {retry_after}s.")

        # --- TEST 3: different clients are independently limited ---
        print("\n--- [TEST 3] DIFFERENT CLIENTS ARE INDEPENDENTLY LIMITED ---")
        token_b = _register("ratelimit.userB@example.com")
        headers_b = {"Authorization": f"Bearer {token_b}"}
        resp = client.post("/analyze", json={"transcript": "unrelated user's first request"}, headers=headers_b)
        assert resp.status_code == 200, (
            f"a different authenticated user should not be affected by user A's limit, got {resp.status_code}: {resp.text}"
        )
        # Confirm user A is still limited (proves this is genuinely per-user, not a global counter that
        # happened to also allow user B by coincidence).
        resp = client.post("/analyze", json={"transcript": "user A still blocked"}, headers=headers_a)
        assert resp.status_code == 429, "user A should still be rate-limited independently of user B's request"
        print("[OK] TEST 3 PASSED: user B unaffected by user A's limit; user A remains limited.")

        # --- TEST 4: configuration values are honored ---
        print("\n--- [TEST 4] CONFIGURATION VALUES ARE HONORED ---")
        _set_ai_limit(requests=1, window_seconds=30)
        rate_limit._reset_for_tests()
        token_c = _register("ratelimit.userC@example.com")
        headers_c = {"Authorization": f"Bearer {token_c}"}
        resp = client.post("/analyze", json={"transcript": "only request allowed"}, headers=headers_c)
        assert resp.status_code == 200, f"1st request under a limit of 1 should succeed, got {resp.status_code}"
        resp = client.post("/analyze", json={"transcript": "second request, limit is 1"}, headers=headers_c)
        assert resp.status_code == 429, f"2nd request should be blocked when RATE_LIMIT_AI_REQUESTS=1, got {resp.status_code}"
        print("[OK] TEST 4 PASSED: RATE_LIMIT_AI_REQUESTS=1 is honored exactly (not hardcoded).")

        # Window expiry: a short window should admit a new request once it elapses.
        _set_ai_limit(requests=1, window_seconds=1)
        rate_limit._reset_for_tests()
        resp = client.post("/analyze", json={"transcript": "first in short window"}, headers=headers_c)
        assert resp.status_code == 200
        resp = client.post("/analyze", json={"transcript": "second, same short window"}, headers=headers_c)
        assert resp.status_code == 429
        time.sleep(1.2)
        resp = client.post("/analyze", json={"transcript": "third, after window expiry"}, headers=headers_c)
        assert resp.status_code == 200, "a new window should admit a fresh request once RATE_LIMIT_AI_WINDOW_SECONDS elapses"
        print("[OK] TEST 4b PASSED: RATE_LIMIT_AI_WINDOW_SECONDS is honored -- a new window resets the count.")

        # --- TEST 5: authenticated requests behave correctly (auth still enforced, keyed by user not IP) ---
        print("\n--- [TEST 5] AUTHENTICATED REQUESTS BEHAVE CORRECTLY ---")
        resp = client.post("/analyze", json={"transcript": "no token"})
        assert resp.status_code == 401, f"unauthenticated request should 401, not be silently rate-limited or allowed, got {resp.status_code}"
        _set_ai_limit(requests=5, window_seconds=30)
        rate_limit._reset_for_tests()
        token_d = _register("ratelimit.userD@example.com")
        headers_d = {"Authorization": f"Bearer {token_d}"}
        # Same TestClient / same underlying connection (i.e. same "IP") as
        # every other call in this file -- succeeds because the AI bucket is
        # keyed by verified user id, not by IP.
        resp = client.post("/analyze", json={"transcript": "fresh user, fresh bucket"}, headers=headers_d)
        assert resp.status_code == 200, "a new authenticated user from the same client must get their own bucket"
        print("[OK] TEST 5 PASSED: unauthenticated request 401s; authenticated AI-bucket keying is per-user, not per-IP.")

        # --- TEST 6: existing AI endpoints still work (not just /analyze) ---
        print("\n--- [TEST 6] EXISTING AI ENDPOINTS STILL WORK UNDER THE LIMIT ---")
        _set_ai_limit(requests=10, window_seconds=30)
        rate_limit._reset_for_tests()
        token_e = _register("ratelimit.userE@example.com")
        headers_e = {"Authorization": f"Bearer {token_e}"}
        real_wav_bytes = SAMPLE_WAV.read_bytes()

        resp = client.post(
            "/transcribe", files={"file": ("clip.wav", io.BytesIO(real_wav_bytes), "audio/wav")}, headers=headers_e
        )
        assert resp.status_code == 200, f"/transcribe should still work, got {resp.status_code}: {resp.text}"
        assert "transcript" in resp.json()

        resp = client.post(
            "/duplicate-check", json={"transcript": "no water supply for two days"}, headers=headers_e
        )
        assert resp.status_code == 200, f"/duplicate-check should still work, got {resp.status_code}: {resp.text}"
        assert "status" in resp.json()

        resp = client.post("/analyze", json={"transcript": "streetlight broken"}, headers=headers_e)
        assert resp.status_code == 200, f"/analyze should still work, got {resp.status_code}: {resp.text}"

        resp = client.post(
            "/process-complaint", files={"file": ("clip.wav", io.BytesIO(real_wav_bytes), "audio/wav")}, headers=headers_e
        )
        assert resp.status_code == 200, f"/process-complaint should still work, got {resp.status_code}: {resp.text}"

        resp = client.post(
            "/process-and-create-ticket",
            files={"file": ("clip.wav", io.BytesIO(real_wav_bytes), "audio/wav")},
            headers=headers_e,
        )
        assert resp.status_code == 200, f"/process-and-create-ticket should still work, got {resp.status_code}: {resp.text}"
        print("[OK] TEST 6 PASSED: /transcribe, /duplicate-check, /analyze, /process-complaint, /process-and-create-ticket all still work under the limit.")

        # --- TEST 7: /auth/login and /auth/register are rate-limited per client IP ---
        print("\n--- [TEST 7] AUTH ENDPOINTS ARE RATE-LIMITED PER CLIENT IP ---")
        _set_auth_limit(requests=3, window_seconds=30)
        rate_limit._reset_for_tests()
        ip_headers_x = {"X-Forwarded-For": "198.51.100.10"}
        for i in range(3):
            resp = client.post(
                "/auth/login", json={"email": "nobody@example.com", "password": "wrong"}, headers=ip_headers_x
            )
            assert resp.status_code == 401, f"login {i+1}/3 (bad creds) should 401, got {resp.status_code}"
        resp = client.post("/auth/login", json={"email": "nobody@example.com", "password": "wrong"}, headers=ip_headers_x)
        assert resp.status_code == 429, f"4th login attempt from the same IP should be rate-limited, got {resp.status_code}"
        assert "Retry-After" in resp.headers

        # Register shares the same auth bucket/IP -- also blocked now.
        resp = client.post(
            "/auth/register",
            json={"email": "ratelimit.blockedip@example.com", "password": "TestPass123!", "full_name": "Blocked"},
            headers=ip_headers_x,
        )
        assert resp.status_code == 429, "register from the same already-limited IP should also be blocked (shared auth bucket)"

        # A different client IP is unaffected.
        ip_headers_y = {"X-Forwarded-For": "198.51.100.20"}
        resp = client.post("/auth/login", json={"email": "nobody@example.com", "password": "wrong"}, headers=ip_headers_y)
        assert resp.status_code == 401, f"a different IP must not be affected by IP X's limit, got {resp.status_code}"
        print("[OK] TEST 7 PASSED: /auth/login and /auth/register share one per-IP bucket; different IPs are independent.")

        # --- TEST 8: RATE_LIMIT_ENABLED=false disables limiting entirely ---
        print("\n--- [TEST 8] RATE_LIMIT_ENABLED=false DISABLES LIMITING ---")
        os.environ["RATE_LIMIT_ENABLED"] = "false"
        _set_ai_limit(requests=1, window_seconds=30)
        rate_limit._reset_for_tests()
        for i in range(4):
            resp = client.post("/analyze", json={"transcript": f"kill switch check {i}"}, headers=headers_e)
            assert resp.status_code == 200, f"with RATE_LIMIT_ENABLED=false, request {i+1}/4 should succeed regardless of the limit, got {resp.status_code}"
        print("[OK] TEST 8 PASSED: RATE_LIMIT_ENABLED=false is an effective kill switch.")

        print("\n==================================================")
        print("ALL RATE LIMITING TESTS PASSED!")
        print("==================================================")
    finally:
        analyze_patch.stop()
        # Restore the ambient "off" default for every other test module /
        # the live-server subprocess run_tests.py launches afterward.
        os.environ["RATE_LIMIT_ENABLED"] = "false"
        for var in (
            "RATE_LIMIT_AI_REQUESTS",
            "RATE_LIMIT_AI_WINDOW_SECONDS",
            "RATE_LIMIT_AUTH_REQUESTS",
            "RATE_LIMIT_AUTH_WINDOW_SECONDS",
        ):
            os.environ.pop(var, None)
        rate_limit._reset_for_tests()


if __name__ == "__main__":
    run_tests()
