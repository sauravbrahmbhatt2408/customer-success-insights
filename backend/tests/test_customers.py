from app.models import Role
from tests.conftest import auth_headers, create_customer, create_user


async def test_csm_only_sees_own_customers_and_gets_404_for_others(client):
    await create_user("saurav@example.com")
    await create_user("daniel@example.com")
    saurav = await auth_headers(client, "saurav@example.com")
    daniel = await auth_headers(client, "daniel@example.com")
    mine = await create_customer(client, saurav, company="Mine")
    theirs = await create_customer(client, daniel, company="Theirs")

    listed = await client.get("/api/v1/customers", headers=saurav)
    other = await client.get(f"/api/v1/customers/{theirs['id']}", headers=saurav)
    edit_other = await client.patch(
        f"/api/v1/customers/{theirs['id']}", json={"status": "churned"}, headers=saurav
    )

    assert [c["id"] for c in listed.json()["items"]] == [mine["id"]]
    assert other.status_code == 404
    assert edit_other.status_code == 404


async def test_csm_owns_what_they_create_and_cannot_reassign(client):
    csm = await create_user("csm@example.com")
    other = await create_user("other@example.com")
    headers = await auth_headers(client, "csm@example.com")

    customer = await create_customer(client, headers, owner_id=str(other.id))
    reassign = await client.patch(
        f"/api/v1/customers/{customer['id']}", json={"owner_id": str(other.id)}, headers=headers
    )

    assert customer["owner"]["id"] == str(csm.id)
    assert reassign.status_code == 403


async def test_csm_cannot_delete_but_manager_can(client):
    await create_user("csm@example.com")
    await create_user("manager@example.com", role=Role.MANAGER)
    csm = await auth_headers(client, "csm@example.com")
    manager = await auth_headers(client, "manager@example.com")
    customer = await create_customer(client, csm)

    assert (
        await client.delete(f"/api/v1/customers/{customer['id']}", headers=csm)
    ).status_code == 403
    assert (
        await client.delete(f"/api/v1/customers/{customer['id']}", headers=manager)
    ).status_code == 204
    assert (
        await client.get(f"/api/v1/customers/{customer['id']}", headers=manager)
    ).status_code == 404


async def test_manager_assigns_owner_and_filters(client):
    csm = await create_user("csm@example.com")
    await create_user("manager@example.com", role=Role.MANAGER)
    headers = await auth_headers(client, "manager@example.com")
    await create_customer(
        client, headers, company="Northwind", status="at_risk", owner_id=str(csm.id)
    )
    await create_customer(client, headers, company="Globex", status="active")

    by_owner = await client.get(f"/api/v1/customers?owner_id={csm.id}", headers=headers)
    by_status = await client.get("/api/v1/customers?status=at_risk", headers=headers)
    by_search = await client.get("/api/v1/customers?search=north", headers=headers)

    assert by_owner.json()["total"] == 1
    assert by_owner.json()["items"][0]["owner"]["id"] == str(csm.id)
    assert [c["company"] for c in by_status.json()["items"]] == ["Northwind"]
    assert [c["company"] for c in by_search.json()["items"]] == ["Northwind"]


async def test_duplicate_customer_email_returns_409(client):
    await create_user("csm@example.com")
    headers = await auth_headers(client, "csm@example.com")
    await create_customer(client, headers, email="ops@acme.com")

    response = await client.post(
        "/api/v1/customers",
        json={"name": "Copy", "company": "Acme 2", "plan": "starter", "email": "OPS@acme.com"},
        headers=headers,
    )

    assert response.status_code == 409
