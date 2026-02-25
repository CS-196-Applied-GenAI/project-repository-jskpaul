"""Auth: register, login (JWT sub=user id), logout (blacklist)."""
from fastapi import APIRouter, Depends, Form, HTTPException, status
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_db_session
from .models import BlacklistedToken, User
from .schemas import Token, UserRead, UserRegister
from .security import (
    create_access_token,
    get_current_user,
    get_jwt_algorithm,
    get_jwt_secret,
    hash_password,
    oauth2_scheme,
    verify_password,
)

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserRegister,
    db: AsyncSession = Depends(get_db_session),
) -> UserRead:
    result = await db.execute(select(User).where(User.username == payload.username))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserRead(
        id=user.id,
        username=user.username,
        created_at=user.created_at,
        email=user.email,
        bio=user.bio,
        profile_picture=user.profile_picture,
        name=user.name,
    )


@router.post("/token", response_model=Token)
async def login(
    username: str = Form(..., alias="username"),
    password: str = Form(..., alias="password"),
    db: AsyncSession = Depends(get_db_session),
) -> Token:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token, token_type="bearer")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    payload = jwt.decode(token, get_jwt_secret(), algorithms=[get_jwt_algorithm()])
    exp = payload.get("exp")
    expiration_time = int(exp) if exp is not None else None
    blacklisted = BlacklistedToken(token=token[:512], expiration_time=expiration_time)
    db.add(blacklisted)
    await db.commit()
    return None
