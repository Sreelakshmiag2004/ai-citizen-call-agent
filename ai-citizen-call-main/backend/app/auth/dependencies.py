"""FastAPI dependencies enforcing authentication and role-based access
control on the backend. Every protected route depends on `get_current_user`
(or `require_role(...)`, which itself depends on it) -- the identity and
role used for every authorization decision always come from the validated
JWT + a fresh database lookup, never from anything the client puts in the
request body or query string. See MASTER_TODO.md's
"No authentication/authorization anywhere" item.
"""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import InvalidTokenError, decode_access_token
from app.database.database import get_db
from app.database.models import Complaint, User
from app.services.user_service import user_service

logger = logging.getLogger(__name__)

# auto_error=False so a missing Authorization header produces our own 401
# with a clear message instead of FastAPI's generic 403.
_bearer_scheme = HTTPBearer(auto_error=False)

# Roles that act as staff -- i.e. can see/manage complaints beyond their own.
STAFF_ROLES = {"call-center", "officer", "admin"}


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validates the bearer token's signature and expiry, then re-fetches
    the user from the database (rather than trusting claims embedded in
    the token) so a deactivated account or role change takes effect on the
    very next request."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Include 'Authorization: Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_raw = payload.get("sub")
    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject.")

    user = user_service.get_by_id(db, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

    return user


def require_role(*allowed_roles: str):
    """Returns a dependency that 403s unless the authenticated user's
    (database-verified) role is one of `allowed_roles`. Usage:

        @router.get("/analytics/summary")
        async def get_summary(current_user: User = Depends(require_role("officer", "admin"))):
            ...
    """

    async def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not permitted to perform this action.",
            )
        return current_user

    return _dependency


def assert_can_access_complaint(db: Session, current_user: User, complaint_id: str) -> None:
    """Staff roles (call-center/officer/admin) can access any complaint.
    A citizen may only access a complaint they created -- raises 404
    (not 403) for both "doesn't exist" and "exists but belongs to someone
    else" so a citizen can't use this endpoint to enumerate other
    citizens' complaint IDs."""
    if current_user.role in STAFF_ROLES:
        return

    owner_id = (
        db.query(Complaint.created_by_user_id)
        .filter(Complaint.complaint_id == complaint_id)
        .scalar()
    )
    if owner_id is None or owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint '{complaint_id}' not found.",
        )
