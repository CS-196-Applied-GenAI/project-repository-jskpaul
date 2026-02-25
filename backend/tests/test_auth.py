"""Coverage tests: register, login (JWT sub=id), logout, validation."""
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


@pytest.fixture
def auth_client(monkeypatch):
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

    async def override():
        async with SessionLocal() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db_session] = override
    return app


@pytest.mark.asyncio
async def test_register_success(auth_client):
    async with AsyncClient(
        transport=ASGITransport(app=auth_client), base_url="http://test"
    ) as ac:
        r = await ac.post(
            "/auth/register",
            json={"username": "alice", "email": "alice@example.com", "password": "password123"},
        )
        assert r.status_code == 201
        data = r.json()
        assert data["username"] == "alice"
        assert data["email"] == "alice@example.com"
        assert "id" in data
        assert "password" not in str(data).lower()


@pytest.mark.asyncio
async def test_register_duplicate_username(auth_client):
    async with AsyncClient(
        transport=ASGITransport(app=auth_client), base_url="http://test"
    ) as ac:
        await ac.post(
            "/auth/register",
            json={"username": "bob", "email": "bob@example.com", "password": "password123"},
        )
        r = await ac.post(
            "/auth/register",
            json={"username": "bob", "email": "other@example.com", "password": "other123"},
        )
        assert r.status_code == 409


@pytest.mark.asyncio
async def test_login_returns_jwt_with_sub_id(auth_client):
    async with AsyncClient(
        transport=ASGITransport(app=auth_client), base_url="http://test"
    ) as ac:
        reg = await ac.post(
            "/auth/register",
            json={"username": "alice", "email": "alice@example.com", "password": "password123"},
        )
        assert reg.status_code == 201
        user_id = reg.json()["id"]
        r = await ac.post(
            "/auth/token",
            data={"username": "alice", "password": "password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert r.status_code == 200
        token = r.json()["access_token"]
        assert token
        # Use token to create tweet — proves sub is user id
        create = await ac.post(
            "/tweets",
            json={"text": "hello"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create.status_code == 201, create.text


@pytest.mark.asyncio
async def test_login_invalid_password(auth_client):
    async with AsyncClient(
        transport=ASGITransport(app=auth_client), base_url="http://test"
    ) as ac:
        await ac.post(
            "/auth/register",
            json={"username": "alice", "email": "alice@example.com", "password": "password123"},
        )
        r = await ac.post(
            "/auth/token",
            data={"username": "alice", "password": "wrong"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_logout_blacklists_token(auth_client):
    async with AsyncClient(
        transport=ASGITransport(app=auth_client), base_url="http://test"
    ) as ac:
        await ac.post(
            "/auth/register",
            json={"username": "alice", "email": "alice@example.com", "password": "password123"},
        )
        r = await ac.post(
            "/auth/token",
            data={"username": "alice", "password": "password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token = r.json()["access_token"]
        logout = await ac.post(
            "/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert logout.status_code == 204
        # Using same token should now 401
        feed = await ac.get("/feed", headers={"Authorization": f"Bearer {token}"})
        assert feed.status_code == 401


@pytest.mark.asyncio
async def test_register_duplicate_email(auth_client):
    async with AsyncClient(
        transport=ASGITransport(app=auth_client), base_url="http://test"
    ) as ac:
        await ac.post(
            "/auth/register",
            json={"username": "alice", "email": "same@example.com", "password": "password123"},
        )
        r = await ac.post(
            "/auth/register",
            json={"username": "bob", "email": "same@example.com", "password": "password123"},
        )
        assert r.status_code == 409


@pytest.mark.asyncio
async def test_login_nonexistent_user(auth_client):
    async with AsyncClient(
        transport=ASGITransport(app=auth_client), base_url="http://test"
    ) as ac:
        r = await ac.post(
            "/auth/token",
            data={"username": "nobody", "password": "anything"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert r.status_code == 401
