from tests.conftest import auth_headers, create_customer, create_user

NOTES = "Discussed renewal timeline and the new reporting module in detail."


async def test_csm_cannot_log_or_see_interactions_for_other_customers(client):
    await create_user("priya@example.com")
    await create_user("daniel@example.com")
    priya = await auth_headers(client, "priya@example.com")
    daniel = await auth_headers(client, "daniel@example.com")
    theirs = await create_customer(client, daniel)
    payload = {
        "customer_id": theirs["id"],
        "type": "call",
        "title": "Check-in",
        "notes": NOTES,
        "occurred_at": "2026-09-01T10:00:00Z",
    }

    blocked = await client.post("/api/v1/interactions", json=payload, headers=priya)
    created = await client.post("/api/v1/interactions", json=payload, headers=daniel)
    hidden = await client.get(f"/api/v1/interactions/{created.json()['id']}", headers=priya)
    listed = await client.get("/api/v1/interactions", headers=priya)

    assert blocked.status_code == 404
    assert created.status_code == 201
    assert created.json()["ai_status"] == "pending"
    assert created.json()["customer"]["id"] == theirs["id"]
    assert hidden.status_code == 404
    assert listed.json()["total"] == 0


async def test_interaction_date_filter_is_inclusive(client):
    await create_user("csm@example.com")
    headers = await auth_headers(client, "csm@example.com")
    customer = await create_customer(client, headers)
    for day in ("2026-09-01", "2026-09-10", "2026-09-20"):
        await client.post(
            "/api/v1/interactions",
            json={
                "customer_id": customer["id"],
                "type": "email",
                "title": f"Email {day}",
                "notes": NOTES,
                "occurred_at": f"{day}T23:30:00Z",
            },
            headers=headers,
        )

    response = await client.get(
        "/api/v1/interactions?date_from=2026-09-01&date_to=2026-09-10", headers=headers
    )

    assert [i["title"] for i in response.json()["items"]] == [
        "Email 2026-09-10",
        "Email 2026-09-01",
    ]


async def test_editing_notes_resets_ai_status(client):
    await create_user("csm@example.com")
    headers = await auth_headers(client, "csm@example.com")
    customer = await create_customer(client, headers)
    created = await client.post(
        "/api/v1/interactions",
        json={
            "customer_id": customer["id"],
            "type": "meeting",
            "title": "Kickoff",
            "notes": NOTES,
            "occurred_at": "2026-09-01T10:00:00Z",
        },
        headers=headers,
    )
    renamed = await client.patch(
        f"/api/v1/interactions/{created.json()['id']}", json={"title": "QBR"}, headers=headers
    )
    edited = await client.patch(
        f"/api/v1/interactions/{created.json()['id']}",
        json={"notes": NOTES + " Follow-up booked."},
        headers=headers,
    )
    updated_customer = await client.patch(
        f"/api/v1/customers/{customer['id']}", json={"status": "at_risk"}, headers=headers
    )

    assert renamed.json()["title"] == "QBR"
    assert edited.json()["ai_status"] == "pending"
    assert updated_customer.json()["status"] == "at_risk"
