import json

import pytest

from app.config import settings
from app.services import ai
from tests.conftest import auth_headers, create_customer, create_interaction, create_user

VALID = json.dumps(
    {
        "summary": "Customer is unhappy with reporting speed.",
        "sentiment": "negative",
        "action_items": ["Demo new reporting module"],
        "risks": ["Evaluating a competitor"],
    }
)


@pytest.fixture
def gemini(monkeypatch):
    calls = []
    responses = []

    async def fake_call(prompt: str) -> str:
        calls.append(prompt)
        result = responses.pop(0)
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(ai, "call_gemini", fake_call)
    monkeypatch.setattr(ai.asyncio, "sleep", lambda _: _noop())
    return calls, responses


async def _noop() -> None:
    return None


async def setup(client):
    await create_user("csm@example.com")
    headers = await auth_headers(client, "csm@example.com")
    customer = await create_customer(client, headers)
    return headers, customer


async def test_valid_output_is_saved(client, gemini):
    calls, responses = gemini
    responses.append(VALID)
    headers, customer = await setup(client)

    created = await create_interaction(client, headers, customer["id"])
    detail = (await client.get(f"/api/v1/interactions/{created['id']}", headers=headers)).json()

    assert len(calls) == 1
    assert "<notes>" in calls[0]
    assert detail["ai_status"] == "completed"
    assert detail["insight"]["sentiment"] == "negative"
    assert detail["insight"]["risks"] == ["Evaluating a competitor"]


async def test_invalid_output_is_retried_then_marked_failed(client, gemini):
    calls, responses = gemini
    responses.extend(['{"summary": "missing fields"}', RuntimeError("timeout")])
    headers, customer = await setup(client)

    created = await create_interaction(client, headers, customer["id"])
    detail = (await client.get(f"/api/v1/interactions/{created['id']}", headers=headers)).json()

    assert len(calls) == 2
    assert detail["ai_status"] == "failed"
    assert detail["insight"]["summary"] is None
    assert detail["insight"]["error"]

    responses.append(VALID)
    regenerated = await client.post(
        f"/api/v1/interactions/{created['id']}/regenerate", headers=headers
    )
    detail = (await client.get(f"/api/v1/interactions/{created['id']}", headers=headers)).json()
    assert regenerated.status_code == 202
    assert detail["ai_status"] == "completed"
    assert detail["insight"]["error"] is None


async def test_short_notes_are_skipped_without_calling_the_api(client, gemini):
    calls, _ = gemini
    headers, customer = await setup(client)

    created = await create_interaction(
        client, headers, customer["id"], notes="Quick call, all good."
    )
    detail = (await client.get(f"/api/v1/interactions/{created['id']}", headers=headers)).json()

    assert calls == []
    assert detail["ai_status"] == "skipped"
    assert detail["insight"] is None
