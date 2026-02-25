"""Tweets: create, delete, feed (followed only, blocks, cursor), retweet/unretweet, like/unlike."""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_db_session
from .models import Block, Follow, Like, Tweet, User
from .schemas import FeedResponse, LikeResponse, TweetCreate, TweetRead
from .security import get_current_user

router = APIRouter()

# Default and max page size for feed
DEFAULT_LIMIT = 50
MAX_LIMIT = 100


@router.post("", response_model=TweetRead, status_code=status.HTTP_201_CREATED)
async def create_tweet(
    payload: TweetCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> TweetRead:
    tweet = Tweet(user_id=current_user.id, text=payload.text or "")
    db.add(tweet)
    await db.commit()
    await db.refresh(tweet)
    return _tweet_to_read(tweet, current_user.username, like_count=0, liked_by_me=False)


@router.delete("/{tweet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tweet(
    tweet_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(select(Tweet).where(Tweet.id == tweet_id))
    tweet = result.scalar_one_or_none()
    if tweet is None or tweet.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    await db.execute(delete(Tweet).where(Tweet.id == tweet_id))
    await db.commit()


@router.post("/{tweet_id}/retweet", response_model=TweetRead, status_code=status.HTTP_201_CREATED)
async def retweet(
    tweet_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> TweetRead:
    result = await db.execute(select(Tweet).where(Tweet.id == tweet_id))
    original = result.scalar_one_or_none()
    if original is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tweet not found")
    # Idempotent: already retweeted?
    existing = await db.execute(
        select(Tweet).where(
            and_(Tweet.user_id == current_user.id, Tweet.retweeted_from == tweet_id)
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already retweeted")
    retweet_row = Tweet(user_id=current_user.id, retweeted_from=tweet_id, text=None)
    db.add(retweet_row)
    await db.commit()
    await db.refresh(retweet_row)
    return _tweet_to_read(retweet_row, current_user.username, like_count=0, liked_by_me=False)


@router.delete("/{tweet_id}/retweet", status_code=status.HTTP_204_NO_CONTENT)
async def unretweet(
    tweet_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        delete(Tweet).where(
            and_(Tweet.user_id == current_user.id, Tweet.retweeted_from == tweet_id)
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Retweet not found")


@router.post("/{tweet_id}/like", response_model=LikeResponse, status_code=status.HTTP_201_CREATED)
async def like_tweet(
    tweet_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> LikeResponse:
    result = await db.execute(select(Tweet).where(Tweet.id == tweet_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tweet not found")
    existing = await db.execute(
        select(Like).where(
            and_(Like.tweet_id == tweet_id, Like.user_id == current_user.id)
        )
    )
    if existing.scalar_one_or_none() is not None:
        return LikeResponse(tweet_id=tweet_id, liked=True)
    like = Like(tweet_id=tweet_id, user_id=current_user.id)
    db.add(like)
    await db.commit()
    return LikeResponse(tweet_id=tweet_id, liked=True)


@router.delete("/{tweet_id}/like", status_code=status.HTTP_204_NO_CONTENT)
async def unlike_tweet(
    tweet_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    await db.execute(
        delete(Like).where(and_(Like.tweet_id == tweet_id, Like.user_id == current_user.id))
    )
    await db.commit()


def _tweet_to_read(
    tweet: Tweet, username: str, like_count: int = 0, liked_by_me: bool = False
) -> TweetRead:
    return TweetRead(
        id=tweet.id,
        text=tweet.text,
        created_at=tweet.created_at,
        user_id=tweet.user_id,
        username=username,
        retweeted_from=tweet.retweeted_from,
        like_count=like_count,
        liked_by_me=liked_by_me,
    )
