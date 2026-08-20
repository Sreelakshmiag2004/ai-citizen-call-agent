"""Lightweight in-memory rate limiting for cost-sensitive and
abuse-sensitive endpoints (see MASTER_TODO.md's "No rate limiting on any
backend endpoint" item).

This is a fixed-window request counter per (bucket, client-key) pair, held
in a single process-local dict guarded by a lock. That is a deliberate,
documented trade-off for this project: it runs as a single local/demo
Uvicorn process (see MASTER_TODO's "No production deployment configuration
exists" item -- no Docker, no multi-worker/multi-replica config, no load
balancer), so one process's memory is already the single source of truth
for everything else in the app (the SQLite DB file, the Whisper model
instance, ChromaDB's local persistence). A distributed store (Redis, a
DB-backed limiter) would only earn its cost once this ran as more than one
process/replica, which nothing in this repository does -- adding one now
would be exactly the kind of unnecessary enterprise infrastructure this
task explicitly says to avoid. If that ever changes, `_check()` is the only
function that would need to move to a shared store; every call site is
unaffected because they only see the bucket/key/limit/window inputs and a
"retry after N seconds or None" result.

Client identity: cost-sensitive AI-pipeline endpoints are keyed by the
already-verified authenticated user id (the same JWT + DB lookup
`get_current_user` performs for every one of them today -- never trusted
from a client-supplied header). Endpoints reachable before any identity
exists -- `/auth/login`, `/auth/register`, and the deliberately public
`/chatbot/message` -- are keyed by client IP instead, honoring
`X-Forwarded-For` / `X-Real-IP` the same way `app/routes/twilio.py`
already does for the ngrok-tunneled deployment, and falling back to the
raw socket address. The chatbot gets its own `chatbot` bucket rather than
sharing `auth`'s, since a public FAQ conversation and login/registration
attempts have very different legitimate request cadences.

Config is read fresh on every check (not cached at import time) so that
test code can flip `RATE_LIMIT_ENABLED`/the limit env vars at runtime --
important because `backend/test_config.py` disables rate limiting by
default for the general test suite (so unrelated tests making many rapid
calls aren't accidentally rate-limited), while `test_rate_limit.py`
re-enables it with tight limits for its own assertions. Since Python
caches this module after its first import, binding these to module-level
constants once would make that runtime override impossible depending on
which test file happened to import `app.main` first.
"""

import logging
import os
import threading
import time
from typing import Dict, Optional, Tuple

from fastapi import Depends, HTTPException, Request, status

from app.auth.dependencies import get_current_user
from app.database.models import User

logger = logging.getLogger(__name__)


def _env_flag(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() not in ("false", "0", "no")


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        logger.warning("Invalid integer for %s=%r; using default %d.", name, raw, default)
        return default
    return value if value > 0 else default


_lock = threading.Lock()
# (bucket, key) -> (window_start_monotonic, count_in_window)
_windows: Dict[Tuple[str, str], Tuple[float, int]] = {}


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


def _check(bucket: str, key: str, limit: int, window_seconds: int) -> Optional[int]:
    """Fixed-window counter. Returns None if this request is allowed, or
    the number of whole seconds the caller should wait (for a
    Retry-After header) if the bucket is already full. Fixed windows can
    admit a short burst at a window boundary (up to ~2x the limit across
    the boundary) -- an accepted, documented trade-off for this app's
    actual abuse model (retrying/misbehaving clients and casual scripted
    abuse, not a precision-timed attacker), in exchange for O(1) memory
    per key and no extra dependency."""
    now = time.monotonic()
    full_key = (bucket, key)
    with _lock:
        window_start, count = _windows.get(full_key, (now, 0))
        elapsed = now - window_start
        if elapsed >= window_seconds:
            _windows[full_key] = (now, 1)
            return None
        if count < limit:
            _windows[full_key] = (window_start, count + 1)
            return None
        return max(1, int(window_seconds - elapsed) + 1)


def _raise_429(retry_after: int) -> None:
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
        headers={"Retry-After": str(retry_after)},
    )


async def ai_rate_limit(request: Request, current_user: User = Depends(get_current_user)) -> User:
    """Dependency for cost-sensitive AI-pipeline endpoints (Whisper/Groq
    STT, Groq/Gemini LLM analysis, ChromaDB embedding + duplicate search).
    Drop-in replacement for `Depends(get_current_user)` -- it depends on
    that same function, so FastAPI's per-request dependency cache means
    authentication still runs exactly once, and this returns the same
    `User` the route already expects."""
    if not _env_flag("RATE_LIMIT_ENABLED", True):
        return current_user
    limit = _env_int("RATE_LIMIT_AI_REQUESTS", 20)
    window = _env_int("RATE_LIMIT_AI_WINDOW_SECONDS", 60)
    retry_after = _check("ai", f"user:{current_user.id}", limit, window)
    if retry_after is not None:
        logger.warning("Rate limit exceeded (ai bucket) for user_id=%s", current_user.id)
        _raise_429(retry_after)
    return current_user


async def auth_rate_limit(request: Request) -> None:
    """Dependency for the two endpoints reachable before any authenticated
    identity exists (`/auth/login`, `/auth/register`) -- anti-brute-force
    and anti-spam-registration. Keyed by client IP, the documented
    exception to "prefer authenticated-user identity where available"."""
    if not _env_flag("RATE_LIMIT_ENABLED", True):
        return
    limit = _env_int("RATE_LIMIT_AUTH_REQUESTS", 10)
    window = _env_int("RATE_LIMIT_AUTH_WINDOW_SECONDS", 60)
    key = _client_ip(request)
    retry_after = _check("auth", key, limit, window)
    if retry_after is not None:
        logger.warning("Rate limit exceeded (auth bucket) for ip=%s", key)
        _raise_429(retry_after)


async def chatbot_rate_limit(request: Request) -> None:
    """Dependency for the public, unauthenticated chatbot endpoint
    (`POST /chatbot/message`) -- a deliberate product decision (see
    MASTER_TODO.md's Portal chatbot item), not an oversight, so this is
    NOT `ai_rate_limit`: there is no authenticated identity to key on, and
    sharing the `ai` bucket would let public chatbot traffic and a logged-in
    citizen's complaint pipeline usage throttle each other. Keyed by client
    IP, same convention as `auth_rate_limit`, in its own `chatbot` bucket
    with its own env-configured limit."""
    if not _env_flag("RATE_LIMIT_ENABLED", True):
        return
    limit = _env_int("RATE_LIMIT_CHATBOT_REQUESTS", 15)
    window = _env_int("RATE_LIMIT_CHATBOT_WINDOW_SECONDS", 60)
    key = _client_ip(request)
    retry_after = _check("chatbot", key, limit, window)
    if retry_after is not None:
        logger.warning("Rate limit exceeded (chatbot bucket) for ip=%s", key)
        _raise_429(retry_after)


def _reset_for_tests() -> None:
    """Test-only: clears all rate-limit state. Not used by application
    code -- each test that exercises rate limiting calls this first so
    its assertions don't depend on what ran before it in the same
    process (see `run_tests.py`, which runs every test module in-process)."""
    with _lock:
        _windows.clear()
