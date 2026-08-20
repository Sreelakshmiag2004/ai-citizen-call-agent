import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BACKEND_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# CITIZEN_DB_PATH lets the test suite (see backend/test_config.py) point
# every SQLAlchemy read/write at a disposable file instead of the
# presentation database. Unset in normal (dev/demo) runs, so production
# behavior is unchanged.
_db_path_override = os.getenv("CITIZEN_DB_PATH", "").strip()
DB_PATH = Path(_db_path_override) if _db_path_override else DATA_DIR / "citizen_intelligence.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_keywords_column() -> None:
    """Additive, non-destructive migration for pre-existing SQLite files that
    predate the Complaint.keywords column. Safe to call on every startup:
    it's a no-op once the column exists (including on a brand-new database,
    where create_all() already includes it)."""
    with engine.connect() as conn:
        columns = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(complaints)")]
        if columns and "keywords" not in columns:
            conn.exec_driver_sql("ALTER TABLE complaints ADD COLUMN keywords TEXT")
            conn.commit()


def ensure_created_by_user_id_column() -> None:
    """Additive, non-destructive migration for pre-existing SQLite files
    that predate the Complaint.created_by_user_id column (added for
    per-user complaint ownership once authentication was introduced). Same
    pattern as ensure_keywords_column() above -- a no-op once the column
    exists, including on a brand-new database where create_all() already
    includes it."""
    with engine.connect() as conn:
        columns = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(complaints)")]
        if columns and "created_by_user_id" not in columns:
            conn.exec_driver_sql("ALTER TABLE complaints ADD COLUMN created_by_user_id INTEGER")
            conn.commit()
