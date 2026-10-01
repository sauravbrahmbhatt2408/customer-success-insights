from app.models import Role
from tests.conftest import auth_headers, create_user


async def test_only_admin_can_list_users(client):
    await create_user("admin@example.com", role=Role.ADMIN)
    await create_user("manager@example.com", role=Role.MANAGER)

    manager = await client.get(
        "/api/v1/users", headers=await auth_headers(client, "manager@example.com")
    )
    admin = await client.get(
        "/api/v1/users", headers=await auth_headers(client, "admin@example.com")
    )

    assert manager.status_code == 403
    assert admin.status_code == 200
    assert admin.json()["total"] == 2


async def test_admin_can_change_role_but_not_their_own(client):
    admin = await create_user("admin@example.com", role=Role.ADMIN)
    csm = await create_user("csm@example.com")
    headers = await auth_headers(client, "admin@example.com")

    promoted = await client.patch(
        f"/api/v1/users/{csm.id}", json={"role": "manager"}, headers=headers
    )
    demote_self = await client.patch(
        f"/api/v1/users/{admin.id}", json={"role": "csm"}, headers=headers
    )
    deactivate_self = await client.patch(
        f"/api/v1/users/{admin.id}", json={"is_active": False}, headers=headers
    )

    assert promoted.json()["role"] == "manager"
    assert demote_self.status_code == 400
    assert deactivate_self.status_code == 400


async def test_user_options_for_admin_and_manager_only(client):
    await create_user("manager@example.com", role=Role.MANAGER)
    await create_user("csm@example.com")
    await create_user("gone@example.com", is_active=False)

    manager = await client.get(
        "/api/v1/users/options", headers=await auth_headers(client, "manager@example.com")
    )
    csm = await client.get(
        "/api/v1/users/options", headers=await auth_headers(client, "csm@example.com")
    )

    assert csm.status_code == 403
    assert manager.status_code == 200
    assert {u["full_name"] for u in manager.json()} == {"Manager", "Csm"}
    assert set(manager.json()[0]) == {"id", "full_name", "role"}
