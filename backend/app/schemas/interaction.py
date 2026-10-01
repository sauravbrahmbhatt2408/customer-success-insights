import uuid
from datetime import datetime
from typing import Annotated

from pydantic import AwareDatetime, BaseModel, ConfigDict, StringConstraints

from app.models import AIStatus, InteractionType, Sentiment

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
Notes = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10000)]


class InteractionCreate(BaseModel):
    customer_id: uuid.UUID
    type: InteractionType
    title: Title
    notes: Notes
    occurred_at: AwareDatetime


class InteractionUpdate(BaseModel):
    type: InteractionType | None = None
    title: Title | None = None
    notes: Notes | None = None
    occurred_at: AwareDatetime | None = None


class InsightOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    summary: str | None
    sentiment: Sentiment | None
    action_items: list[str]
    risks: list[str]
    model: str
    error: str | None
    created_at: datetime


class CustomerBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    company: str


class InteractionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer: CustomerBrief
    created_by: uuid.UUID
    type: InteractionType
    title: str
    notes: str
    occurred_at: datetime
    ai_status: AIStatus
    insight: InsightOut | None
    created_at: datetime
    updated_at: datetime
