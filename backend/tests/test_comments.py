"""Coverage: comments create, list, 404 for missing tweet."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app
from app.db import get_db_session, get_database_url, get_database_url_sync
from app.models import Base
import os
import tempfile
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from collections.abc import AsyncIterator


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


async def register_and_login(ac: AsyncClient, username: str) -> str:
    await ac.post(
        "/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": "password123"},
    )
    r = await ac.post(
        "/auth/token",
        data={"username": username, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"].strip()


@pytest.mark.asyncio
async def test_create_comment_success(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await register_and_login(ac, "alice")
        create = await ac.post(
            "/tweets",
            json={"text": "original"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create.status_code == 201
        tweet_id = create.json()["id"]
        r = await ac.post(
            f"/tweets/{tweet_id}/comments",
            json={"contents": "first comment"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 201
        assert r.json()["contents"] == "first comment"
        assert r.json()["tweet_id"] == tweet_id


@pytest.mark.asyncio
async def test_create_comment_tweet_not_found(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await register_and_login(ac, "alice")
        r = await ac.post(
            "/tweets/99999/comments",
            json={"contents": "nope"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 404


@pytest.mark.asyncio
async def test_list_comments_success(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await register_and_login(ac, "alice")
        create = await ac.post(
            "/tweets",
            json={"text": "post"},
            headers={"Authorization": f"Bearer {token}"},
        )
        tweet_id = create.json()["id"]
        await ac.post(
            f"/tweets/{tweet_id}/comments",
            json={"contents": "c1"},
            headers={"Authorization": f"Bearer {token}"},
        )
        r = await ac.get(f"/tweets/{tweet_id}/comments")
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["contents"] == "c1"


@pytest.mark.asyncio
async def test_list_comments_tweet_not_found(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/tweets/99999/comments")
        assert r.status_code == 404
