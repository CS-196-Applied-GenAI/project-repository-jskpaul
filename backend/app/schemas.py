"""Pydantic request/response schemas. Validation: username 3–20 alphanumeric/underscore, password min 8, tweet max 240."""
import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ----- Auth -----
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8)

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z][a-zA-Z0-9_]*$", v):
            raise ValueError("Username must start with a letter, then letters, numbers or underscore")
        return v


class UserRead(BaseModel):
    id: int
    username: str
    created_at: datetime
    email: str | None = None
    bio: str | None = None
    profile_picture: str | None = None
    name: str | None = None


class UserReadMinimal(BaseModel):
    id: int
    username: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ----- Profile update -----
class UserUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=20)
    bio: str | None = None
    profile_picture: str | None = None
    name: str | None = None

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not re.match(r"^[a-zA-Z][a-zA-Z0-9_]*$", v):
            raise ValueError("Username must start with a letter, then letters, numbers or underscore")
        return v


# ----- Tweets -----
class TweetCreate(BaseModel):
    text: str | None = Field(None, max_length=240)


class TweetRead(BaseModel):
    id: int
    text: str | None
    created_at: datetime
    user_id: int
    username: str
    retweeted_from: int | None = None
    like_count: int = 0
    liked_by_me: bool = False


class FeedResponse(BaseModel):
    items: list[TweetRead]
    next_cursor: dict[str, Any] | None = None


# ----- Comments -----
class CommentCreate(BaseModel):
    contents: str = Field(..., max_length=240)


class CommentRead(BaseModel):
    id: int
    user_id: int
    username: str
    tweet_id: int
    contents: str | None
    created_at: datetime


# ----- Follow / Block -----
class FollowResponse(BaseModel):
    follower_id: int
    followed_id: int


class LikeResponse(BaseModel):
    tweet_id: int
    liked: bool = True
