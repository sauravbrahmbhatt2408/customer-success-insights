import uuid
from datetime import UTC, date, datetime, time, timedelta
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cache import clear_dashboard_cache
from app.deps import CurrentUser, DbSession, PageParams, paginate
from app.models import (
    AIStatus,
    Customer,
    Insight,
    Interaction,
    InteractionType,
    Role,
    Sentiment,
    User,
)
from app.routers.customers import get_visible_customer
from app.schemas.common import Page
from app.schemas.interaction import InteractionCreate, InteractionOut, InteractionUpdate
from app.services.ai import process_interaction

router = APIRouter(prefix="/interactions", tags=["interactions"])


def visible_interactions(user: User) -> Select[tuple[Interaction]]:
    query = select(Interaction).options(
        selectinload(Interaction.customer), selectinload(Interaction.insight)
    )
    if user.role == Role.CSM:
        query = query.join(Customer).where(Customer.owner_id == user.id)
    return query


async def get_visible_interaction(
    db: AsyncSession, interaction_id: uuid.UUID, user: User
) -> Interaction:
    interaction = await db.scalar(
        visible_interactions(user).where(Interaction.id == interaction_id)
    )
    if interaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Interaction not found")
    return interaction


def start_of_day(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=UTC)


@router.get("", response_model=Page[InteractionOut])
async def list_interactions(
    user: CurrentUser,
    db: DbSession,
    pagination: PageParams,
    customer_id: uuid.UUID | None = None,
    type_: Annotated[InteractionType | None, Query(alias="type")] = None,
    sentiment: Sentiment | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict:
    query = visible_interactions(user)
    if customer_id:
        query = query.where(Interaction.customer_id == customer_id)
    if type_:
        query = query.where(Interaction.type == type_)
    if sentiment:
        query = query.join(Insight).where(Insight.sentiment == sentiment)
    if date_from:
        query = query.where(Interaction.occurred_at >= start_of_day(date_from))
    if date_to:
        # date_to is inclusive, so compare against the start of the next day.
        query = query.where(Interaction.occurred_at < start_of_day(date_to + timedelta(days=1)))
    query = query.order_by(Interaction.occurred_at.desc(), Interaction.id)
    return await paginate(db, query, pagination)


@router.post("", response_model=InteractionOut, status_code=status.HTTP_201_CREATED)
async def create_interaction(
    data: InteractionCreate, user: CurrentUser, db: DbSession, background: BackgroundTasks
) -> Interaction:
    customer = await get_visible_customer(db, data.customer_id, user)

    interaction = Interaction(**data.model_dump(), created_by=user.id, ai_status=AIStatus.PENDING)
    db.add(interaction)
    await db.commit()
    await clear_dashboard_cache(customer.owner_id)
    background.add_task(process_interaction, interaction.id)
    return await get_visible_interaction(db, interaction.id, user)


@router.get("/{interaction_id}", response_model=InteractionOut)
async def get_interaction(
    interaction_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> Interaction:
    return await get_visible_interaction(db, interaction_id, user)


@router.patch("/{interaction_id}", response_model=InteractionOut)
async def update_interaction(
    interaction_id: uuid.UUID,
    data: InteractionUpdate,
    user: CurrentUser,
    db: DbSession,
    background: BackgroundTasks,
) -> Interaction:
    interaction = await get_visible_interaction(db, interaction_id, user)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)

    notes_changed = "notes" in changes and changes["notes"] != interaction.notes
    for field, value in changes.items():
        setattr(interaction, field, value)
    if notes_changed:
        interaction.ai_status = AIStatus.PENDING

    await db.commit()
    await clear_dashboard_cache(interaction.customer.owner_id)
    if notes_changed:
        background.add_task(process_interaction, interaction.id)
    return interaction


@router.post(
    "/{interaction_id}/regenerate",
    response_model=InteractionOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def regenerate_insight(
    interaction_id: uuid.UUID, user: CurrentUser, db: DbSession, background: BackgroundTasks
) -> Interaction:
    interaction = await get_visible_interaction(db, interaction_id, user)
    if interaction.ai_status == AIStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "The insight is already being generated")

    interaction.ai_status = AIStatus.PENDING
    await db.commit()
    background.add_task(process_interaction, interaction.id)
    return interaction
