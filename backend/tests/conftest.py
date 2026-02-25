"""Pytest fixtures: in-memory SQLite DB, app with overridden session, async client."""
import asyncio
import os
import tempfile
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.main import create_app
from app.db import get_db_session, get_database_url, get_database_url_sync
from app.models import Base


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    monkeypatch.setenv("JWT_ALGORITHM", "HS256")

    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    path_url = Path(path).resolve().as_posix()
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{path_url}")

    sync_engine = create_engine(get_database_url_sync())
    Base.metadata.create_all(sync_engine)
    sync_engine.dispose()

    engine = create_async_engine(get_database_url(), future=True)
    SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

    async def override_get_db_session() -> AsyncIterator[AsyncSession]:
        async with SessionLocal() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db_session] = override_get_db_session
    yield app, engine, path
    try:
        asyncio.run(engine.dispose())
    except Exception:
        pass
    try:
        Path(path).unlink(missing_ok=True)
    except PermissionError:
        pass


async def register_and_login(ac: AsyncClient, username: str, email: str | None = None) -> str:
    if email is None:
        email = f"{username}@example.com"
    await ac.post(
        "/auth/register",
        json={"username": username, "email": email, "password": "password123"},
    )
    r = await ac.post(
        "/auth/token",
        data={"username": username, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"].strip()
