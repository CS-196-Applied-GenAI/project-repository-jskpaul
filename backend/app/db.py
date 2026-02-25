"""Database connection and session (async SQLAlchemy). Supports PostgreSQL, MySQL, and SQLite (tests)."""
from collections.abc import AsyncIterator
import os

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    return url


get_db_url = get_database_url


def get_database_url_sync() -> str:
    """URL for sync engine (e.g. create_engine). Converts async driver to sync."""
    url = get_database_url()
    if url.startswith("sqlite+aiosqlite"):
        return url.replace("sqlite+aiosqlite", "sqlite", 1)
    if url.startswith("mysql+aiomysql"):
        return url.replace("mysql+aiomysql", "mysql", 1)
    if url.startswith("postgresql+asyncpg"):
        return url.replace("postgresql+asyncpg", "postgresql", 1)
    return url


engine: AsyncEngine | None = None
SessionLocal: async_sessionmaker[AsyncSession] | None = None


def init_engine() -> None:
    global engine, SessionLocal
    if engine is None:
        url = get_database_url()
        connect_args = {}
        if "sqlite" in url:
            connect_args["check_same_thread"] = False
        engine = create_async_engine(url, echo=False, future=True, connect_args=connect_args)
        SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    if SessionLocal is None:
        init_engine()
    assert SessionLocal is not None
    async with SessionLocal() as session:
        yield session
