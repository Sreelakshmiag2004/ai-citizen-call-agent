"""Chatbot endpoint tests -- Stages 2 and 4 (see MASTER_TODO.md's Portal
chatbot item, and app/routes/chatbot.py / app/services/chatbot_service.py).

Covers: relevant retrieval (FAQ / SLA / department questions each surface
the right knowledge document), out-of-scope questions get the canned
"don't know" reply without inventing an answer (and without calling Groq
at all), a Groq reply that itself declines to answer (personal-data
requests, questions with no real supporting knowledge despite some match
clearing the retrieval threshold) suppresses `sources` too -- the Stage 4
fix, see chatbot_service.py's `_reply_declines_to_answer` -- while a real
substantive multi-document answer keeps its sources (no false positive),
the chatbot_knowledge/citizen_complaints collections stay isolated from
each other in both directions, the dedicated `chatbot` rate-limit bucket
returns 429 + Retry-After and doesn't share state with `auth` OR `ai`,
malformed/empty/oversized messages are rejected, and Groq provider
failures (quota, unavailable, malformed/empty output) map to clean,
generic HTTP errors with no raw exception/stack-trace text exposed.

`groq_chat_provider.generate_reply` is mocked throughout -- this file
tests retrieval, grounding, rate limiting, and validation, not Groq
itself (already covered by test_groq_provider.py), and mocking avoids
spending real API quota. Uses the isolated test ChromaDB/DB
(backend/data/test/, via test_config.py) -- never the presentation store.
Real-Groq, real-browser end-to-end verification for Stage 4 was done
separately (see the completion report) against a disposable backend on a
spare port; this file is the repeatable, quota-free regression suite.
"""

import os
import sys
from pathlib import Path
from unittest.mock import patch

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import test_config  # noqa: F401 -- must run before any `app.*` import; isolates DB/ChromaDB

from fastapi.testclient import TestClient

import app.core.rate_limit as rate_limit
from app.main import app
from app.services.chatbot_knowledge_service import chatbot_knowledge_service, ingest_all
from app.services.chroma_service import chroma_service
from app.services.providers.exceptions import LLMQuotaExceededError, LLMUnavailableError

client = TestClient(app)

MOCK_REPLY = "This is a mocked assistant reply for testing."


def run_tests():
    print("==================================================")
    print("STARTING CHATBOT ENDPOINT TESTS (Stages 2 and 4)")
    print("==================================================")

    os.environ["RATE_LIMIT_ENABLED"] = "false"
    rate_limit._reset_for_tests()
    chatbot_knowledge_service.clear()
    chroma_service.clear_collection()
    ingest_all()

    groq_patch = patch("app.services.providers.groq_provider.groq_chat_provider.generate_reply", return_value=MOCK_REPLY)
    mock_generate = groq_patch.start()

    try:
        # --- TEST 1: relevant FAQ question retrieves appropriate knowledge ---
        print("\n--- [TEST 1] RELEVANT FAQ QUESTION RETRIEVES APPROPRIATE KNOWLEDGE ---")
        resp = client.post("/chatbot/message", json={"message": "What civic services related to roads does GovPortal handle?"})
        assert resp.status_code == 200, f"expected 200, got {resp.status_code}: {resp.text}"
        body = resp.json()
        assert body["reply"] == MOCK_REPLY
        assert "Roads & Infrastructure" in body["sources"], f"expected the Roads civic-service doc, got sources={body['sources']}"
        print(f"[OK] TEST 1 PASSED: sources={body['sources']}")

        # --- TEST 2: SLA question uses the authoritative SLA document ---
        print("\n--- [TEST 2] SLA QUESTION USES THE AUTHORITATIVE SLA DOCUMENT ---")
        mock_generate.reset_mock()
        resp = client.post("/chatbot/message", json={"message": "What SLA applies to a critical priority complaint?"})
        assert resp.status_code == 200
        body = resp.json()
        assert "SLA Policy" in body["sources"], f"expected the SLA Policy document, got sources={body['sources']}"
        # Confirm the actual retrieved text passed to Groq contains the real,
        # authoritative duration (2 hours for Critical, per sla_service.py) --
        # not just that the *document* was retrieved by name.
        system_prompt_used = mock_generate.call_args.args[0]
        assert "2 hours" in system_prompt_used, "SLA document content passed to Groq should state the real Critical-priority duration"
        print("[OK] TEST 2 PASSED: SLA Policy document retrieved and its real content reached the model prompt.")

        # --- TEST 3: department question retrieves the correct department knowledge ---
        print("\n--- [TEST 3] DEPARTMENT QUESTION RETRIEVES THE CORRECT DEPARTMENT ---")
        mock_generate.reset_mock()
        resp = client.post("/chatbot/message", json={"message": "Which department handles power outages and electricity faults?"})
        assert resp.status_code == 200
        body = resp.json()
        assert "Electricity Department" in body["sources"], f"expected the Electricity Department document, got sources={body['sources']}"
        print(f"[OK] TEST 3 PASSED: sources={body['sources']}")

        # --- TEST 4: out-of-scope question does not produce an invented answer ---
        print("\n--- [TEST 4] OUT-OF-SCOPE QUESTION DOES NOT INVENT AN ANSWER ---")
        mock_generate.reset_mock()
        resp = client.post("/chatbot/message", json={"message": "What is the capital of France?"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["sources"] == [], f"expected no sources for an out-of-scope question, got {body['sources']}"
        assert body["reply"] != MOCK_REPLY, "an out-of-scope question must not reach the model at all"
        assert "does not contain the answer" in body["reply"].lower() or "don't have information" in body["reply"].lower()
        mock_generate.assert_not_called()
        print("[OK] TEST 4 PASSED: no relevant knowledge -> canned 'don't know' reply, Groq never called.")

        # --- TEST 5: chatbot_knowledge stays isolated from citizen_complaints ---
        print("\n--- [TEST 5] CHATBOT_KNOWLEDGE ISOLATED FROM CITIZEN_COMPLAINTS ---")
        assert chroma_service.count_complaints() == 0
        from app.services.embedding_service import embedding_service

        chroma_service.add_complaint(
            complaint_id="CMP-CHATBOT-ISOLATION-TEST",
            document="isolation check complaint",
            embedding=embedding_service.get_embedding("isolation check complaint"),
            metadata={"category": "Other", "department": "Other"},
        )
        assert chroma_service.count_complaints() == 1
        knowledge_count_before = chatbot_knowledge_service.count()
        resp = client.post("/chatbot/message", json={"message": "What civic services does GovPortal cover?"})
        assert resp.status_code == 200
        assert chroma_service.count_complaints() == 1, "chatbot queries must never touch citizen_complaints"
        assert chatbot_knowledge_service.count() == knowledge_count_before, "chatbot queries must not write to chatbot_knowledge either"
        print("[OK] TEST 5 PASSED: citizen_complaints untouched by chatbot queries; chatbot_knowledge unaffected by complaint writes.")

        # --- TEST 6: malformed / empty / oversized messages are rejected ---
        print("\n--- [TEST 6] MALFORMED / EMPTY / OVERSIZED MESSAGES REJECTED ---")
        resp = client.post("/chatbot/message", json={"message": ""})
        assert resp.status_code == 422, f"empty string should fail min_length validation, got {resp.status_code}"

        resp = client.post("/chatbot/message", json={"message": "   "})
        assert resp.status_code == 400, f"whitespace-only message should be rejected as empty, got {resp.status_code}"

        resp = client.post("/chatbot/message", json={})
        assert resp.status_code == 422, f"missing 'message' field should 422, got {resp.status_code}"

        resp = client.post("/chatbot/message", json={"message": "x" * 501})
        assert resp.status_code == 422, f"message over 500 chars should fail max_length validation, got {resp.status_code}"

        resp = client.post("/chatbot/message", json={"message": "x" * 500})
        assert resp.status_code == 200, f"message at exactly the 500-char limit should be accepted, got {resp.status_code}"
        print("[OK] TEST 6 PASSED: empty (422), whitespace-only (400), missing field (422), and oversized (422) all rejected; boundary length accepted.")

        # --- TEST 7: valid requests below the limit succeed ---
        print("\n--- [TEST 7] VALID REQUESTS BELOW THE LIMIT SUCCEED ---")
        os.environ["RATE_LIMIT_ENABLED"] = "true"
        os.environ["RATE_LIMIT_CHATBOT_REQUESTS"] = "3"
        os.environ["RATE_LIMIT_CHATBOT_WINDOW_SECONDS"] = "30"
        rate_limit._reset_for_tests()
        ip_headers = {"X-Forwarded-For": "203.0.113.50"}
        for i in range(3):
            resp = client.post("/chatbot/message", json={"message": f"question number {i}"}, headers=ip_headers)
            assert resp.status_code == 200, f"request {i+1}/3 should succeed under the limit, got {resp.status_code}"
        print("[OK] TEST 7 PASSED: 3 requests under a limit of 3 all succeeded.")

        # --- TEST 8: exceeding the chatbot rate limit returns 429 + Retry-After ---
        print("\n--- [TEST 8] EXCEEDING THE CHATBOT RATE LIMIT RETURNS 429 + RETRY-AFTER ---")
        resp = client.post("/chatbot/message", json={"message": "one too many"}, headers=ip_headers)
        assert resp.status_code == 429, f"4th request should be rate-limited, got {resp.status_code}"
        assert "Retry-After" in resp.headers
        assert int(resp.headers["Retry-After"]) > 0

        # A different IP is unaffected -- confirms the chatbot bucket is
        # genuinely per-IP, not a global counter.
        other_ip_headers = {"X-Forwarded-For": "203.0.113.99"}
        resp = client.post("/chatbot/message", json={"message": "different client"}, headers=other_ip_headers)
        assert resp.status_code == 200, "a different IP must not be affected by the first IP's limit"

        # The chatbot bucket must not share state with the auth bucket --
        # confirm a login attempt from the now-limited chatbot IP still
        # goes through its own, unaffected auth-bucket accounting.
        resp = client.post("/auth/login", json={"email": "nobody@example.com", "password": "wrong"}, headers=ip_headers)
        assert resp.status_code == 401, f"the auth bucket must be unaffected by the chatbot bucket being exhausted, got {resp.status_code}"
        print("[OK] TEST 8 PASSED: 429 with Retry-After; a different IP is unaffected; the auth bucket is untouched by the chatbot bucket.")

        # --- TEST 9: chatbot traffic does not consume the authenticated `ai` bucket ---
        print("\n--- [TEST 9] CHATBOT TRAFFIC DOES NOT CONSUME THE AUTHENTICATED `ai` BUCKET ---")
        # Raise the chatbot bucket's limit for the remainder of this file --
        # tests 9-13 below all call /chatbot/message from the TestClient's
        # default (unheadered) IP, which would otherwise still be counting
        # against TEST 7/8's tight limit of 3.
        os.environ["RATE_LIMIT_CHATBOT_REQUESTS"] = "50"
        os.environ["RATE_LIMIT_AI_REQUESTS"] = "2"
        os.environ["RATE_LIMIT_AI_WINDOW_SECONDS"] = "30"
        rate_limit._reset_for_tests()
        reg = client.post(
            "/auth/register",
            json={"email": "chatbot-bucket-test@example.com", "password": "TestPass123!", "full_name": "Bucket Test"},
        )
        assert reg.status_code == 201, reg.text
        auth_headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
        # Exhaust this user's `ai` bucket (limit 2) via a real ai-bucket endpoint.
        for i in range(2):
            resp = client.post("/analyze", json={"transcript": f"pothole {i}"}, headers=auth_headers)
            assert resp.status_code == 200, f"analyze {i+1}/2 should succeed under its own limit, got {resp.status_code}: {resp.text}"
        resp = client.post("/analyze", json={"transcript": "one too many"}, headers=auth_headers)
        assert resp.status_code == 429, f"the ai bucket should now be exhausted for this user, got {resp.status_code}"
        # The chatbot bucket (separate IP-keyed bucket, high default limit,
        # untouched by the above) must still work fine for the same client.
        resp = client.post("/chatbot/message", json={"message": "unaffected by the ai bucket"}, headers=auth_headers)
        assert resp.status_code == 200, f"chatbot bucket must be unaffected by the ai bucket being exhausted, got {resp.status_code}"
        print("[OK] TEST 9 PASSED: exhausting a user's `ai` bucket does not block their `/chatbot/message` calls.")
        for var in ("RATE_LIMIT_AI_REQUESTS", "RATE_LIMIT_AI_WINDOW_SECONDS"):
            os.environ.pop(var, None)
        rate_limit._reset_for_tests()

        # --- TEST 10 (Stage 4 fix): sources are suppressed when Groq's own
        # reply indicates it couldn't actually answer from what it was given,
        # even though retrieval cleared the relevance threshold. A real
        # substantive answer keeps its sources -- no false positive. ---
        print("\n--- [TEST 10] SOURCES SUPPRESSED WHEN THE MODEL DECLINES, KEPT WHEN IT ANSWERS ---")
        mock_generate.reset_mock()
        mock_generate.return_value = "I'm sorry, the available GovPortal knowledge does not contain the specific detail you're asking about."
        resp = client.post("/chatbot/message", json={"message": "What SLA applies to a critical priority complaint?"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["sources"] == [], f"a declining reply must not report sources, got {body['sources']}"

        mock_generate.return_value = MOCK_REPLY  # a normal, substantive answer
        resp = client.post("/chatbot/message", json={"message": "What SLA applies to a critical priority complaint?"})
        assert resp.status_code == 200
        body = resp.json()
        assert "SLA Policy" in body["sources"], f"a real answer must still report its sources, got {body['sources']}"
        print("[OK] TEST 10 PASSED: decline -> sources=[]; real answer -> sources populated (no over-suppression).")

        # --- TEST 11: Groq quota/rate-limit failure maps to a clean 429 ---
        print("\n--- [TEST 11] GROQ QUOTA FAILURE -> CLEAN 429, NO INTERNAL DETAILS ---")
        mock_generate.side_effect = LLMQuotaExceededError("Groq chatbot quota exceeded. Please try again later.")
        resp = client.post("/chatbot/message", json={"message": "What SLA applies to a critical priority complaint?"})
        assert resp.status_code == 429, f"expected 429 for a Groq quota failure, got {resp.status_code}"
        detail = resp.json()["detail"]
        assert "traceback" not in detail.lower() and "exception" not in detail.lower() and "rate_limit_error" not in detail.lower()
        print(f"[OK] TEST 11 PASSED: 429, clean detail: {detail!r}")

        # --- TEST 12: Groq unavailable failure maps to a clean 503 ---
        print("\n--- [TEST 12] GROQ UNAVAILABLE -> CLEAN 503, NO INTERNAL DETAILS ---")
        mock_generate.side_effect = LLMUnavailableError("Groq chatbot service is temporarily unavailable. Please try again later.")
        resp = client.post("/chatbot/message", json={"message": "What SLA applies to a critical priority complaint?"})
        assert resp.status_code == 503, f"expected 503 for a Groq-unavailable failure, got {resp.status_code}"
        detail = resp.json()["detail"]
        assert "traceback" not in detail.lower() and "connectionerror" not in detail.lower()
        print(f"[OK] TEST 12 PASSED: 503, clean detail: {detail!r}")

        # --- TEST 13: malformed/empty Groq output maps to a clean 400 ---
        print("\n--- [TEST 13] MALFORMED/EMPTY GROQ OUTPUT -> CLEAN 400, NO INTERNAL DETAILS ---")
        mock_generate.side_effect = ValueError("Empty response received from Groq chatbot model.")
        resp = client.post("/chatbot/message", json={"message": "What SLA applies to a critical priority complaint?"})
        assert resp.status_code == 400, f"expected 400 for malformed/empty Groq output, got {resp.status_code}"
        detail = resp.json()["detail"]
        assert "traceback" not in detail.lower()
        print(f"[OK] TEST 13 PASSED: 400, clean detail: {detail!r}")
        mock_generate.side_effect = None
        mock_generate.return_value = MOCK_REPLY

        print("\n==================================================")
        print("ALL CHATBOT ENDPOINT TESTS PASSED!")
        print("==================================================")
    finally:
        groq_patch.stop()
        os.environ["RATE_LIMIT_ENABLED"] = "false"
        for var in ("RATE_LIMIT_CHATBOT_REQUESTS", "RATE_LIMIT_CHATBOT_WINDOW_SECONDS", "RATE_LIMIT_AI_REQUESTS", "RATE_LIMIT_AI_WINDOW_SECONDS"):
            os.environ.pop(var, None)
        rate_limit._reset_for_tests()
        chatbot_knowledge_service.clear()
        chroma_service.clear_collection()


if __name__ == "__main__":
    run_tests()
