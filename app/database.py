"""Database connection and session management with lazy initialization."""

import logging
from functools import lru_cache
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

logger = logging.getLogger(__name__)


class DatabaseUnavailableError(Exception):
    """Raised when database is not configured or unreachable."""

    pass


@lru_cache
def _get_engine() -> Engine:
    """Create and cache the SQLAlchemy engine.

    Raises:
        DatabaseUnavailableError: If DATABASE_URL is not configured.
    """
    settings = get_settings()
    database_url = settings.database_url

    if not database_url:
        raise DatabaseUnavailableError("DATABASE_URL is not configured")

    return create_engine(
        database_url,
        pool_pre_ping=True,
    )


def get_engine() -> Engine:
    """Get the database engine, creating it lazily on first call.

    Returns:
        Engine: The SQLAlchemy engine.

    Raises:
        DatabaseUnavailableError: If DATABASE_URL is not configured.
    """
    return _get_engine()


class _LazySessionFactory:
    """Lazy session factory that creates the engine on first use."""

    def __init__(self):
        self._factory: Optional[sessionmaker] = None

    def __call__(self) -> Session:
        if self._factory is None:
            self._factory = sessionmaker(
                bind=_get_engine(),
                autoflush=False,
                expire_on_commit=False,
            )
        return self._factory()


# Lazy session factory - creates engine on first use
SessionLocal = _LazySessionFactory()


# Backward compatibility: engine property that raises on access if not configured
class _LazyEngine:
    """Lazy engine wrapper for backward compatibility."""

    def __getattr__(self, name):
        return getattr(get_engine(), name)


engine = _LazyEngine()


class Base(DeclarativeBase):
    """Base class for SQLAlchemy ORM models."""


def get_db():
    """Yield a database session and always close it.

    Raises:
        DatabaseUnavailableError: If DATABASE_URL is not configured.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> bool:
    """Check if database is reachable by running SELECT 1.

    Returns:
        bool: True if connection successful, False otherwise.
    """
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except (DatabaseUnavailableError, OperationalError, SQLAlchemyError) as exc:
        logger.warning("Database connection check failed: %s", exc)
        return False