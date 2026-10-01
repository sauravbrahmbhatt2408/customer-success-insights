"""Create the admin from env vars plus demo data. Safe to run more than once."""

import asyncio
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select

from app.config import settings
from app.database import SessionLocal, engine
from app.models import (
    AIStatus,
    Customer,
    CustomerStatus,
    Insight,
    Interaction,
    InteractionType,
    Plan,
    Role,
    User,
)
from app.security import hash_password

DEFAULT_PASSWORD = "Welcome123"

TEAM = [
    ("maria@csinsights.io", "Maria Lopez", Role.MANAGER),
    ("saurav@csinsights.io", "Saurav Brahmbhatt", Role.CSM),
    ("daniel@csinsights.io", "Daniel Kim", Role.CSM),
]

# name, company, email, industry, plan, status, mrr, owner email
CUSTOMERS = [
    (
        "Laura Bennett",
        "Northwind Logistics",
        "laura@northwind.io",
        "Logistics",
        Plan.ENTERPRISE,
        CustomerStatus.ACTIVE,
        "8400",
        "saurav@csinsights.io",
    ),
    (
        "Tom Fischer",
        "Brightpath Health",
        "tom@brightpath.health",
        "Healthcare",
        Plan.GROWTH,
        CustomerStatus.AT_RISK,
        "2100",
        "saurav@csinsights.io",
    ),
    (
        "Aisha Okafor",
        "Kitebird Retail",
        "aisha@kitebird.com",
        "Retail",
        Plan.STARTER,
        CustomerStatus.ONBOARDING,
        "450",
        "saurav@csinsights.io",
    ),
    (
        "Marco Rossi",
        "Velto Finance",
        "marco@velto.finance",
        "Fintech",
        Plan.ENTERPRISE,
        CustomerStatus.ACTIVE,
        "12500",
        "saurav@csinsights.io",
    ),
    (
        "Sophie Martin",
        "Greenleaf Foods",
        "sophie@greenleaf.co",
        "Food & Beverage",
        Plan.GROWTH,
        CustomerStatus.CHURNED,
        "0",
        "saurav@csinsights.io",
    ),
    (
        "James Carter",
        "Orbit Analytics",
        "james@orbitanalytics.com",
        "SaaS",
        Plan.GROWTH,
        CustomerStatus.ACTIVE,
        "3200",
        "daniel@csinsights.io",
    ),
    (
        "Mei Chen",
        "Harbor Education",
        "mei@harbor.edu",
        "Education",
        Plan.STARTER,
        CustomerStatus.ACTIVE,
        "600",
        "daniel@csinsights.io",
    ),
    (
        "Ravi Patel",
        "Stackline Manufacturing",
        "ravi@stackline.com",
        "Manufacturing",
        Plan.ENTERPRISE,
        CustomerStatus.AT_RISK,
        "9800",
        "daniel@csinsights.io",
    ),
    (
        "Emma Wilson",
        "Cobalt Media",
        "emma@cobaltmedia.com",
        "Media",
        Plan.GROWTH,
        CustomerStatus.ONBOARDING,
        "1800",
        "daniel@csinsights.io",
    ),
    (
        "Lucas Moreau",
        "Pinecrest Hotels",
        "lucas@pinecrest.travel",
        "Hospitality",
        Plan.STARTER,
        CustomerStatus.ACTIVE,
        "350",
        "maria@csinsights.io",
    ),
]

# customer company, type, title, notes, days ago, insight (summary, sentiment, actions, risks)
INTERACTIONS = [
    (
        "Northwind Logistics",
        InteractionType.MEETING,
        "Quarterly business review",
        "Reviewed Q3 usage with Laura and her ops leads. Shipment tracking adoption is up 40% "
        "and they want to roll the platform out to the Rotterdam warehouse next quarter. "
        "They asked for SSO before the rollout.",
        3,
        (
            "Strong QBR with growing adoption and a planned expansion to a new warehouse.",
            "positive",
            ["Share SSO setup guide", "Plan Rotterdam rollout timeline"],
            [],
        ),
    ),
    (
        "Northwind Logistics",
        InteractionType.EMAIL,
        "SSO question",
        "Laura asked whether SSO works with Azure AD and how long setup usually takes. Sent the "
        "docs and offered a call with our solutions engineer.",
        12,
        (
            "Customer is preparing for SSO ahead of an expansion.",
            "neutral",
            ["Book call with solutions engineer"],
            [],
        ),
    ),
    (
        "Brightpath Health",
        InteractionType.CALL,
        "Renewal concerns",
        "Tom said the clinical team finds reporting too slow and they are evaluating a competitor. "
        "Renewal is in six weeks. He wants to see the new reporting module before deciding.",
        2,
        (
            "Renewal at risk because of slow reporting; customer is evaluating a competitor.",
            "negative",
            ["Demo the new reporting module this week", "Loop in account executive"],
            ["Evaluating a competitor", "Renewal in six weeks"],
        ),
    ),
    (
        "Brightpath Health",
        InteractionType.SUPPORT,
        "Reports timing out",
        "Ticket escalated: monthly compliance report times out for date ranges over 90 days. "
        "Engineering confirmed a slow query and is working on a fix.",
        9,
        (
            "Report timeouts on long date ranges; engineering is fixing a slow query.",
            "negative",
            ["Follow up with engineering on fix date"],
            ["Compliance reporting blocked"],
        ),
    ),
    (
        "Kitebird Retail",
        InteractionType.MEETING,
        "Onboarding kickoff",
        "Kickoff with Aisha and two store managers. Walked through setup, imported their product "
        "catalog and agreed on a two-week onboarding plan with weekly check-ins.",
        5,
        (
            "Onboarding started smoothly with a clear two-week plan.",
            "positive",
            ["Send onboarding checklist", "Schedule weekly check-ins"],
            [],
        ),
    ),
    (
        "Velto Finance",
        InteractionType.CALL,
        "Expansion discussion",
        "Marco wants to add the risk team, roughly 25 more seats. Procurement needs a security "
        "questionnaire and an updated DPA before they can sign.",
        7,
        (
            "Customer plans to add about 25 seats pending security review.",
            "positive",
            ["Send security questionnaire", "Ask legal for updated DPA"],
            ["Procurement could delay the expansion"],
        ),
    ),
    (
        "Velto Finance",
        InteractionType.EMAIL,
        "Invoice question",
        "Finance asked why last invoice included prorated seats. Explained the mid-cycle seat "
        "change and sent a breakdown. They were fine with it.",
        20,
        ("Billing question about prorated seats was resolved.", "neutral", [], []),
    ),
    (
        "Greenleaf Foods",
        InteractionType.CALL,
        "Cancellation call",
        "Sophie confirmed they are cancelling. Budget was cut after a reorganisation and the new "
        "team prefers a spreadsheet process. Left the door open for next year.",
        45,
        (
            "Customer churned due to budget cuts after a reorganisation.",
            "negative",
            ["Set reminder to reconnect next year"],
            ["Budget cut", "New team prefers spreadsheets"],
        ),
    ),
    (
        "Orbit Analytics",
        InteractionType.MEETING,
        "Feature feedback session",
        "James shared feedback on the API. They like the webhooks but need higher rate limits for "
        "their nightly sync. Otherwise very happy and open to a case study.",
        4,
        (
            "Happy customer asking for higher API rate limits; open to a case study.",
            "positive",
            ["Raise rate limit request with product", "Ask marketing about case study"],
            [],
        ),
    ),
    (
        "Orbit Analytics",
        InteractionType.SUPPORT,
        "Webhook retries",
        "Webhook deliveries failed for an hour during their deploy. Explained the retry policy and "
        "shared how to replay missed events from the dashboard.",
        15,
        (
            "Webhook failures during a deploy were explained and resolved.",
            "neutral",
            ["Share webhook replay docs"],
            [],
        ),
    ),
    (
        "Harbor Education",
        InteractionType.EMAIL,
        "Term start check-in",
        "Mei confirmed all teachers are set up for the new term and asked about a discount for "
        "adding a second campus.",
        10,
        (
            "Smooth term start; customer asking about pricing for a second campus.",
            "positive",
            ["Send multi-campus pricing"],
            [],
        ),
    ),
    (
        "Stackline Manufacturing",
        InteractionType.MEETING,
        "Executive escalation",
        "Ravi and their VP Operations raised concerns about two outages last month and slow "
        "support responses. They want a written incident report and a named support contact.",
        1,
        (
            "Executive escalation after two outages and slow support.",
            "negative",
            [
                "Send incident report",
                "Assign named support contact",
                "Schedule follow-up in two weeks",
            ],
            ["Outages hurting trust", "Executive sponsor unhappy"],
        ),
    ),
    (
        "Stackline Manufacturing",
        InteractionType.SUPPORT,
        "Login issue",
        "Password reset for two users.",
        18,
        None,
    ),
    (
        "Cobalt Media",
        InteractionType.CALL,
        "Onboarding progress",
        "Emma's team finished the content import. Two editors still need training and they want "
        "the Slack integration enabled before go-live next week.",
        6,
        (
            "Onboarding nearly done; training and Slack integration needed before go-live.",
            "neutral",
            ["Schedule editor training", "Enable Slack integration"],
            [],
        ),
    ),
    ("Pinecrest Hotels", InteractionType.EMAIL, "Check-in", "Quick check-in, no issues.", 40, None),
]


async def get_or_create_user(db, email: str, full_name: str, role: Role, password: str) -> User:
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            email=email, full_name=full_name, role=role, hashed_password=hash_password(password)
        )
        db.add(user)
        await db.flush()
        print(f"Created {role} {email}")
    return user


async def seed() -> None:
    async with SessionLocal() as db:
        users = {
            settings.admin_email.lower(): await get_or_create_user(
                db, settings.admin_email.lower(), "Neha Kapoor", Role.ADMIN, settings.admin_password
            )
        }
        for email, full_name, role in TEAM:
            users[email] = await get_or_create_user(db, email, full_name, role, DEFAULT_PASSWORD)

        if await db.scalar(select(func.count()).select_from(Customer)):
            await db.commit()
            print("Customers already exist, skipping demo data")
            return

        customers = {}
        for i, (name, company, email, industry, plan, status, mrr, owner) in enumerate(CUSTOMERS):
            customer = Customer(
                name=name,
                company=company,
                email=email,
                phone=f"+1 555 01{i:02d}",
                industry=industry,
                plan=plan,
                status=status,
                mrr=Decimal(mrr),
                owner_id=users[owner].id,
            )
            db.add(customer)
            customers[company] = customer
        await db.flush()

        now = datetime.now(UTC)
        for company, type_, title, notes, days_ago, insight in INTERACTIONS:
            customer = customers[company]
            interaction = Interaction(
                customer_id=customer.id,
                created_by=customer.owner_id,
                type=type_,
                title=title,
                notes=notes,
                occurred_at=now - timedelta(days=days_ago),
                ai_status=AIStatus.COMPLETED if insight else AIStatus.SKIPPED,
            )
            db.add(interaction)
            await db.flush()
            if insight:
                summary, sentiment, action_items, risks = insight
                db.add(
                    Insight(
                        interaction_id=interaction.id,
                        summary=summary,
                        sentiment=sentiment,
                        action_items=action_items,
                        risks=risks,
                        model="seed",
                    )
                )

        await db.commit()
        print(f"Added {len(CUSTOMERS)} customers and {len(INTERACTIONS)} interactions")


async def main() -> None:
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
