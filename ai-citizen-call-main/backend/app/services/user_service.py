import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.database.models import User

logger = logging.getLogger(__name__)


class UserService:
    def get_by_id(self, db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.strip().lower()).first()

    def create_user(
        self,
        db: Session,
        email: str,
        password: str,
        full_name: str,
        role: str = "citizen",
        phone: Optional[str] = None,
    ) -> User:
        """Raises ValueError if the email is already registered."""
        email = email.strip().lower()
        if self.get_by_email(db, email):
            raise ValueError(f"An account with email '{email}' already exists.")

        user = User(
            email=email,
            full_name=full_name.strip(),
            phone=phone.strip() if phone else None,
            hashed_password=hash_password(password),
            role=role,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("Created user '%s' with role '%s'.", email, role)
        return user

    def authenticate(self, db: Session, email: str, password: str) -> Optional[User]:
        """Returns the User on success, or None on any failure (unknown
        email, wrong password, or a deactivated account) -- callers should
        surface the same generic "invalid credentials" message for all of
        these so login can't be used to enumerate registered emails."""
        user = self.get_by_email(db, email)
        if not user or not user.is_active:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user


user_service = UserService()


# Demo/seed accounts, one per role -- created once at startup (see
# seed_demo_users() call in main.py's lifespan) only if the users table is
# still empty, so the four portals remain click-through demoable without a
# manual registration/admin-provisioning step for each role. These are
# local-demo credentials for a project with no production deployment (see
# MASTER_TODO.md's "No production deployment configuration exists" item),
# not real secrets -- documented here and in the completion report rather
# than hidden, matching how the pre-auth demo already exposed default
# login values directly in LoginPage.tsx.
DEMO_ACCOUNTS = [
    {"email": "ravi.kumar@citizen.gov.in", "password": "Citizen@123", "full_name": "Ravi Kumar", "role": "citizen"},
    {"email": "priya.sharma@govportal.gov.in", "password": "CallCenter@123", "full_name": "Priya Sharma", "role": "call-center"},
    {"email": "priya.sharma@pwd.gov.in", "password": "Officer@123", "full_name": "Priya Sharma", "role": "officer"},
    {"email": "raj.kumar@gov.in", "password": "Admin@123", "full_name": "Raj Kumar", "role": "admin"},
]


def seed_demo_users(db: Session) -> None:
    if db.query(User).first() is not None:
        return  # already seeded (or real users exist) -- never overwrite
    for account in DEMO_ACCOUNTS:
        user_service.create_user(
            db=db,
            email=account["email"],
            password=account["password"],
            full_name=account["full_name"],
            role=account["role"],
        )
    logger.info("Seeded %d demo user accounts (one per role).", len(DEMO_ACCOUNTS))
