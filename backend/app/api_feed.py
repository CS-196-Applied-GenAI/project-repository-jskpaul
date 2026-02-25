"""Feed: GET /feed — followed users only, exclude blocks, cursor pagination."""
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_db_session
from .models import Block, Follow, Like, Tweet, User
from .schemas import FeedResponse, TweetRead
from .security import get_current_user

router = APIRouter()

DEFAULT_LIMIT = 50
MAX_LIMIT = 100


@router.get("/feed", response_model=FeedResponse)
async def get_feed(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    before_created_at: str | None = Query(None, description="Cursor: ISO timestamp"),
    before_id: int | None = Query(None, description="Cursor: tweet id tie-breaker"),
) -> FeedResponse:
    followees = select(Follow.followee_id).where(Follow.follower_id == current_user.id)
    blocked_by_me = select(Block.blocked_id).where(Block.blocker_id == current_user.id)
    blocking_me = select(Block.blocker_id).where(Block.blocked_id == current_user.id)

    stmt = (
        select(Tweet, User.username)
        .join(User, User.id == Tweet.user_id)
        .where(Tweet.user_id.in_(followees))
        .where(~Tweet.user_id.in_(blocked_by_me))
        .where(~Tweet.user_id.in_(blocking_me))
        .order_by(desc(Tweet.created_at), desc(Tweet.id))
        .limit(limit + 1)
    )
    if before_created_at is not None and before_id is not None:
        try:
            before_ts = datetime.fromisoformat(before_created_at.replace("Z", "+00:00"))
        except ValueError:
            before_ts = None
        if before_ts is not None:
            stmt = stmt.where(
                or_(
                    Tweet.created_at < before_ts,
                    (Tweet.created_at == before_ts) & (Tweet.id < before_id),
                )
            )
    result = await db.execute(stmt)
    rows = result.all()
    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]
    items: list[TweetRead] = []
    for tweet, username in rows:
        like_count_result = await db.execute(
            select(func.count()).select_from(Like).where(Like.tweet_id == tweet.id)
        )
        like_count = like_count_result.scalar() or 0
        liked = await db.execute(
            select(Like).where(
                and_(Like.tweet_id == tweet.id, Like.user_id == current_user.id)
            )
        )
        liked_by_me = liked.scalar_one_or_none() is not None
        items.append(
            TweetRead(
                id=tweet.id,
                text=tweet.text,
                created_at=tweet.created_at,
                user_id=tweet.user_id,
                username=username,
                retweeted_from=tweet.retweeted_from,
                like_count=like_count,
                liked_by_me=liked_by_me,
            )
        )
    next_cursor = None
    if has_more and rows:
        last = rows[-1]
        next_cursor = {
            "before_created_at": last[0].created_at.isoformat(),
            "before_id": last[0].id,
        }
    return FeedResponse(items=items, next_cursor=next_cursor)
