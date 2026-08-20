import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_role
from app.core.rate_limit import auth_rate_limit
from app.core.security import create_access_token, JWT_EXPIRE_MINUTES
from app.database.database import get_db
from app.database.models import User
from app.database.schemas import (
    AdminCreateUserRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.user_service import user_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_token(user: User) -> TokenResponse:
    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        expires_in_minutes=JWT_EXPIRE_MINUTES,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: UserRegisterRequest,
    db: Session = Depends(get_db),
    _rl: None = Depends(auth_rate_limit),
) -> TokenResponse:
    """Public self-registration. Always creates a `citizen` account --
    there is intentionally no way for an unauthenticated caller to request
    any other role (see UserRegisterRequest / AdminCreateUserRequest)."""
    try:
        user = user_service.create_user(
            db=db,
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            role="citizen",
            phone=request.phone,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(ve))

    return _issue_token(user)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: UserLoginRequest,
    db: Session = Depends(get_db),
    _rl: None = Depends(auth_rate_limit),
) -> TokenResponse:
    user = user_service.authenticate(db, request.email, request.password)
    if not user:
        # Same message for "no such account" and "wrong password" --
        # avoids leaking which registered emails exist.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    return _issue_token(user)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)) -> dict:
    """JWT bearer tokens are stateless and carry no server-side session, so
    there is nothing to invalidate here (no refresh-token/revocation-list
    store exists in this project's scope -- see MASTER_TODO.md). This
    endpoint exists so the frontend has a real logout call to make and a
    real 401 if it's called without a token; the actual "forget the
    token" step happens client-side (AppContext.logout() clears it from
    storage) immediately after this returns."""
    return {"message": "Logged out."}


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_user(
    request: AdminCreateUserRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
) -> UserResponse:
    """Admin-only. The only way an officer/call-center/admin account can be
    created -- keeps privileged-role assignment out of reach of public
    registration."""
    try:
        user = user_service.create_user(
            db=db,
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            role=request.role,
            phone=request.phone,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(ve))
    return UserResponse.model_validate(user)
