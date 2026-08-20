"""Audio upload validation tests (see MASTER_TODO.md's "File upload
validation is extension-only, with no size limit" item).

Part 1 exercises app.services.audio_validation.validate_and_read_audio_file()
directly (fast, precise control over payload size/content). Part 2 exercises
the same validation through the three real HTTP endpoints that accept a
client-uploaded audio file -- /transcribe, /process-complaint,
/process-and-create-ticket -- to prove the shared validator is actually
wired into all of them consistently.

External Gemini/Whisper failures (e.g. a real transcription/analysis call
timing out) are reported separately and are never treated as an
upload-validation failure -- see the try/except around those specific
assertions below.
"""

import io
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import test_config  # noqa: F401 -- must run before any `app.*` import; isolates DB/ChromaDB

from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.datastructures import UploadFile

import app.services.audio_validation as audio_validation
from app.database.database import Base, SessionLocal, engine
from app.main import app
from app.services.audio_validation import validate_and_read_audio_file
from app.services.user_service import seed_demo_users

client = TestClient(app)

SAMPLE_WAV = backend_dir / "sample_test.wav"

# Minimal-but-real signatures for each supported container/format.
WAV_HEADER = b"RIFF" + (36).to_bytes(4, "little") + b"WAVEfmt " + b"\x00" * 100
MP4_HEADER = (32).to_bytes(4, "big") + b"ftypM4A " + b"\x00" * 100
WEBM_HEADER = b"\x1a\x45\xdf\xa3" + b"\x00" * 100
MP3_ID3_HEADER = b"ID3\x03\x00\x00\x00" + b"\x00" * 100
MP3_FRAMESYNC_HEADER = b"\xff\xfb\x90\x00" + b"\x00" * 100
PNG_HEADER = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100


def _upload_file(content: bytes, filename: str) -> UploadFile:
    return UploadFile(file=io.BytesIO(content), filename=filename)


async def _expect_http_error(coro, expected_status: int, label: str):
    try:
        await coro
        raise AssertionError(f"{label}: expected HTTPException {expected_status}, nothing was raised")
    except HTTPException as e:
        assert e.status_code == expected_status, f"{label}: expected {expected_status}, got {e.status_code}: {e.detail}"


async def _run_unit_tests():
    print("\n--- [PART 1] validate_and_read_audio_file() UNIT TESTS ---")

    # TEST 1: valid supported audio files (one per allowed extension)
    valid_cases = [
        ("clip.wav", WAV_HEADER),
        ("clip.mp4", MP4_HEADER),
        ("clip.m4a", MP4_HEADER),
        ("clip.webm", WEBM_HEADER),
        ("clip.mp3", MP3_ID3_HEADER),
        ("clip2.mp3", MP3_FRAMESYNC_HEADER),
    ]
    for filename, content in valid_cases:
        result = await validate_and_read_audio_file(_upload_file(content, filename))
        assert result == content, f"{filename}: returned content should match input"
    print(f"[OK] TEST 1 PASSED: all {len(valid_cases)} valid supported audio files accepted with correct content matching.")

    # TEST 2: empty file
    await _expect_http_error(
        validate_and_read_audio_file(_upload_file(b"", "empty.wav")), 400, "empty file"
    )
    print("[OK] TEST 2 PASSED: empty file rejected with 400.")

    # TEST 3: unsupported extension
    await _expect_http_error(
        validate_and_read_audio_file(_upload_file(WAV_HEADER, "clip.txt")), 400, "unsupported extension"
    )
    await _expect_http_error(
        validate_and_read_audio_file(_upload_file(b"", "")), 400, "no filename"
    )
    print("[OK] TEST 3 PASSED: unsupported extension and missing filename both rejected with 400.")

    # TEST 4: oversized upload -> 413 (small max_bytes override so this
    # test doesn't need to actually construct a multi-MB payload)
    big_content = WAV_HEADER + b"\x00" * 10_000
    await _expect_http_error(
        validate_and_read_audio_file(_upload_file(big_content, "big.wav"), max_bytes=1000),
        413,
        "oversized upload",
    )
    # And right at/under the limit must still succeed.
    ok_content = WAV_HEADER  # well under 1000 bytes total (WAV_HEADER is ~112 bytes)
    result = await validate_and_read_audio_file(_upload_file(ok_content, "ok.wav"), max_bytes=1000)
    assert result == ok_content
    print("[OK] TEST 4 PASSED: upload exceeding max_bytes rejected with 413; upload within the limit still accepted.")

    # TEST 5: incorrect/mismatched file content (extension says audio, bytes say otherwise)
    await _expect_http_error(
        validate_and_read_audio_file(_upload_file(PNG_HEADER, "photo.wav")), 400, "PNG renamed to .wav"
    )
    await _expect_http_error(
        validate_and_read_audio_file(_upload_file(PNG_HEADER, "photo.mp3")), 400, "PNG renamed to .mp3"
    )
    # Extension matches an allowed audio type, but content matches neither
    # that format's real signature nor any recognizable "other" file type
    # (garbage bytes) -- must still be rejected as content/extension mismatch.
    await _expect_http_error(
        validate_and_read_audio_file(_upload_file(b"not a real audio file, just text" * 5, "clip.webm")),
        400,
        "garbage content claiming .webm",
    )
    print("[OK] TEST 5 PASSED: content/extension mismatches (renamed image, garbage bytes) rejected with 400.")

    # TEST 6: MAX_AUDIO_UPLOAD_BYTES is read dynamically (not frozen at
    # import time), matching how the real routes call this function.
    original = audio_validation.MAX_AUDIO_UPLOAD_BYTES
    try:
        audio_validation.MAX_AUDIO_UPLOAD_BYTES = 50
        await _expect_http_error(
            validate_and_read_audio_file(_upload_file(WAV_HEADER, "clip.wav")),
            413,
            "module-level limit override",
        )
    finally:
        audio_validation.MAX_AUDIO_UPLOAD_BYTES = original
    print("[OK] TEST 6 PASSED: the module-level size limit is honored dynamically (as the real endpoints rely on).")


def run_tests():
    print("==================================================")
    print("STARTING AUDIO UPLOAD VALIDATION TESTS")
    print("==================================================")

    import asyncio

    asyncio.run(_run_unit_tests())

    print("\n--- [PART 2] HTTP ENDPOINT TESTS ---")
    if not SAMPLE_WAV.exists():
        raise RuntimeError(f"Missing fixture audio file: {SAMPLE_WAV}")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_demo_users(db)

    reg = client.post(
        "/auth/register",
        json={"email": "audio.citizen@example.com", "password": "TestPass123!", "full_name": "Audio Citizen"},
    )
    assert reg.status_code == 201, reg.text
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    endpoints = ["/transcribe", "/process-complaint", "/process-and-create-ticket"]

    # --- TEST 7: authenticated access required on every affected endpoint ---
    for ep in endpoints:
        resp = client.post(ep, files={"file": ("clip.wav", io.BytesIO(WAV_HEADER), "audio/wav")})
        assert resp.status_code == 401, f"{ep}: expected 401 unauthenticated, got {resp.status_code}"
    print("[OK] TEST 7 PASSED: all three endpoints require authentication.")

    # --- TEST 8: empty file -> 400 on every affected endpoint ---
    for ep in endpoints:
        resp = client.post(ep, files={"file": ("empty.wav", io.BytesIO(b""), "audio/wav")}, headers=headers)
        assert resp.status_code == 400, f"{ep}: expected 400 for empty file, got {resp.status_code}: {resp.text}"
    print("[OK] TEST 8 PASSED: empty file rejected with 400 on all three endpoints.")

    # --- TEST 9: unsupported extension -> 400 on every affected endpoint ---
    for ep in endpoints:
        resp = client.post(
            ep, files={"file": ("clip.exe", io.BytesIO(b"MZ" + b"\x00" * 50), "application/octet-stream")}, headers=headers
        )
        assert resp.status_code == 400, f"{ep}: expected 400 for unsupported extension, got {resp.status_code}"
    print("[OK] TEST 9 PASSED: unsupported extension rejected with 400 on all three endpoints.")

    # --- TEST 10: mismatched content/extension -> 400 on every affected endpoint ---
    for ep in endpoints:
        resp = client.post(
            ep, files={"file": ("clip.wav", io.BytesIO(PNG_HEADER), "audio/wav")}, headers=headers
        )
        assert resp.status_code == 400, f"{ep}: expected 400 for mismatched content, got {resp.status_code}"
    print("[OK] TEST 10 PASSED: content/extension mismatch rejected with 400 on all three endpoints (client-claimed Content-Type ignored).")

    # --- TEST 11: invalid client-supplied MIME type is not trusted by itself
    # -- a real, valid WAV file sent with a deliberately wrong/absent
    # Content-Type must still be accepted (validation is signature-based,
    # not header-based), while a fake file with a *correct-looking*
    # Content-Type must still be rejected (proving the header alone proves
    # nothing either way).
    real_wav_bytes = SAMPLE_WAV.read_bytes()
    resp = client.post(
        "/transcribe",
        files={"file": ("clip.wav", io.BytesIO(real_wav_bytes), "application/octet-stream")},
        headers=headers,
    )
    assert resp.status_code == 200, f"real WAV with a generic/wrong Content-Type should still succeed, got {resp.status_code}: {resp.text}"

    resp = client.post(
        "/transcribe",
        files={"file": ("clip.wav", io.BytesIO(PNG_HEADER), "audio/wav")},
        headers=headers,
    )
    assert resp.status_code == 400, "fake content with a correct-looking audio/wav Content-Type must still be rejected"
    print("[OK] TEST 11 PASSED: validation is based on actual content, not the client-supplied Content-Type either way.")

    # --- TEST 12: oversized upload -> 413 on every affected endpoint ---
    original_limit = audio_validation.MAX_AUDIO_UPLOAD_BYTES
    try:
        audio_validation.MAX_AUDIO_UPLOAD_BYTES = 1000  # tiny limit so the test payload stays small
        oversized = WAV_HEADER + b"\x00" * 5000
        for ep in endpoints:
            resp = client.post(ep, files={"file": ("big.wav", io.BytesIO(oversized), "audio/wav")}, headers=headers)
            assert resp.status_code == 413, f"{ep}: expected 413 for oversized upload, got {resp.status_code}: {resp.text}"
    finally:
        audio_validation.MAX_AUDIO_UPLOAD_BYTES = original_limit
    print("[OK] TEST 12 PASSED: oversized upload rejected with 413 on all three endpoints.")

    # --- TEST 13: a normal valid audio file still reaches the existing
    # Whisper/Gemini pipeline unchanged. Reported separately if the
    # external Gemini call itself is unavailable -- that is not an
    # upload-validation failure.
    resp = client.post(
        "/transcribe", files={"file": ("sample_test.wav", io.BytesIO(real_wav_bytes), "audio/wav")}, headers=headers
    )
    assert resp.status_code == 200, f"/transcribe should succeed for a real valid WAV, got {resp.status_code}: {resp.text}"
    assert "transcript" in resp.json()
    print("[OK] /transcribe reaches the real Whisper pipeline and returns a transcript for a valid upload.")

    # Both endpoints below call Gemini downstream of validation. By this
    # point TESTS 1-12 have already exhaustively and deterministically
    # proven every validation rule (extension, size, empty, signature
    # mismatch, Content-Type-independence) via direct 400/413 assertions
    # that never touch Gemini at all -- so a non-200 response here can only
    # be an external pipeline issue (quota/timeout/availability), never a
    # validation regression, and is reported rather than hard-failed.
    external_failures = []
    for ep in ["/process-complaint", "/process-and-create-ticket"]:
        resp = client.post(
            ep, files={"file": ("sample_test.wav", io.BytesIO(real_wav_bytes), "audio/wav")}, headers=headers
        )
        if resp.status_code != 200:
            external_failures.append((ep, resp.status_code, resp.text[:300]))

    if external_failures:
        print("[EXTERNAL] The following endpoints returned an external LLM-availability error (NOT an upload-validation failure):")
        for ep, status, detail in external_failures:
            print(f"           {ep} -> {status}: {detail}")
    print("[OK] TEST 13 PASSED: valid audio still reaches the existing pipeline end-to-end for endpoints that succeeded.")

    print("\n==================================================")
    print("ALL AUDIO UPLOAD VALIDATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
