import pytest
from datetime import datetime, timedelta, timezone

from tests.conftest import TEST_USER_ID, TEST_USER_ID_B
from tests.factories import make_tasting_note, make_user, make_wine

_NOW = datetime.now(timezone.utc)
_FRESH = _NOW - timedelta(hours=1)    # 1 hour old — within 24h window
_AGED = _NOW - timedelta(hours=25)    # 25 hours old — past the window


@pytest.fixture(autouse=True)
def mock_profile_recompute(mocker):
    """
    Prevent _schedule_profile_recompute from firing asyncio.create_task() in tests.
    The background task opens AsyncSessionLocal() (app's prod DB, not cru_test),
    which creates asyncpg futures on the test event loop that outlive the test and
    produce "Task destroyed but pending" warnings.  Mocking it keeps tests clean.
    """
    mocker.patch("app.routers.tasting._schedule_profile_recompute")


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


async def test_create_note_returns_201(client, db):
    await make_user(db)
    wine = await make_wine(db)
    response = await client.post(
        "/api/v1/notes",
        json={
            "wine_id": str(wine.id),
            "vintage": 2018,
            "tasted_at": _NOW.isoformat(),
            "personal_score": 93.0,
            "palate_acidity": "high",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["personal_score"] == 93.0
    assert data["palate_acidity"] == "high"
    assert data["amendments"] == []


async def test_create_note_without_wine_id(client, db):
    """Notes can be created without linking to a canonical wine record."""
    await make_user(db)
    response = await client.post(
        "/api/v1/notes",
        json={
            "vintage": 2019,
            "tasted_at": _NOW.isoformat(),
            "free_note": "Mystery bottle from the cellar.",
        },
    )
    assert response.status_code == 201
    assert response.json()["wine_id"] is None


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


async def test_list_notes_user_isolation(client, client_b, db):
    await make_user(db, user_id=TEST_USER_ID, email="a@example.com")
    await make_user(db, user_id=TEST_USER_ID_B, email="b@example.com")
    wine = await make_wine(db)
    await make_tasting_note(db, user_id=TEST_USER_ID, wine_id=wine.id)
    await make_tasting_note(db, user_id=TEST_USER_ID_B, wine_id=wine.id)

    resp_a = await client.get("/api/v1/notes")
    resp_b = await client_b.get("/api/v1/notes")

    assert len(resp_a.json()["items"]) == 1
    assert len(resp_b.json()["items"]) == 1
    # Ensure User A's note id != User B's note id
    assert resp_a.json()["items"][0]["id"] != resp_b.json()["items"][0]["id"]


async def test_list_notes_filter_by_wine(client, db):
    await make_user(db)
    wine_a = await make_wine(db, slug="wine-a-test")
    wine_b = await make_wine(db, slug="wine-b-test")
    await make_tasting_note(db, user_id=TEST_USER_ID, wine_id=wine_a.id)
    await make_tasting_note(db, user_id=TEST_USER_ID, wine_id=wine_b.id)

    response = await client.get(f"/api/v1/notes?wine_id={wine_a.id}")
    assert response.status_code == 200
    results = response.json()["items"]
    assert len(results) == 1
    assert results[0]["wine_id"] == str(wine_a.id)


# ---------------------------------------------------------------------------
# Update — 24h immutability (THE critical rule)
# ---------------------------------------------------------------------------


async def test_update_within_24h_succeeds(client, db):
    await make_user(db)
    note = await make_tasting_note(
        db, user_id=TEST_USER_ID, created_at=_FRESH
    )
    response = await client.put(
        f"/api/v1/notes/{note.id}",
        json={"personal_score": 96.0, "quality": "outstanding"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["personal_score"] == 96.0
    assert data["quality"] == "outstanding"


async def test_update_after_24h_returns_403(client, db):
    """THE critical invariant: notes are immutable after 24 hours."""
    await make_user(db)
    note = await make_tasting_note(
        db, user_id=TEST_USER_ID, created_at=_AGED
    )
    response = await client.put(
        f"/api/v1/notes/{note.id}",
        json={"personal_score": 99.0},
    )
    assert response.status_code == 403
    detail = response.json()["detail"].lower()
    assert "24 hour" in detail or "immutable" in detail


async def test_update_other_users_note_returns_404(client, client_b, db):
    """User B cannot update User A's note — must get 404, never 403."""
    await make_user(db, user_id=TEST_USER_ID, email="a@example.com")
    await make_user(db, user_id=TEST_USER_ID_B, email="b@example.com")
    note = await make_tasting_note(db, user_id=TEST_USER_ID, created_at=_FRESH)

    response = await client_b.put(
        f"/api/v1/notes/{note.id}",
        json={"personal_score": 99.0},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Amend — always allowed, append-only
# ---------------------------------------------------------------------------


async def test_amend_fresh_note_appends(client, db):
    """Amendments are allowed at any time, including within the 24h window."""
    await make_user(db)
    note = await make_tasting_note(
        db, user_id=TEST_USER_ID, created_at=_FRESH
    )
    response = await client.post(
        f"/api/v1/notes/{note.id}/amend",
        json={"text": "Opened again — more tertiary notes emerging."},
    )
    assert response.status_code == 200
    amendments = response.json()["amendments"]
    assert len(amendments) == 1
    assert amendments[0]["text"] == "Opened again — more tertiary notes emerging."
    assert "created_at" in amendments[0]


async def test_amend_aged_note_appends(client, db):
    """Amendments are the ONLY allowed mutation after 24h — this must succeed."""
    await make_user(db)
    note = await make_tasting_note(
        db, user_id=TEST_USER_ID, created_at=_AGED
    )
    response = await client.post(
        f"/api/v1/notes/{note.id}/amend",
        json={"text": "Revisited 3 years later — note the improvement."},
    )
    assert response.status_code == 200
    assert len(response.json()["amendments"]) == 1


async def test_amend_accumulates_multiple_amendments(client, db):
    """Each amendment appends — earlier amendments must not be overwritten."""
    await make_user(db)
    note = await make_tasting_note(db, user_id=TEST_USER_ID, created_at=_AGED)

    await client.post(
        f"/api/v1/notes/{note.id}/amend",
        json={"text": "First amendment."},
    )
    response = await client.post(
        f"/api/v1/notes/{note.id}/amend",
        json={"text": "Second amendment."},
    )
    amendments = response.json()["amendments"]
    assert len(amendments) == 2
    assert amendments[0]["text"] == "First amendment."
    assert amendments[1]["text"] == "Second amendment."


async def test_amend_other_users_note_returns_404(client, client_b, db):
    await make_user(db, user_id=TEST_USER_ID, email="a@example.com")
    await make_user(db, user_id=TEST_USER_ID_B, email="b@example.com")
    note = await make_tasting_note(db, user_id=TEST_USER_ID, created_at=_AGED)

    response = await client_b.post(
        f"/api/v1/notes/{note.id}/amend",
        json={"text": "Attempting to amend another user's note."},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Blind tasting
# ---------------------------------------------------------------------------


async def test_blind_analysis_on_non_blind_note_returns_400(client, db):
    await make_user(db)
    note = await make_tasting_note(
        db, user_id=TEST_USER_ID, created_at=_FRESH, is_blind=False
    )
    response = await client.get(f"/api/v1/notes/{note.id}/blind-analysis")
    assert response.status_code == 400


async def test_blind_reveal_before_analysis_returns_409(client, db):
    await make_user(db)
    note = await make_tasting_note(
        db, user_id=TEST_USER_ID, created_at=_FRESH, is_blind=True
    )
    response = await client.post(
        f"/api/v1/notes/{note.id}/blind-reveal",
        json={
            "grape": "Pinot Noir",
            "region": "Burgundy",
            "vintage": 2018,
            "classification": "Premier Cru",
        },
    )
    assert response.status_code == 409
