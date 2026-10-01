import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.customer import Customer


class InteractionType(StrEnum):
    MEETING = "meeting"
    CALL = "call"
    EMAIL = "email"
    SUPPORT = "support"


class AIStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class Sentiment(StrEnum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class Interaction(Base):
    __tablename__ = "interactions"

    customer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(20), index=True)
    title: Mapped[str] = mapped_column(String(255))
    notes: Mapped[str] = mapped_column(Text)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ai_status: Mapped[str] = mapped_column(String(20), default=AIStatus.PENDING)

    customer: Mapped[Customer] = relationship(lazy="raise")
    insight: Mapped["Insight | None"] = relationship(
        back_populates="interaction", lazy="raise", passive_deletes=True
    )


class Insight(Base):
    __tablename__ = "insights"

    interaction_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("interactions.id", ondelete="CASCADE"), unique=True
    )
    # summary and sentiment stay empty when generation failed; error says why.
    summary: Mapped[str | None] = mapped_column(Text)
    sentiment: Mapped[str | None] = mapped_column(String(20), index=True)
    action_items: Mapped[list[str]] = mapped_column(JSONB, default=list)
    risks: Mapped[list[str]] = mapped_column(JSONB, default=list)
    model: Mapped[str] = mapped_column(String(100))
    error: Mapped[str | None] = mapped_column(Text)

    interaction: Mapped[Interaction] = relationship(back_populates="insight", lazy="raise")
