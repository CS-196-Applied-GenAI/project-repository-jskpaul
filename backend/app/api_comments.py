"""Comments: POST /tweets/{id}/comments, GET /tweets/{id}/comments."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_db_session
from .models import Comment, Tweet, User
from .schemas import CommentCreate, CommentRead
from .security import get_current_user

router = APIRouter()

DEFAULT_LIMIT = 50
MAX_LIMIT = 100


@router.post("/{tweet_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
async def create_comment(
    tweet_id: int,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CommentRead:
    result = await db.execute(select(Tweet).where(Tweet.id == tweet_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tweet not found")
    comment = Comment(
        user_id=current_user.id,
        tweet_id=tweet_id,
        contents=payload.contents,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return CommentRead(
        id=comment.id,
        user_id=comment.user_id,
        username=current_user.username,
        tweet_id=comment.tweet_id,
        contents=comment.contents,
        created_at=comment.created_at,
    )


@router.get("/{tweet_id}/comments", response_model=list[CommentRead])
async def list_comments(
    tweet_id: int,
    db: AsyncSession = Depends(get_db_session),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    before_id: int | None = Query(None),
) -> list[CommentRead]:
    result = await db.execute(select(Tweet).where(Tweet.id == tweet_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tweet not found")
    stmt = (
        select(Comment, User.username)
        .join(User, User.id == Comment.user_id)
        .where(Comment.tweet_id == tweet_id)
        .order_by(desc(Comment.created_at), desc(Comment.id))
        .limit(limit)
    )
    if before_id is not None:
        stmt = stmt.where(Comment.id < before_id)
    result = await db.execute(stmt)
    rows = result.all()
    return [
        CommentRead(
            id=c.id,
            user_id=c.user_id,
            username=uname,
            tweet_id=c.tweet_id,
            contents=c.contents,
            created_at=c.created_at,
        )
        for c, uname in rows
    ]
