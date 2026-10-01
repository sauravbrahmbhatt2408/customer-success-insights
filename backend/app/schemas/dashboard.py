import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models import AIStatus, CustomerStatus, InteractionType, Sentiment


class DashboardCards(BaseModel):
    total_customers: int
    active: int
    at_risk: int
    churned: int
    total_mrr: Decimal
    interactions_last_30_days: int


class DayCount(BaseModel):
    date: date
    count: int


class RecentRisk(BaseModel):
    interaction_id: uuid.UUID
    title: str
    customer_name: str
    company: str
    risks: list[str]
    occurred_at: datetime


class QuietCustomer(BaseModel):
    id: uuid.UUID
    name: str
    company: str
    status: CustomerStatus
    last_interaction_at: datetime | None


class RecentInteraction(BaseModel):
    id: uuid.UUID
    title: str
    type: InteractionType
    company: str
    occurred_at: datetime
    ai_status: AIStatus
    sentiment: Sentiment | None


class DashboardOut(BaseModel):
    cards: DashboardCards
    interactions_per_day: list[DayCount]
    sentiment: dict[Sentiment, int]
    customers_by_status: dict[CustomerStatus, int]
    recent_risks: list[RecentRisk]
    quiet_customers: list[QuietCustomer]
    recent_interactions: list[RecentInteraction]
