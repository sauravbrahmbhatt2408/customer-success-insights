import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.deps import DbSession, PageParams, paginate, require_role
from app.models import Role, User
from app.schemas.common import Page
from app.schemas.user import UserAdminUpdate, UserOption, UserOut

router = APIRouter(prefix="/users", tags=["users"])

AdminUser = Annotated[User, Depends(require_role(Role.ADMIN))]
AdminOrManager = Annotated[User, Depends(require_role(Role.ADMIN, Role.MANAGER))]


@router.get("", response_model=Page[UserOut])
async def list_users(_: AdminUser, db: DbSession, pagination: PageParams) -> dict:
    return await paginate(db, select(User).order_by(User.created_at, User.id), pagination)


@router.get("/options", response_model=list[UserOption])
async def list_user_options(_: AdminOrManager, db: DbSession) -> list[User]:
    users = await db.scalars(select(User).where(User.is_active).order_by(User.full_name))
    return list(users)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: uuid.UUID, data: UserAdminUpdate, admin: AdminUser, db: DbSession
) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    if user.id == admin.id:
        if data.role is not None and data.role != admin.role:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't change your own role")
        if data.is_active is False:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "You can't deactivate your own account"
            )

    for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user
