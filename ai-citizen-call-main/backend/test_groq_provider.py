"""GroqCloud provider tests -- all Groq API calls are MOCKED so this test
suite never consumes real Groq quota (no GROQ_API_KEY is configured in
this environment anyway). Covers: successful mocked transcription,
successful mocked complaint analysis, structured-output schema
validation, Groq timeout/quota/auth/connection error handling, malformed
model output, and that the analysis_service/whisper_service dispatchers
correctly route to Groq (via LLM_PROVIDER/STT_PROVIDER) end-to-end through
the real HTTP endpoints while everything downstream (duplicate detection,
complaint/ticket creation, SLA) stays the real, unmocked pipeline -- only
the Groq network call itself is faked.
"""

import json
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import test_config  # noqa: F401 -- must run before any `app.*` import; isolates DB/ChromaDB

import httpx
from fastapi.testclient import TestClient

import groq as groq_sdk
from app.database.database import Base, SessionLocal, engine
from app.main import app
from app.services.providers import config as provider_config
from app.services.providers.exceptions import LLMQuotaExceededError, LLMUnavailableError
from app.services.providers.groq_provider import GroqAnalysisProvider, GroqTranscriptionProvider
from app.services.user_service import seed_demo_users

client = TestClient(app)
SAMPLE_WAV = backend_dir / "sample_test.wav"

VALID_ANALYSIS_JSON = json.dumps(
    {
        "category": "Water Supply",
        "department": "Water",
        "priority": "HIGH",
        "summary": "No drinking water supply in Anna Nagar for three days.",
        "location": "Anna Nagar",
        "keywords": ["water", "supply", "shortage"],
    }
)


def _chat_response(content: str):
    message = SimpleNamespace(content=content)
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])


def _transcription_response(payload: dict):
    resp = MagicMock()
    resp.model_dump.return_value = payload
    return resp


def _http_request():
    return httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")


def _http_response(status_code: int):
    return httpx.Response(status_code=status_code, request=_http_request())


def run_tests():
    print("==================================================")
    print("STARTING GROQCLOUD PROVIDER TESTS")
    print("==================================================")

    # A real API key isn't required for these mocked calls, but the
    # provider checks for one before ever constructing a client, so a
    # dummy value is set for the duration of this test run only. The real
    # value (which may be a genuine key if this process is running with
    # Groq configured as the active provider) is saved here and restored
    # at every point below, instead of ever hardcoding "" -- this module
    # runs in-process alongside other test modules via run_tests.py, and
    # clobbering the shared config global with a hardcoded value would
    # corrupt whichever test runs next in the same process.
    original_groq_api_key = provider_config.GROQ_API_KEY
    provider_config.GROQ_API_KEY = "test-key-not-real"

    # --------------------------------------------------------------
    # TEST 1: successful Groq complaint analysis (mocked)
    # --------------------------------------------------------------
    print("\n--- [TEST 1] SUCCESSFUL GROQ COMPLAINT ANALYSIS (MOCKED) ---")
    provider = GroqAnalysisProvider()
    with patch("app.services.providers.groq_provider.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.return_value = _chat_response(VALID_ANALYSIS_JSON)
        result = provider.analyze_complaint("There has been no water supply in Anna Nagar for three days.")

    assert result["category"] == "Water Supply"
    assert result["department"] == "Water"
    assert result["priority"] == "HIGH"
    assert result["location"] == "Anna Nagar"
    assert result["keywords"] == ["water", "supply", "shortage"]
    assert set(result.keys()) == {"category", "department", "priority", "summary", "location", "keywords"}
    print("[OK] TEST 1 PASSED: mocked Groq analysis returns the exact existing structured field contract.")

    # --------------------------------------------------------------
    # TEST 2: successful Groq transcription (mocked)
    # --------------------------------------------------------------
    print("\n--- [TEST 2] SUCCESSFUL GROQ TRANSCRIPTION (MOCKED) ---")
    stt_provider = GroqTranscriptionProvider()
    with patch("app.services.providers.groq_provider.Groq") as MockGroq:
        MockGroq.return_value.audio.transcriptions.create.return_value = _transcription_response(
            {
                "text": "There is no water supply in my street.",
                "language": "english",
                "duration": 4.2,
                "segments": [{"start": 0.0, "end": 4.2, "text": "There is no water supply in my street."}],
            }
        )
        result = stt_provider.transcribe(str(SAMPLE_WAV))

    assert result["transcript"] == "There is no water supply in my street."
    assert result["language"] == "english"
    assert result["language_probability"] == 1.0
    assert result["segments"] == [{"start": 0.0, "end": 4.2, "text": "There is no water supply in my street."}]
    assert set(result.keys()) == {"language", "language_probability", "transcript", "segments"}
    print("[OK] TEST 2 PASSED: mocked Groq transcription returns the exact existing STT field contract.")

    # --------------------------------------------------------------
    # TEST 3: structured analysis validation (malformed shape rejected)
    # --------------------------------------------------------------
    print("\n--- [TEST 3] STRUCTURED ANALYSIS SCHEMA VALIDATION ---")
    malformed = json.dumps({"category": "Water", "department": "Water", "priority": "HIGH", "summary": "x", "keywords": "not-a-list"})
    with patch("app.services.providers.groq_provider.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.return_value = _chat_response(malformed)
        try:
            provider.analyze_complaint("test transcript")
            raise AssertionError("expected ValueError for keywords not being a list")
        except ValueError as e:
            assert "schema" in str(e).lower()

    # A near-miss but still well-typed response (missing/extra fields,
    # wrong-cased department) must NOT be rejected -- sanitize_analysis()
    # is the layer responsible for correcting that, not the schema.
    lenient = json.dumps({"department": "water", "priority": "extreme", "keywords": []})
    with patch("app.services.providers.groq_provider.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.return_value = _chat_response(lenient)
        result = provider.analyze_complaint("test transcript")
    assert result["department"] == "Water"  # case-corrected
    assert result["priority"] == "MEDIUM"  # invalid enum value -> safe default
    print("[OK] TEST 3 PASSED: wrong-shaped output rejected before reaching the pipeline; near-miss output normalized instead of rejected.")

    # --------------------------------------------------------------
    # TEST 4: Groq timeout/quota/auth/connection error handling
    # --------------------------------------------------------------
    print("\n--- [TEST 4] GROQ ERROR HANDLING ---")
    error_cases = [
        (groq_sdk.RateLimitError("rate limited", response=_http_response(429), body=None), LLMQuotaExceededError),
        (groq_sdk.AuthenticationError("bad key", response=_http_response(401), body=None), LLMUnavailableError),
        (groq_sdk.APITimeoutError(request=_http_request()), LLMUnavailableError),
        (groq_sdk.APIConnectionError(request=_http_request()), LLMUnavailableError),
    ]
    for exc, expected_type in error_cases:
        with patch("app.services.providers.groq_provider.Groq") as MockGroq:
            MockGroq.return_value.chat.completions.create.side_effect = exc
            try:
                provider.analyze_complaint("test transcript")
                raise AssertionError(f"expected {expected_type.__name__} for {type(exc).__name__}")
            except expected_type:
                pass
    print("[OK] TEST 4 PASSED: RateLimitError -> LLMQuotaExceededError; Authentication/Timeout/Connection errors -> LLMUnavailableError.")

    # --------------------------------------------------------------
    # TEST 5: invalid/malformed model output (unparseable JSON, empty response)
    # --------------------------------------------------------------
    print("\n--- [TEST 5] INVALID/MALFORMED MODEL OUTPUT ---")
    with patch("app.services.providers.groq_provider.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.return_value = _chat_response("not valid json at all {{{")
        try:
            provider.analyze_complaint("test transcript")
            raise AssertionError("expected ValueError for unparseable JSON")
        except ValueError as e:
            assert "json" in str(e).lower()

    with patch("app.services.providers.groq_provider.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.return_value = _chat_response("")
        try:
            provider.analyze_complaint("test transcript")
            raise AssertionError("expected ValueError for empty response")
        except ValueError as e:
            assert "empty" in str(e).lower()
    print("[OK] TEST 5 PASSED: unparseable JSON and empty responses both raise ValueError, no fabricated data returned.")

    provider_config.GROQ_API_KEY = ""  # deliberately empty -- TEST 6 exercises the missing-key path

    # --------------------------------------------------------------
    # TEST 6: missing GROQ_API_KEY fails cleanly (no fabricated result)
    # --------------------------------------------------------------
    print("\n--- [TEST 6] MISSING GROQ_API_KEY ---")
    try:
        provider.analyze_complaint("test transcript")
        raise AssertionError("expected RuntimeError when GROQ_API_KEY is unset")
    except RuntimeError as e:
        assert "not configured" in str(e).lower()
    print("[OK] TEST 6 PASSED: missing GROQ_API_KEY raises cleanly instead of silently falling back to fake data.")

    # --------------------------------------------------------------
    # TEST 7: dispatcher end-to-end -- LLM_PROVIDER=groq / STT_PROVIDER=groq
    # routed through the real HTTP endpoints, with only the Groq network
    # call mocked. Duplicate detection, complaint/ticket creation, and SLA
    # are the REAL, unmocked pipeline.
    # --------------------------------------------------------------
    print("\n--- [TEST 7] DISPATCHER END-TO-END (GROQ ACTIVE, REAL PIPELINE DOWNSTREAM) ---")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_demo_users(db)

    reg = client.post(
        "/auth/register",
        json={"email": "groq.citizen@example.com", "password": "TestPass123!", "full_name": "Groq Citizen"},
    )
    assert reg.status_code == 201, reg.text
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    provider_config.GROQ_API_KEY = "test-key-not-real"
    original_llm_provider = provider_config.LLM_PROVIDER
    original_stt_provider = provider_config.STT_PROVIDER
    provider_config.LLM_PROVIDER = "groq"
    provider_config.STT_PROVIDER = "groq"
    try:
        with patch("app.services.providers.groq_provider.Groq") as MockGroq:
            mock_client = MockGroq.return_value
            mock_client.audio.transcriptions.create.return_value = _transcription_response(
                {
                    "text": "There has been no drinking water supply in Anna Nagar for three days.",
                    "language": "english",
                    "segments": [],
                }
            )
            mock_client.chat.completions.create.return_value = _chat_response(VALID_ANALYSIS_JSON)

            # /transcribe routed to Groq
            resp = client.post(
                "/transcribe",
                files={"file": ("sample_test.wav", open(SAMPLE_WAV, "rb"), "audio/wav")},
                headers=headers,
            )
            assert resp.status_code == 200, resp.text
            assert resp.json()["transcript"] == "There has been no drinking water supply in Anna Nagar for three days."

            # /analyze routed to Groq
            resp = client.post("/analyze", json={"transcript": "no water for days"}, headers=headers)
            assert resp.status_code == 200, resp.text
            assert resp.json()["department"] == "Water"

            # Full pipeline (STT -> LLM -> duplicate detection -> complaint/ticket -> SLA),
            # both AI steps mocked, everything else real.
            resp = client.post(
                "/process-and-create-ticket",
                files={"file": ("sample_test.wav", open(SAMPLE_WAV, "rb"), "audio/wav")},
                headers=headers,
            )
            assert resp.status_code == 200, resp.text
            body = resp.json()
            assert body["complaint"]["complaint_id"].startswith("CMP-")
            assert body["complaint"]["department"] == "Water"
            assert body["ticket"]["ticket_id"].startswith("TKT-")
            assert body["duplicate"]["status"] in {"NEW", "RELATED", "DUPLICATE"}
            complaint_id = body["complaint"]["complaint_id"]

            # SLA generation still works for a Groq-sourced complaint.
            resp = client.get(f"/complaints/{complaint_id}/sla", headers=headers)
            assert resp.status_code == 200, resp.text
            assert resp.json()["sla_deadline"] is not None
            assert resp.json()["sla_duration_hours"] > 0

            # A second, near-duplicate transcript -> real ChromaDB duplicate
            # detection must still fire (proves duplicate detection is
            # untouched by the provider swap).
            resp = client.post(
                "/process-and-create-ticket",
                files={"file": ("sample_test.wav", open(SAMPLE_WAV, "rb"), "audio/wav")},
                headers=headers,
            )
            assert resp.status_code == 200, resp.text
            assert resp.json()["duplicate"]["status"] in {"RELATED", "DUPLICATE"}, resp.json()["duplicate"]
    finally:
        provider_config.LLM_PROVIDER = original_llm_provider
        provider_config.STT_PROVIDER = original_stt_provider
        provider_config.GROQ_API_KEY = original_groq_api_key

    print("[OK] TEST 7 PASSED: LLM_PROVIDER=groq/STT_PROVIDER=groq correctly routes /transcribe, /analyze, and the full")
    print("     /process-and-create-ticket pipeline through Groq (mocked), with duplicate detection, complaint/ticket")
    print("     creation, and SLA generation all working unchanged on the real, unmocked downstream pipeline.")

    print("\n==================================================")
    print("ALL GROQCLOUD PROVIDER TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
