import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cache import clear_dashboard_cache
from app.deps import CurrentUser, DbSession, PageParams, paginate, require_role
from app.models import Customer, CustomerStatus, Plan, Role, User
from app.schemas.common import Page
from app.schemas.customer import CustomerCreate, CustomerOut, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["customers"])

NULLABLE_FIELDS = {"email", "phone", "industry"}


def visible_customers(user: User) -> Select[tuple[Customer]]:
    query = select(Customer).options(selectinload(Customer.owner))
    if user.role == Role.CSM:
        query = query.where(Customer.owner_id == user.id)
    return query


async def get_visible_customer(db: AsyncSession, customer_id: uuid.UUID, user: User) -> Customer:
    # Another csm's customer gets the same 404 as one that doesn't exist.
    customer = await db.scalar(visible_customers(user).where(Customer.id == customer_id))
    if customer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")
    return customer


async def check_owner(db: AsyncSession, owner_id: uuid.UUID) -> None:
    owner = await db.get(User, owner_id)
    if owner is None or not owner.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Owner not found")


async def commit_or_conflict(db: AsyncSession) -> None:
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "A customer with this email already exists"
        ) from None


@router.get("", response_model=Page[CustomerOut])
async def list_customers(
    user: CurrentUser,
    db: DbSession,
    pagination: PageParams,
    status_: Annotated[CustomerStatus | None, Query(alias="status")] = None,
    plan: Plan | None = None,
    owner_id: uuid.UUID | None = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
) -> dict:
    query = visible_customers(user)
    if status_:
        query = query.where(Customer.status == status_)
    if plan:
        query = query.where(Customer.plan == plan)
    if owner_id:
        query = query.where(Customer.owner_id == owner_id)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                Customer.name.ilike(pattern),
                Customer.company.ilike(pattern),
                Customer.email.ilike(pattern),
            )
        )
    query = query.order_by(Customer.created_at.desc(), Customer.id)
    return await paginate(db, query, pagination)


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
async def create_customer(data: CustomerCreate, user: CurrentUser, db: DbSession) -> Customer:
    if user.role == Role.CSM or data.owner_id is None:
        owner_id = user.id
    else:
        await check_owner(db, data.owner_id)
        owner_id = data.owner_id

    customer = Customer(**data.model_dump(exclude={"owner_id"}), owner_id=owner_id)
    db.add(customer)
    await commit_or_conflict(db)
    await clear_dashboard_cache(owner_id)
    await db.refresh(customer, ["owner"])
    return customer


@router.get("/{customer_id}", response_model=CustomerOut)
async def get_customer(customer_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Customer:
    return await get_visible_customer(db, customer_id, user)


@router.patch("/{customer_id}", response_model=CustomerOut)
async def update_customer(
    customer_id: uuid.UUID, data: CustomerUpdate, user: CurrentUser, db: DbSession
) -> Customer:
    customer = await get_visible_customer(db, customer_id, user)
    changes = {
        field: value
        for field, value in data.model_dump(exclude_unset=True).items()
        if value is not None or field in NULLABLE_FIELDS
    }

    new_owner = changes.get("owner_id")
    if new_owner and new_owner != customer.owner_id:
        if user.role == Role.CSM:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You can't reassign customers")
        await check_owner(db, new_owner)

    old_owner = customer.owner_id
    for field, value in changes.items():
        setattr(customer, field, value)
    await commit_or_conflict(db)
    await clear_dashboard_cache(old_owner, customer.owner_id)
    await db.refresh(customer, ["owner"])
    return customer


@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(Role.ADMIN, Role.MANAGER))],
)
async def delete_customer(customer_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    customer = await get_visible_customer(db, customer_id, user)
    await db.delete(customer)
    await db.commit()
    await clear_dashboard_cache(customer.owner_id)
