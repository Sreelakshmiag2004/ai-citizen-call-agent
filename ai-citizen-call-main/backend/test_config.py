"""Shared test-isolation bootstrap.

Import this module BEFORE importing anything from `app.*` in any test
script (`test_module*.py`, `test_api_endpoints.py`). It points the SQL
database and ChromaDB persistence layers at disposable, git-ignored
locations under `backend/data/test/` via the `CITIZEN_DB_PATH` and
`CITIZEN_CHROMA_DIR` environment variables, which `app/database/database.py`
and `app/services/chroma_service.py` both honor.

This exists so that running the test suite never reads or writes the
presentation database (`backend/data/citizen_intelligence.db`) or its
ChromaDB vector store (`backend/data/chroma/`) -- those must stay clean of
test/regression fixture data for the demo.

Because `app.database.database` and `app.services.chroma_service` resolve
their storage paths at import time (from the environment), these two
environment variables MUST be set before those modules -- or `app.main`,
which imports them -- are first imported anywhere in the process. Every
`test_module*.py` / `test_api_endpoints.py` script does
`import test_config` as its first local import for this reason.

`os.environ.setdefault` (not a plain assignment) is used deliberately: it
lets `run_tests.py` pre-set these variables to a shared per-run test DB
before launching the live HTTP server subprocess used by
`test_api_endpoints.py`, while each in-process test script (test_module3-6,
test_module8) can still be run standalone and fall back to its own
sensible default here.
"""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
TEST_DATA_DIR = BACKEND_DIR / "data" / "test"
TEST_DATA_DIR.mkdir(parents=True, exist_ok=True)

os.environ.setdefault("CITIZEN_DB_PATH", str(TEST_DATA_DIR / "test_citizen_intelligence.db"))
os.environ.setdefault("CITIZEN_CHROMA_DIR", str(TEST_DATA_DIR / "chroma"))

# Rate limiting (see app/core/rate_limit.py) defaults OFF for the general
# test suite: several existing test scripts make many rapid AI-endpoint /
# login calls in a loop that have nothing to do with rate limiting, and
# would otherwise start failing with unrelated 429s. `test_rate_limit.py`
# is the one script that actually exercises this feature -- it flips this
# back to "true" (and sets tight limits) for the duration of its own
# run_tests(), then restores it, since rate_limit.py reads these env vars
# fresh on every check rather than caching them at import time for exactly
# this reason.
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

# Convenience for callers (e.g. run_tests.py) that want to report or clean
# up the paths this run resolved to.
DB_PATH = Path(os.environ["CITIZEN_DB_PATH"])
CHROMA_DIR = Path(os.environ["CITIZEN_CHROMA_DIR"])
