from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.deps import CurrentUser, DbSession
from app.models import Role, User
from app.schemas.user import MeUpdate, TokenOut, UserLogin, UserOut, UserRegister
from app.security import (
    DUMMY_HASH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"
COOKIE_PATH = "/api/v1/auth"


def set_refresh_cookie(response: Response, user: User) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        create_refresh_token(user.id),
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        REFRESH_COOKIE,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=COOKIE_PATH,
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: DbSession) -> User:
    existing = await db.scalar(select(User.id).where(User.email == data.email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=Role.CSM,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        # Two registrations with the same email at the same time.
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with this email already exists"
        ) from None
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
async def login(data: UserLogin, response: Response, db: DbSession) -> TokenOut:
    user = await db.scalar(select(User).where(User.email == data.email))
    if user is None:
        verify_password(data.password, DUMMY_HASH)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated")

    set_refresh_cookie(response, user)
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/refresh", response_model=TokenOut)
async def refresh(
    db: DbSession, refresh_token: Annotated[str | None, Cookie()] = None
) -> TokenOut | JSONResponse:
    user_id = decode_token(refresh_token, "refresh") if refresh_token else None
    user = await db.get(User, user_id) if user_id else None
    if user is None or not user.is_active:
        error = JSONResponse(
            {"detail": "Your session has expired. Please log in again."},
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
        clear_refresh_cookie(error)
        return error

    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    clear_refresh_cookie(response)


@router.get("/me", response_model=UserOut)
async def get_me(user: CurrentUser) -> User:
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(data: MeUpdate, user: CurrentUser, db: DbSession) -> User:
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.new_password is not None:
        if not verify_password(data.current_password or "", user.hashed_password):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
        user.hashed_password = hash_password(data.new_password)

    await db.commit()
    await db.refresh(user)
    return user
