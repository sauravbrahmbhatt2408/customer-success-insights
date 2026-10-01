import os

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@127.0.0.1:5433/csinsights_test",
)
# Must be set before the app is imported, since the engine is created at import time.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["GEMINI_API_KEY"] = ""
os.environ["REDIS_URL"] = os.environ.get("TEST_REDIS_URL", "redis://127.0.0.1:6379/15")

from datetime import UTC, datetime  # noqa: E402

import asyncpg  # noqa: E402
import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from app.cache import redis  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Role, User  # noqa: E402
from app.security import hash_password  # noqa: E402

PASSWORD = "Password123"


async def create_database_if_missing() -> None:
    url = make_url(TEST_DATABASE_URL)
    conn = await asyncpg.connect(
        host=url.host, port=url.port, user=url.username, password=url.password, database="postgres"
    )
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", url.database)
        if not exists:
            await conn.execute(f'CREATE DATABASE "{url.database}"')
    finally:
        await conn.close()


@pytest.fixture(scope="session", autouse=True)
async def database():
    await create_database_if_missing()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await redis.aclose()
    await engine.dispose()


@pytest.fixture(autouse=True)
async def clean_tables():
    yield
    tables = ", ".join(table.name for table in Base.metadata.sorted_tables)
    async with engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {tables} CASCADE"))
    await redis.flushdb()


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def create_user(email: str, role: Role = Role.CSM, is_active: bool = True) -> User:
    async with SessionLocal() as db:
        user = User(
            email=email,
            hashed_password=hash_password(PASSWORD),
            full_name=email.split("@")[0].title(),
            role=role,
            is_active=is_active,
        )
        db.add(user)
        await db.commit()
        return user


async def auth_headers(client: AsyncClient, email: str) -> dict[str, str]:
    response = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def create_customer(client: AsyncClient, headers: dict[str, str], **fields) -> dict:
    data = {"name": "Jane Doe", "company": "Acme", "plan": "growth", "mrr": "1000"} | fields
    response = await client.post("/api/v1/customers", json=data, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


async def create_interaction(
    client: AsyncClient, headers: dict[str, str], customer_id: str, **fields
) -> dict:
    data = {
        "customer_id": customer_id,
        "type": "call",
        "title": "Check-in",
        "notes": "Discussed renewal timeline and the new reporting module in detail.",
        "occurred_at": datetime.now(UTC).isoformat(),
    } | fields
    response = await client.post("/api/v1/interactions", json=data, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()
