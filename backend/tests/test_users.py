"""Coverage tests: profile, update profile, follow/unfollow, block/unblock."""
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
async def test_get_profile(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await register_and_login(ac, "alice")
        r = await ac.get("/users/alice")
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["username"] == "alice"
        assert "tweets" in data


@pytest.mark.asyncio
async def test_profile_404(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/users/nonexistent_user_xyz")
        assert r.status_code == 404


@pytest.mark.asyncio
async def test_follow_and_unfollow(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        alice_token = await register_and_login(ac, "alice")
        await register_and_login(ac, "bob")
        r = await ac.post(
            "/users/2/follow",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        assert r.status_code == 200
        assert r.json()["followed_id"] == 2
        unfollow = await ac.delete(
            "/users/2/follow",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        assert unfollow.status_code == 204


@pytest.mark.asyncio
async def test_follow_self_rejected(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await register_and_login(ac, "alice")
        r = await ac.post(
            "/users/1/follow",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 400


@pytest.mark.asyncio
async def test_update_profile(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await register_and_login(ac, "alice")
        r = await ac.put(
            "/users/me",
            json={"bio": "Hello world"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        assert r.json()["bio"] == "Hello world"


@pytest.mark.asyncio
async def test_block_and_unblock(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        alice_token = await register_and_login(ac, "alice")
        await register_and_login(ac, "bob")
        r = await ac.post(
            "/users/2/block",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        assert r.status_code == 204
        unblock = await ac.delete(
            "/users/2/block",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        assert unblock.status_code == 204


@pytest.mark.asyncio
async def test_get_me(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await register_and_login(ac, "alice")
        r = await ac.get("/users/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["username"] == "alice"


@pytest.mark.asyncio
async def test_update_profile_username_taken(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await register_and_login(ac, "alice")
        bob_token = await register_and_login(ac, "bob")
        r = await ac.put(
            "/users/me",
            json={"username": "alice"},
            headers={"Authorization": f"Bearer {bob_token}"},
        )
        assert r.status_code == 409


@pytest.mark.asyncio
async def test_follow_404_nonexistent_user(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await register_and_login(ac, "alice")
        r = await ac.post(
            "/users/99999/follow",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 404


@pytest.mark.asyncio
async def test_unfollow_404_not_following(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        alice_token = await register_and_login(ac, "alice")
        await register_and_login(ac, "bob")
        r = await ac.delete(
            "/users/2/follow",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        assert r.status_code == 404


@pytest.mark.asyncio
async def test_block_404_nonexistent_user(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await register_and_login(ac, "alice")
        r = await ac.post(
            "/users/99999/block",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 404


@pytest.mark.asyncio
async def test_block_self_rejected(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await register_and_login(ac, "alice")
        r = await ac.post(
            "/users/1/block",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 400


@pytest.mark.asyncio
async def test_unblock_404_not_blocked(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        alice_token = await register_and_login(ac, "alice")
        await register_and_login(ac, "bob")
        # Never blocked bob, so unblock returns 404
        r = await ac.delete(
            "/users/2/block",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        assert r.status_code == 404


@pytest.mark.asyncio
async def test_profile_with_auth_shows_is_following(client):
    app, engine, _path = client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        alice_token = await register_and_login(ac, "alice")
        await register_and_login(ac, "bob")
        await ac.post(
            "/users/2/follow",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        r = await ac.get("/users/bob", headers={"Authorization": f"Bearer {alice_token}"})
        assert r.status_code == 200
        assert r.json()["is_following"] is True
