"""Smoke test: app starts, health returns 200."""
import os
import tempfile
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.main import create_app
from app.db import get_db_session, get_database_url, get_database_url_sync
from app.models import Base
from collections.abc import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def app(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    path_url = Path(path).resolve().as_posix()
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{path_url}")
    sync_engine = create_engine(get_database_url_sync())
    Base.metadata.create_all(sync_engine)
    sync_engine.dispose()
    engine = create_async_engine(get_database_url(), future=True)
    SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

    async def override():
        async with SessionLocal() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db_session] = override
    return app


@pytest.mark.asyncio
async def test_health(app):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        r = await ac.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
