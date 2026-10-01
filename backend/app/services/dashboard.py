from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import ColumnElement, func, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer, CustomerStatus, Insight, Interaction, Role, Sentiment, User
from app.schemas.dashboard import DashboardOut

QUIET_DAYS = 30
LIST_LIMIT = 5


def owner_scope(user: User) -> ColumnElement[bool]:
    return Customer.owner_id == user.id if user.role == Role.CSM else true()


async def build_dashboard(db: AsyncSession, user: User) -> DashboardOut:
    scope = owner_scope(user)
    today = datetime.now(UTC).date()
    since = datetime.combine(today - timedelta(days=29), datetime.min.time(), tzinfo=UTC)

    status_rows = await db.execute(
        select(Customer.status, func.count(), func.coalesce(func.sum(Customer.mrr), 0))
        .where(scope)
        .group_by(Customer.status)
    )
    by_status = {s: 0 for s in CustomerStatus}
    total_mrr = Decimal(0)
    for status, count, mrr in status_rows:
        by_status[CustomerStatus(status)] = count
        if status != CustomerStatus.CHURNED:
            total_mrr += mrr

    day = func.date(func.timezone("UTC", Interaction.occurred_at)).label("day")
    day_rows = await db.execute(
        select(day, func.count())
        .join(Customer)
        .where(scope, Interaction.occurred_at >= since)
        .group_by(day)
    )
    per_day = dict(day_rows.all())
    interactions_per_day = [
        {"date": d, "count": per_day.get(d, 0)}
        for d in (since.date() + timedelta(days=i) for i in range(30))
    ]

    sentiment_rows = await db.execute(
        select(Insight.sentiment, func.count())
        .join(Interaction)
        .join(Customer)
        .where(scope, Insight.sentiment.is_not(None))
        .group_by(Insight.sentiment)
    )
    sentiment = {s: 0 for s in Sentiment} | {Sentiment(s): c for s, c in sentiment_rows}

    risk_rows = await db.execute(
        select(
            Interaction.id.label("interaction_id"),
            Interaction.title,
            Customer.name.label("customer_name"),
            Customer.company,
            Insight.risks,
            Interaction.occurred_at,
        )
        .select_from(Insight)
        .join(Interaction)
        .join(Customer)
        .where(scope, func.jsonb_array_length(Insight.risks) > 0)
        .order_by(Interaction.occurred_at.desc())
        .limit(LIST_LIMIT)
    )

    last_seen = (
        select(Interaction.customer_id, func.max(Interaction.occurred_at).label("last_at"))
        .group_by(Interaction.customer_id)
        .subquery()
    )
    quiet_since = datetime.now(UTC) - timedelta(days=QUIET_DAYS)
    quiet_rows = await db.execute(
        select(
            Customer.id,
            Customer.name,
            Customer.company,
            Customer.status,
            last_seen.c.last_at.label("last_interaction_at"),
        )
        .outerjoin(last_seen, last_seen.c.customer_id == Customer.id)
        .where(
            scope,
            Customer.status != CustomerStatus.CHURNED,
            or_(last_seen.c.last_at.is_(None), last_seen.c.last_at < quiet_since),
        )
        .order_by(last_seen.c.last_at.asc().nulls_first())
        .limit(LIST_LIMIT)
    )

    recent_rows = await db.execute(
        select(
            Interaction.id,
            Interaction.title,
            Interaction.type,
            Customer.company,
            Interaction.occurred_at,
            Interaction.ai_status,
            Insight.sentiment,
        )
        .join(Customer)
        .outerjoin(Insight)
        .where(scope)
        .order_by(Interaction.occurred_at.desc())
        .limit(LIST_LIMIT)
    )

    return DashboardOut.model_validate(
        {
            "cards": {
                "total_customers": sum(by_status.values()),
                "active": by_status[CustomerStatus.ACTIVE],
                "at_risk": by_status[CustomerStatus.AT_RISK],
                "churned": by_status[CustomerStatus.CHURNED],
                "total_mrr": total_mrr,
                "interactions_last_30_days": sum(per_day.values()),
            },
            "interactions_per_day": interactions_per_day,
            "sentiment": sentiment,
            "customers_by_status": by_status,
            "recent_risks": [row._asdict() for row in risk_rows],
            "quiet_customers": [row._asdict() for row in quiet_rows],
            "recent_interactions": [row._asdict() for row in recent_rows],
        }
    )
