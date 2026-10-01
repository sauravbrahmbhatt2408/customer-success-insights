from sqlalchemy import update

from app.database import SessionLocal
from app.models import User
from tests.conftest import PASSWORD, auth_headers, create_user


async def test_register_creates_csm_and_ignores_role(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "New.User@Example.com",
            "password": "Secret123",
            "full_name": "New User",
            "role": "admin",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "csm"
    assert body["email"] == "new.user@example.com"
    assert "hashed_password" not in body


async def test_register_duplicate_email_returns_409(client):
    await create_user("taken@example.com")

    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "TAKEN@example.com", "password": "Secret123", "full_name": "Someone"},
    )

    assert response.status_code == 409


async def test_register_weak_password_returns_422(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "weak@example.com", "password": "onlyletters", "full_name": "Weak"},
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "password"]


async def test_login_returns_token_and_sets_refresh_cookie(client):
    await create_user("csm@example.com")

    response = await client.post(
        "/api/v1/auth/login", json={"email": "csm@example.com", "password": PASSWORD}
    )

    assert response.status_code == 200
    assert response.json()["access_token"]
    cookie = response.headers["set-cookie"]
    assert "refresh_token=" in cookie
    assert "HttpOnly" in cookie

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {response.json()['access_token']}"},
    )
    assert me.json()["email"] == "csm@example.com"


async def test_wrong_password_and_unknown_email_get_same_error(client):
    await create_user("csm@example.com")

    wrong_password = await client.post(
        "/api/v1/auth/login", json={"email": "csm@example.com", "password": "Wrong12345"}
    )
    unknown_email = await client.post(
        "/api/v1/auth/login", json={"email": "nobody@example.com", "password": PASSWORD}
    )

    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()


async def test_refresh_uses_cookie_and_logout_clears_it(client):
    await create_user("csm@example.com")
    await auth_headers(client, "csm@example.com")

    refreshed = await client.post("/api/v1/auth/refresh")
    assert refreshed.status_code == 200
    assert refreshed.json()["user"]["email"] == "csm@example.com"

    await client.post("/api/v1/auth/logout")
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401


async def test_refresh_token_cannot_be_used_as_access_token(client):
    await create_user("csm@example.com")
    await auth_headers(client, "csm@example.com")
    refresh_token = client.cookies["refresh_token"]

    response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {refresh_token}"}
    )

    assert response.status_code == 401


async def test_inactive_user_cannot_log_in(client):
    await create_user("inactive@example.com", is_active=False)

    response = await client.post(
        "/api/v1/auth/login", json={"email": "inactive@example.com", "password": PASSWORD}
    )

    assert response.status_code == 403


async def test_deactivated_user_cannot_refresh(client):
    user = await create_user("csm@example.com")
    await auth_headers(client, "csm@example.com")

    async with SessionLocal() as db:
        await db.execute(update(User).where(User.id == user.id).values(is_active=False))
        await db.commit()

    assert (await client.post("/api/v1/auth/refresh")).status_code == 401
