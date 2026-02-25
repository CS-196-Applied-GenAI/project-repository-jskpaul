"""Coverage tests: create tweet, delete tweet, feed (followed only), retweet, like."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.main import create_app
from app.db import get_db_session, get_database_url, get_database_url_sync
from app.models import Base, Follow
import asyncio
import os
import tempfile
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
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


@pytest.mark.asyncio
async def test_create_and_delete_tweet(client) -> None:
    app, engine, _path = client
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        token = await register_and_login(ac, "alice")
        create_resp = await ac.post(
            "/tweets",
            json={"text": "hello world"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_resp.status_code == 201, (
            f"create tweet failed: {create_resp.status_code} {create_resp.text}"
        )
        tweet_id = create_resp.json()["id"]
        delete_resp = await ac.delete(
            f"/tweets/{tweet_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert delete_resp.status_code == 204, delete_resp.text


@pytest.mark.asyncio
async def test_feed_shows_followee_tweets(client) -> None:
    app, engine, _path = client
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        alice_token = await register_and_login(ac, "alice")
        bob_token = await register_and_login(ac, "bob")

        sm = async_sessionmaker(bind=engine, expire_on_commit=False)
        async with sm() as session:
            session.add(Follow(follower_id=1, followee_id=2))
            await session.commit()

        create_resp = await ac.post(
            "/tweets",
            json={"text": "bob's tweet"},
            headers={"Authorization": f"Bearer {bob_token}"},
        )
        assert create_resp.status_code == 201, create_resp.text

        feed_resp = await ac.get(
            "/feed",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        assert feed_resp.status_code == 200, feed_resp.text
        data = feed_resp.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        assert len(items) == 1
        assert items[0]["text"] == "bob's tweet"


@pytest.mark.asyncio
async def test_like_and_unlike(client) -> None:
    app, engine, _path = client
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        token = await register_and_login(ac, "alice")
        create = await ac.post(
            "/tweets",
            json={"text": "tweet"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create.status_code == 201
        tweet_id = create.json()["id"]
        like = await ac.post(
            f"/tweets/{tweet_id}/like",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert like.status_code == 201
        unlike = await ac.delete(
            f"/tweets/{tweet_id}/like",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert unlike.status_code == 204


@pytest.mark.asyncio
async def test_retweet(client) -> None:
    app, engine, _path = client
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        alice_token = await register_and_login(ac, "alice")
        bob_token = await register_and_login(ac, "bob")
        create = await ac.post(
            "/tweets",
            json={"text": "original"},
            headers={"Authorization": f"Bearer {bob_token}"},
        )
        assert create.status_code == 201
        orig_id = create.json()["id"]
        rt = await ac.post(
            f"/tweets/{orig_id}/retweet",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        assert rt.status_code == 201
        assert rt.json().get("retweeted_from") == orig_id


@pytest.mark.asyncio
async def test_delete_tweet_404_when_not_owner(client):
    app, engine, _path = client
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        alice_token = await register_and_login(ac, "alice")
        bob_token = await register_and_login(ac, "bob")
        create = await ac.post(
            "/tweets",
            json={"text": "bob's"},
            headers={"Authorization": f"Bearer {bob_token}"},
        )
        tweet_id = create.json()["id"]
        r = await ac.delete(
            f"/tweets/{tweet_id}",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_tweet_404_nonexistent(client):
    app, engine, _path = client
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        token = await register_and_login(ac, "alice")
        r = await ac.delete(
            "/tweets/99999",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 404


@pytest.mark.asyncio
async def test_retweet_404_nonexistent(client):
    app, engine, _path = client
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        token = await register_and_login(ac, "alice")
        r = await ac.post(
            "/tweets/99999/retweet",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 404


@pytest.mark.asyncio
async def test_retweet_409_already_retweeted(client):
    app, engine, _path = client
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        alice_token = await register_and_login(ac, "alice")
        bob_token = await register_and_login(ac, "bob")
        create = await ac.post(
            "/tweets",
            json={"text": "original"},
            headers={"Authorization": f"Bearer {bob_token}"},
        )
        orig_id = create.json()["id"]
        await ac.post(
            f"/tweets/{orig_id}/retweet",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        r = await ac.post(
            f"/tweets/{orig_id}/retweet",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        assert r.status_code == 409


@pytest.mark.asyncio
async def test_unretweet_404(client):
    app, engine, _path = client
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        token = await register_and_login(ac, "alice")
        create = await ac.post(
            "/tweets",
            json={"text": "mine"},
            headers={"Authorization": f"Bearer {token}"},
        )
        tweet_id = create.json()["id"]
        r = await ac.delete(
            f"/tweets/{tweet_id}/retweet",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 404


@pytest.mark.asyncio
async def test_like_404_nonexistent_tweet(client):
    app, engine, _path = client
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        token = await register_and_login(ac, "alice")
        r = await ac.post(
            "/tweets/99999/like",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 404


@pytest.mark.asyncio
async def test_like_idempotent(client):
    app, engine, _path = client
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        token = await register_and_login(ac, "alice")
        create = await ac.post(
            "/tweets",
            json={"text": "t"},
            headers={"Authorization": f"Bearer {token}"},
        )
        tweet_id = create.json()["id"]
        r1 = await ac.post(
            f"/tweets/{tweet_id}/like",
            headers={"Authorization": f"Bearer {token}"},
        )
        r2 = await ac.post(
            f"/tweets/{tweet_id}/like",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r1.status_code == 201
        assert r2.status_code == 201


@pytest.mark.asyncio
async def test_feed_requires_auth(client):
    app, engine, _path = client
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        r = await ac.get("/feed")
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_feed_empty_when_no_follows(client):
    app, engine, _path = client
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        alice_token = await register_and_login(ac, "alice")
        bob_token = await register_and_login(ac, "bob")
        await ac.post(
            "/tweets",
            json={"text": "bob solo"},
            headers={"Authorization": f"Bearer {bob_token}"},
        )
        feed_resp = await ac.get(
            "/feed",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        assert feed_resp.status_code == 200
        data = feed_resp.json()
        items = data.get("items", [])
        assert len(items) == 0
