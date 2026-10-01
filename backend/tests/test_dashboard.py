from app.cache import redis
from app.models import Role
from tests.conftest import auth_headers, create_customer, create_interaction, create_user


async def test_csm_and_manager_get_different_scopes(client):
    await create_user("priya@example.com")
    await create_user("daniel@example.com")
    await create_user("manager@example.com", role=Role.MANAGER)
    priya = await auth_headers(client, "priya@example.com")
    daniel = await auth_headers(client, "daniel@example.com")
    manager = await auth_headers(client, "manager@example.com")
    mine = await create_customer(client, priya, status="active", mrr="500")
    await create_customer(client, daniel, status="at_risk", mrr="2000")
    await create_interaction(client, priya, mine["id"])

    csm_view = (await client.get("/api/v1/dashboard", headers=priya)).json()
    manager_view = (await client.get("/api/v1/dashboard", headers=manager)).json()

    assert csm_view["cards"]["total_customers"] == 1
    assert csm_view["cards"]["total_mrr"] == "500.00"
    assert manager_view["cards"]["total_customers"] == 2
    assert manager_view["cards"]["at_risk"] == 1
    assert manager_view["cards"]["interactions_last_30_days"] == 1
    assert await redis.exists("dashboard:all")
    assert await redis.exists(f"dashboard:user:{mine['owner']['id']}")


async def test_cache_is_cleared_after_a_write(client):
    await create_user("csm@example.com")
    await create_user("manager@example.com", role=Role.MANAGER)
    csm = await auth_headers(client, "csm@example.com")
    manager = await auth_headers(client, "manager@example.com")
    await create_customer(client, csm)

    before = (await client.get("/api/v1/dashboard", headers=csm)).json()
    await client.get("/api/v1/dashboard", headers=manager)
    await create_customer(client, csm, company="Second")
    after = (await client.get("/api/v1/dashboard", headers=csm)).json()
    manager_after = (await client.get("/api/v1/dashboard", headers=manager)).json()

    assert before["cards"]["total_customers"] == 1
    assert after["cards"]["total_customers"] == 2
    assert manager_after["cards"]["total_customers"] == 2
