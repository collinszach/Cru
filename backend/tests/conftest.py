"""
Test infrastructure for Cru backend.

Isolation pattern:
  - Each test function gets its own engine + AsyncSession (function-scoped).
    Creating a fresh engine per test keeps asyncpg connections on the same
    event loop that runs the test function, avoiding the "Future attached to a
    different loop" RuntimeError that occurs when a session-scoped engine's
    pool connections are reused across per-test event loops in pytest-asyncio 0.24.
  - Schema setup (extensions + create_all) runs inside the db fixture — all
    DDL is idempotent so the overhead is minimal (~20ms per test).
  - Routes that call session.commit() commit for real — required so that
    subsequent reads within the same test see the committed data.
  - After each test, TRUNCATE wipes all application tables so each test starts
    with a clean slate.
  - FastAPI dependency_overrides replace:
      get_db                  → yields the per-test session
      get_current_user        → returns TEST_USER_ID (no JWT involved)
      get_current_user_claims → returns a minimal claims dict
      get_redis_or_none       → yields None (no Redis required in tests)
"""
import os
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth import get_current_user, get_current_user_claims
from app.database import Base, get_db
from app.dependencies import get_redis_or_none
from app.main import app

# ---------------------------------------------------------------------------
# Disable the FastAPI lifespan in tests.
#
# The lifespan (app/main.py) calls `engine.connect()` on the app's global
# SQLAlchemy engine.  asyncpg binds each connection to the event loop that
# was current when the connection was opened.  Because each test function
# runs on its own event loop (pytest-asyncio 0.24 default), pooled connections
# from a prior test's loop would be reused on a different loop, causing:
#   RuntimeError: Task got Future attached to a different loop
#
# Replacing the lifespan with a no-op prevents the app engine from being
# touched at all.  The test's `db` fixture supplies the DB session via
# dependency_overrides, so the app engine is never needed in request handlers.
# ---------------------------------------------------------------------------
from contextlib import asynccontextmanager


@asynccontextmanager
async def _noop_lifespan(_app):
    yield


app.router.lifespan_context = _noop_lifespan

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TEST_USER_ID = "test_user_clerk_001"
TEST_USER_ID_B = "test_user_clerk_002"  # second user for isolation tests

TEST_CLAIMS = {
    "sub": TEST_USER_ID,
    "email": "test@example.com",
    "name": "Test User",
}
TEST_CLAIMS_B = {
    "sub": TEST_USER_ID_B,
    "email": "testb@example.com",
    "name": "Test User B",
}

def _build_test_db_url() -> str:
    """
    Build the test database URL, preferring TEST_DATABASE_URL env var.
    Falls back to the app settings URL with the db swapped to 'cru_test',
    so tests work inside the Docker container without manual env setup.
    """
    explicit = os.environ.get("TEST_DATABASE_URL")
    if explicit:
        return explicit
    # Derive from app settings — correct user/password/host, different db
    from app.config import get_settings
    s = get_settings()
    return (
        f"postgresql+asyncpg://{s.postgres_user}:{s.postgres_password}"
        f"@{s.postgres_host}:{s.postgres_port}/cru_test"
    )


_TEST_DB_URL = _build_test_db_url()

# ---------------------------------------------------------------------------
# Per-test session with TRUNCATE cleanup
# ---------------------------------------------------------------------------

# Tables to truncate after each test — ordered to avoid FK violations.
# CASCADE handles any remaining dependencies.
_TRUNCATE_SQL = text(
    "TRUNCATE TABLE "
    "tasting_notes, cellar_entries, wine_embeddings, user_taste_profiles, "
    "wishlist, wineries, photos, wines, producers, appellations, "
    "vintage_quality, users "
    "RESTART IDENTITY CASCADE"
)


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    """
    Create a fresh engine + AsyncSession for this test function.

    Using a per-test engine ensures asyncpg connections are created on the same
    event loop that runs the test, preventing the "Future attached to a different
    loop" error that occurs when a session-scoped engine is shared with
    function-scoped test coroutines in pytest-asyncio 0.24.

    Schema DDL (extensions + create_all) is idempotent — no-ops when tables
    already exist — so the per-test overhead is minimal.
    """
    engine = create_async_engine(_TEST_DB_URL, echo=False, pool_size=1, max_overflow=0)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    # Post-test cleanup — runs even if the test raised an exception
    async with engine.begin() as conn:
        await conn.execute(_TRUNCATE_SQL)

    await engine.dispose()


# ---------------------------------------------------------------------------
# HTTP clients with dependency overrides
#
# User identity is read from the X-Test-User-Id request header so that
# `client` and `client_b` can coexist in the same test without fighting over
# app.dependency_overrides[get_current_user].
# ---------------------------------------------------------------------------

from fastapi import Request as _Request


def _install_overrides(db: AsyncSession) -> None:
    """Set all dependency overrides.  Idempotent — safe to call from both fixtures."""

    async def _override_db():
        yield db

    async def _override_redis():
        yield None

    def _override_user(request: _Request) -> str:
        return request.headers.get("X-Test-User-Id", TEST_USER_ID)

    def _override_claims(request: _Request) -> dict:
        uid = request.headers.get("X-Test-User-Id", TEST_USER_ID)
        return TEST_CLAIMS_B if uid == TEST_USER_ID_B else TEST_CLAIMS

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_current_user_claims] = _override_claims
    app.dependency_overrides[get_redis_or_none] = _override_redis


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient authenticated as TEST_USER_ID."""
    _install_overrides(db)
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"X-Test-User-Id": TEST_USER_ID},
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client_b(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient authenticated as TEST_USER_ID_B.  For user-isolation tests."""
    _install_overrides(db)
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"X-Test-User-Id": TEST_USER_ID_B},
    ) as ac:
        yield ac
    app.dependency_overrides.clear()
