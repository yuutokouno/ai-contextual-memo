import os
from collections.abc import Generator

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.infrastructure.memo.db.database import Base

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://acm:acm_password@localhost:5432/acm_test_db",
)

ADMIN_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://acm:acm_password@localhost:5432/acm_db",
)


@pytest.fixture(scope="session", autouse=True)
def create_test_database() -> None:
    """Create acm_test_db once per test session."""
    engine = create_engine(ADMIN_DATABASE_URL, isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = 'acm_test_db'")
        )
        if not result.fetchone():
            conn.execute(text("CREATE DATABASE acm_test_db"))
    engine.dispose()


@pytest.fixture(scope="session", autouse=True)
def enable_pgvector(create_test_database: None) -> None:
    """Enable pgvector extension in test database."""
    engine = create_engine(TEST_DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    engine.dispose()


@pytest.fixture(scope="function")
def test_session_factory() -> Generator[sessionmaker[Session]]:
    """Create tables before each test, drop after."""
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine)

    yield factory

    Base.metadata.drop_all(bind=engine)
    engine.dispose()
