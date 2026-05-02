from tests.conftest import TEST_USER_ID
from tests.factories import make_user


async def test_sync_creates_user(client, db):
    """POST /api/v1/me/sync creates a user row from the fixture's claims dict."""
    response = await client.post("/api/v1/me/sync")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == TEST_USER_ID
    assert data["email"] == "test@example.com"
    assert data["scoring_system"] == "100pt"


async def test_sync_is_idempotent(client, db):
    """Calling sync twice returns the same user without duplicates."""
    await client.post("/api/v1/me/sync")
    response = await client.post("/api/v1/me/sync")
    assert response.status_code == 200
    assert response.json()["id"] == TEST_USER_ID


async def test_get_me_returns_profile(client, db):
    await make_user(db, user_id=TEST_USER_ID, email="me@example.com")
    response = await client.get("/api/v1/me")
    assert response.status_code == 200
    assert response.json()["id"] == TEST_USER_ID


async def test_get_me_404_when_not_synced(client, db):
    """No user row exists — must return 404."""
    response = await client.get("/api/v1/me")
    assert response.status_code == 404


async def test_update_me_scoring_system(client, db):
    await make_user(db, user_id=TEST_USER_ID, email="score@example.com")
    response = await client.put(
        "/api/v1/me",
        json={"scoring_system": "20pt"},
    )
    assert response.status_code == 200
    assert response.json()["scoring_system"] == "20pt"


async def test_update_me_invalid_scoring_system(client, db):
    await make_user(db, user_id=TEST_USER_ID, email="score@example.com")
    response = await client.put("/api/v1/me", json={"scoring_system": "invalid"})
    assert response.status_code == 400


async def test_update_me_preferences_merges(client, db):
    """PUT /api/v1/me merges preferences, does not overwrite the whole dict."""
    await make_user(db, user_id=TEST_USER_ID, email="pref@example.com")
    await client.put("/api/v1/me", json={"preferences": {"theme": "dark"}})
    response = await client.put("/api/v1/me", json={"preferences": {"units": "metric"}})
    assert response.status_code == 200
    prefs = response.json()["preferences"]
    assert prefs.get("theme") == "dark"
    assert prefs.get("units") == "metric"
