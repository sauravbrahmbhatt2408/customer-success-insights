import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models import CustomerStatus, Plan
from app.schemas.user import Email, UserOption

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
Mrr = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]


class CustomerCreate(BaseModel):
    name: Name
    company: Name
    email: Email | None = None
    phone: Annotated[str, Field(max_length=50)] | None = None
    industry: Annotated[str, Field(max_length=100)] | None = None
    plan: Plan
    status: CustomerStatus = CustomerStatus.ONBOARDING
    mrr: Mrr = Decimal(0)
    owner_id: uuid.UUID | None = None


class CustomerUpdate(BaseModel):
    name: Name | None = None
    company: Name | None = None
    email: Email | None = None
    phone: Annotated[str, Field(max_length=50)] | None = None
    industry: Annotated[str, Field(max_length=100)] | None = None
    plan: Plan | None = None
    status: CustomerStatus | None = None
    mrr: Mrr | None = None
    owner_id: uuid.UUID | None = None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    company: str
    email: str | None
    phone: str | None
    industry: str | None
    plan: Plan
    status: CustomerStatus
    mrr: Decimal
    owner: UserOption
    created_at: datetime
    updated_at: datetime
