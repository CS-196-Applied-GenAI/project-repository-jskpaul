"""Tweets: create, delete, feed (followed only, blocks, cursor), retweet/unretweet, like/unlike."""
from datetime import datetime, timezone
import json
import logging
import os
from typing import Any, Tuple

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_db_session
from .models import Block, Follow, Like, Tweet, User
from .schemas import FeedResponse, LikeResponse, SentimentPreviewRequest, SentimentPreviewResponse, TweetCreate, TweetRead
from .security import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# Default and max page size for feed
DEFAULT_LIMIT = 50
MAX_LIMIT = 100

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Use the public Gemini REST model name that supports generateContent.
# You can override this via the GEMINI_MODEL env var if needed.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


async def analyze_sentiment_with_gemini(text: str) -> Tuple[str | None, float | None, str | None]:
  """Call Gemini to analyze sentiment for the given text.

  Returns (label, score, model) or (None, None, None) on failure or if not configured.
  """
  if not text:
      return None, None, None
  if not GEMINI_API_KEY:
      logger.info("GEMINI_API_KEY not set; skipping sentiment analysis")
      return None, None, None

  system_instruction = (
      "You are a sentiment analysis assistant. "
      "Given a short social media post, respond with a single line of strict JSON in the form:\n"
      '{"label": "positive" | "neutral" | "negative", "score": float}\n'
      "Label should be the overall sentiment; score should be between -1.0 (very negative) and 1.0 (very positive). "
      "Do not include any explanation or extra text."
  )

  payload = {
      "contents": [
          {
              "parts": [
                  {"text": system_instruction},
                  {"text": f"Post:\n{text}"}
              ]
          }
      ]
  }

  url = GEMINI_ENDPOINT.format(model=GEMINI_MODEL)
  try:
      async with httpx.AsyncClient(timeout=8.0) as client:
          resp = await client.post(url, params={"key": GEMINI_API_KEY}, json=payload)
      if resp.status_code != 200:
          logger.error(
              "Gemini sentiment request failed: status=%s body=%s",
              resp.status_code,
              resp.text[:500],
          )
          return None, None, None
      data = resp.json()
      candidates = data.get("candidates") or []
      if not candidates:
          logger.warning("Gemini sentiment response had no candidates: %s", data)
          return None, None, None
      parts = candidates[0].get("content", {}).get("parts") or []
      if not parts:
          logger.warning("Gemini sentiment candidate had no parts: %s", candidates[0])
          return None, None, None
      raw_text = parts[0].get("text", "").strip()
      try:
          sentiment = json.loads(raw_text)
      except json.JSONDecodeError as exc:
          logger.error("Failed to parse Gemini sentiment JSON. raw_text=%r error=%s", raw_text, exc)
          return None, None, None
      label = str(sentiment.get("label")) if sentiment.get("label") is not None else None
      score_value = sentiment.get("score")
      try:
          score = float(score_value) if score_value is not None else None
      except (TypeError, ValueError):
          logger.error("Gemini sentiment score was not a float: %r", score_value)
          score = None
      return label, score, GEMINI_MODEL
  except Exception as exc:  # pragma: no cover - defensive
      logger.exception("Error calling Gemini sentiment API: %s", exc)
      return None, None, None


@router.post("/sentiment-preview", response_model=SentimentPreviewResponse)
async def sentiment_preview(
    payload: SentimentPreviewRequest,
    current_user: User = Depends(get_current_user),
) -> SentimentPreviewResponse:
    label, score, model = await analyze_sentiment_with_gemini(payload.text)
    return SentimentPreviewResponse(
        sentiment_label=label,
        sentiment_score=score,
        sentiment_model=model,
    )


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

    label, score, model = await analyze_sentiment_with_gemini(tweet.text or "")
    if label is not None or score is not None:
        tweet.sentiment_label = label
        tweet.sentiment_score = score
        tweet.sentiment_model = model
        tweet.sentiment_analyzed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(tweet)

    return _tweet_to_read(tweet, current_user.username, like_count=0, liked_by_me=False)


@router.get("/{tweet_id}", response_model=TweetRead)
async def get_tweet(
    tweet_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> TweetRead:
    result = await db.execute(select(Tweet, User.username).join(User, User.id == Tweet.user_id).where(Tweet.id == tweet_id))
    row = result.first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tweet not found")
    tweet, username = row
    original_id = tweet.retweeted_from if tweet.retweeted_from is not None else tweet.id
    like_count_result = await db.execute(
        select(func.count()).select_from(Like).where(Like.tweet_id == tweet.id)
    )
    like_count = like_count_result.scalar() or 0
    liked = await db.execute(
        select(Like).where(and_(Like.tweet_id == tweet.id, Like.user_id == current_user.id))
    )
    liked_by_me = liked.scalar_one_or_none() is not None
    retweet_exists = await db.execute(
        select(Tweet.id).where(
            and_(
                Tweet.user_id == current_user.id,
                Tweet.retweeted_from == original_id,
            )
        )
    )
    retweeted_by_me = retweet_exists.first() is not None
    retweeted_from_username = None
    retweeted_from_text = None
    if tweet.retweeted_from is not None:
        orig = await db.execute(
            select(Tweet, User.username)
            .join(User, User.id == Tweet.user_id)
            .where(Tweet.id == tweet.retweeted_from)
        )
        orig_row = orig.first()
        if orig_row is not None:
            orig_tweet, orig_username = orig_row
            retweeted_from_username = orig_username
            retweeted_from_text = orig_tweet.text
    return _tweet_to_read(
        tweet,
        username,
        like_count=like_count,
        liked_by_me=liked_by_me,
        retweeted_from_username=retweeted_from_username,
        retweeted_from_text=retweeted_from_text,
        retweeted_by_me=retweeted_by_me,
    )


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
    # Include original tweet details so the frontend can render retweets without extra requests.
    orig = await db.execute(
        select(Tweet, User.username)
        .join(User, User.id == Tweet.user_id)
        .where(Tweet.id == tweet_id)
    )
    orig_row = orig.first()
    retweeted_from_username = orig_row[1] if orig_row is not None else None
    retweeted_from_text = orig_row[0].text if orig_row is not None else None
    return _tweet_to_read(
        retweet_row,
        current_user.username,
        like_count=0,
        liked_by_me=False,
        retweeted_from_username=retweeted_from_username,
        retweeted_from_text=retweeted_from_text,
        retweeted_by_me=True,
    )


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
    tweet: Tweet,
    username: str,
    like_count: int = 0,
    liked_by_me: bool = False,
    retweeted_from_username: str | None = None,
    retweeted_from_text: str | None = None,
    retweeted_by_me: bool = False,
) -> TweetRead:
    return TweetRead(
        id=tweet.id,
        text=tweet.text,
        created_at=tweet.created_at,
        user_id=tweet.user_id,
        username=username,
        retweeted_from=tweet.retweeted_from,
        retweeted_from_username=retweeted_from_username,
        retweeted_from_text=retweeted_from_text,
        retweeted_by_me=retweeted_by_me,
        like_count=like_count,
        liked_by_me=liked_by_me,
        sentiment_label=tweet.sentiment_label,
        sentiment_score=tweet.sentiment_score,
    )
