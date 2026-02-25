"""Bird-App 2.0 Backend — FastAPI + Chirper schema."""
from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from . import api_auth, api_comments, api_feed, api_tweets, api_users
from .db import get_db_session


def create_app() -> FastAPI:
    app = FastAPI(title="Bird-App Backend")

    @app.get("/health")
    async def health(db: AsyncSession = Depends(get_db_session)) -> dict:
        await db.execute(text("SELECT 1"))
        return {"status": "ok"}

    app.include_router(api_auth.router, prefix="/auth", tags=["auth"])
    app.include_router(api_feed.router, tags=["feed"])
    app.include_router(api_tweets.router, prefix="/tweets", tags=["tweets"])
    app.include_router(api_comments.router, prefix="/tweets", tags=["comments"])
    app.include_router(api_users.router, prefix="/users", tags=["users"])

    return app


app = create_app()
