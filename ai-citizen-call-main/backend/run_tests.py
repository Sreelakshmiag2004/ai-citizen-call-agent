"""Single entry point to run the full backend test suite against an
isolated test database and ChromaDB store -- never the presentation data
in `backend/data/citizen_intelligence.db` / `backend/data/chroma/`.

Usage (from `backend/`, with the venv active):
    python run_tests.py

What it does:
  1. Points `CITIZEN_DB_PATH` / `CITIZEN_CHROMA_DIR` (see `test_config.py`)
     at a disposable directory under `backend/data/test/`, wiping any
     leftovers from a previous run first so every run starts clean.
  2. Runs `test_module3` .. `test_module6` and `test_module8` in-process
     (they exercise the service layer / a `TestClient` directly).
  3. Starts a real `uvicorn app.main:app` subprocess -- with the same
     isolated environment -- and runs `test_api_endpoints.py` against it,
     since that script talks to a live server over HTTP on :8001.
  4. Hashes the presentation database before and after the run so any
     accidental write to it is caught immediately instead of silently
     polluting the demo data again.
"""

import hashlib
import os
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

import test_config  # noqa: E402 -- sets CITIZEN_DB_PATH / CITIZEN_CHROMA_DIR before any app.* import

PRESENTATION_DB = BACKEND_DIR / "data" / "citizen_intelligence.db"

IN_PROCESS_MODULES = [
    "test_module3",
    "test_module4",
    "test_module5",
    "test_module6",
    "test_auth",
    "test_sla_notifications",
    "test_feedback",
    "test_audio_validation",
    "test_groq_provider",
    "test_module8",
    "test_gps_location",
    # Runs last, deliberately: it's the only module that turns rate
    # limiting ON (everything else runs with it off, see test_config.py),
    # and restores the "off" default in a finally block afterward -- last
    # in line means the smallest possible window for that restore to
    # matter to anything else in this process, including the live-server
    # subprocess launched right after this loop for test_api_endpoints.py.
    "test_rate_limit",
    # Also runs last, after test_rate_limit: it resets both ChromaDB
    # collections (citizen_complaints and chatbot_knowledge) at its start
    # and end to get a clean, deterministic count -- placing it after
    # every other complaint-creating test means that reset can't discard
    # ChromaDB state another test still depended on.
    "test_chatbot_knowledge",
    # Also runs last, after test_chatbot_knowledge: it also resets both
    # ChromaDB collections and, like test_rate_limit, temporarily turns
    # rate limiting ON (for its own chatbot-bucket 429 assertions) before
    # restoring the "off" default.
    "test_chatbot",
]


def _hash_file(path: Path) -> str:
    if not path.exists():
        return "<missing>"
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _fresh_test_data() -> None:
    """Wipe any leftovers from a previous test run so this run starts clean."""
    if test_config.TEST_DATA_DIR.exists():
        shutil.rmtree(test_config.TEST_DATA_DIR)
    test_config.TEST_DATA_DIR.mkdir(parents=True, exist_ok=True)


def _wait_for_server(base_url: str, timeout_s: int = 30) -> bool:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            if urllib.request.urlopen(f"{base_url}/", timeout=1).getcode() == 200:
                return True
        except Exception:
            time.sleep(0.5)
    return False


def main() -> int:
    before_hash = _hash_file(PRESENTATION_DB)
    print(f"Presentation DB hash BEFORE tests: {before_hash}")
    print(f"Isolated test DB:     {test_config.DB_PATH}")
    print(f"Isolated test Chroma: {test_config.CHROMA_DIR}")

    _fresh_test_data()

    failures = []

    # --- In-process tests (service layer / TestClient) ---
    for name in IN_PROCESS_MODULES:
        print(f"\n{'=' * 60}\nRunning {name}\n{'=' * 60}")
        try:
            module = __import__(name)
            entry = getattr(module, "run_tests", None)
            if entry is None:
                raise AttributeError(f"{name} has no run_tests()")
            entry()
        except Exception as exc:  # noqa: BLE001 -- report and keep going
            print(f"[FAIL] {name}: {exc}")
            failures.append(name)

    # --- HTTP tests against a live, isolated server subprocess ---
    print(f"\n{'=' * 60}\nRunning test_api_endpoints (live server, isolated DB)\n{'=' * 60}")
    env = os.environ.copy()  # already carries CITIZEN_DB_PATH / CITIZEN_CHROMA_DIR
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8001"],
        cwd=str(BACKEND_DIR),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        if not _wait_for_server("http://127.0.0.1:8001"):
            print("[FAIL] test_api_endpoints: isolated test server did not start in time")
            failures.append("test_api_endpoints")
        else:
            try:
                import test_api_endpoints

                test_api_endpoints.test_all_endpoints()
            except Exception as exc:  # noqa: BLE001
                print(f"[FAIL] test_api_endpoints: {exc}")
                failures.append("test_api_endpoints")
    finally:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()

    after_hash = _hash_file(PRESENTATION_DB)
    print(f"\nPresentation DB hash AFTER tests:  {after_hash}")
    if before_hash != after_hash:
        print("[FAIL] Presentation database was modified by the test run!")
        failures.append("presentation_db_integrity")
    else:
        print("[OK] Presentation database untouched by the test run.")

    print(f"\n{'=' * 60}")
    if failures:
        print(f"FAILED: {failures}")
        return 1
    print("ALL TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
