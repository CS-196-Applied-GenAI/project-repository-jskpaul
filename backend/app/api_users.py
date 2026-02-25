"""Users: profile GET, update profile PUT /users/me, follow/unfollow, block/unblock."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_db_session
from .models import Block, Follow, Tweet, User
from .schemas import FollowResponse, TweetRead, UserRead, UserReadMinimal, UserUpdate
from .security import get_current_user, get_current_user_optional

router = APIRouter()

DEFAULT_LIMIT = 50
MAX_LIMIT = 100


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead(
        id=current_user.id,
        username=current_user.username,
        created_at=current_user.created_at,
        email=current_user.email,
        bio=current_user.bio,
        profile_picture=current_user.profile_picture,
        name=current_user.name,
    )


@router.put("/me", response_model=UserRead)
async def update_profile(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> UserRead:
    if payload.username is not None:
        result = await db.execute(
            select(User).where(
                User.username == payload.username, User.id != current_user.id
            )
        )
        if result.scalar_one_or_none() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username taken")
        current_user.username = payload.username
    if payload.bio is not None:
        current_user.bio = payload.bio
    if payload.profile_picture is not None:
        current_user.profile_picture = payload.profile_picture
    if payload.name is not None:
        current_user.name = payload.name
    await db.commit()
    await db.refresh(current_user)
    return UserRead(
        id=current_user.id,
        username=current_user.username,
        created_at=current_user.created_at,
        email=current_user.email,
        bio=current_user.bio,
        profile_picture=current_user.profile_picture,
        name=current_user.name,
    )


@router.get("/{username}", response_model=dict)
async def get_profile(
    username: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_current_user_optional),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    before_id: int | None = Query(None),
) -> dict:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    is_following = False
    if current_user is not None:
        r = await db.execute(
            select(Follow).where(
                and_(
                    Follow.follower_id == current_user.id,
                    Follow.followee_id == user.id,
                )
            )
        )
        is_following = r.scalar_one_or_none() is not None
    stmt = (
        select(Tweet)
        .where(Tweet.user_id == user.id)
        .order_by(desc(Tweet.created_at), desc(Tweet.id))
        .limit(limit + 1)
    )
    if before_id is not None:
        stmt = stmt.where(Tweet.id < before_id)
    result = await db.execute(stmt)
    tweets = result.scalars().all()
    has_more = len(tweets) > limit
    if has_more:
        tweets = list(tweets)[:limit]
    items = [
        TweetRead(
            id=t.id,
            text=t.text,
            created_at=t.created_at,
            user_id=t.user_id,
            username=user.username,
            retweeted_from=t.retweeted_from,
            like_count=0,
            liked_by_me=False,
        )
        for t in tweets
    ]
    return {
        "user": UserReadMinimal(id=user.id, username=user.username),
        "tweets": items,
        "is_following": is_following,
    }


@router.post("/{user_id}/follow", response_model=FollowResponse)
async def follow_user(
    user_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> FollowResponse:
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow self")
    result = await db.execute(select(User).where(User.id == user_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    existing = await db.execute(
        select(Follow).where(
            and_(
                Follow.follower_id == current_user.id,
                Follow.followee_id == user_id,
            )
        )
    )
    if existing.scalar_one_or_none() is not None:
        return FollowResponse(follower_id=current_user.id, followed_id=user_id)
    db.add(Follow(follower_id=current_user.id, followee_id=user_id))
    await db.commit()
    return FollowResponse(follower_id=current_user.id, followed_id=user_id)


@router.delete("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(
    user_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        delete(Follow).where(
            and_(
                Follow.follower_id == current_user.id,
                Follow.followee_id == user_id,
            )
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not following")


@router.post("/{user_id}/block", status_code=status.HTTP_204_NO_CONTENT)
async def block_user(
    user_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot block self")
    result = await db.execute(select(User).where(User.id == user_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    existing = await db.execute(
        select(Block).where(
            and_(Block.blocker_id == current_user.id, Block.blocked_id == user_id)
        )
    )
    if existing.scalar_one_or_none() is not None:
        return None
    db.add(Block(blocker_id=current_user.id, blocked_id=user_id))
    await db.commit()
    return None


@router.delete("/{user_id}/block", status_code=status.HTTP_204_NO_CONTENT)
async def unblock_user(
    user_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        delete(Block).where(
            and_(Block.blocker_id == current_user.id, Block.blocked_id == user_id)
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
