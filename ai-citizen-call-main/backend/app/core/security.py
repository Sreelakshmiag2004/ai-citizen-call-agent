"""Password hashing and JWT issuance/verification for the authentication
system (see MASTER_TODO.md's "No authentication/authorization anywhere"
item). Kept deliberately small and dependency-light -- `bcrypt` and `PyJWT`
were both already present in the environment (pulled in transitively by
other dependencies) and are now pinned directly in requirements.txt.

No OAuth / external identity provider / enterprise IAM by design -- this is
a self-contained username+password -> JWT bearer-token scheme, matching
what the task calls for.
"""

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
import jwt

logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

# The signing secret MUST come from the environment in any real deployment
# -- it is never hardcoded here and never sent to the frontend. For local
# dev/demo convenience (so the app still runs the first time with no setup
# step), a random secret is generated per-process if JWT_SECRET is unset;
# this means existing tokens are invalidated on every restart, which is an
# acceptable tradeoff for a local demo and is logged loudly so it's never
# mistaken for a real deployment configuration.
_env_secret = os.getenv("JWT_SECRET", "").strip()
if _env_secret:
    JWT_SECRET = _env_secret
else:
    JWT_SECRET = secrets.token_urlsafe(48)
    logger.warning(
        "JWT_SECRET is not set in the environment -- using a random, "
        "process-local secret. All existing tokens will be invalidated on "
        "restart. Set JWT_SECRET in backend/.env before any real deployment."
    )

# bcrypt silently truncates/rejects input over 72 bytes; cap defensively so
# a very long (but otherwise valid) password never raises instead of just
# hashing its first 72 bytes, same tradeoff bcrypt itself makes.
_BCRYPT_MAX_BYTES = 72


def hash_password(plain_password: str) -> str:
    password_bytes = plain_password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    try:
        return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))
    except ValueError:
        # Malformed hash (e.g. legacy/corrupt row) -- treat as a failed
        # verification rather than a 500.
        return False


def create_access_token(user_id: int, expires_minutes: Optional[int] = None) -> str:
    """Issues a JWT whose only claim is the user's row id (`sub`). Role,
    name, and every other identity attribute are deliberately NOT embedded
    in the token -- get_current_user() re-fetches the user from the
    database on every request so a role change or deactivation takes
    effect immediately instead of waiting for the old token to expire."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expires_minutes or JWT_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "iat": now, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


class InvalidTokenError(Exception):
    """Raised for any JWT that fails signature/expiry validation."""


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as e:
        raise InvalidTokenError("Token has expired.") from e
    except jwt.InvalidTokenError as e:
        raise InvalidTokenError("Token is invalid.") from e
