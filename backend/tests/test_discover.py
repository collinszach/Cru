"""
Discover endpoint tests.

Strategy:
  - Recommendations require a user_taste_profiles row — we insert one via raw SQL.
  - ANN search requires wine_embeddings rows — we insert minimal ones via raw SQL.
  - Claude calls are mocked via mocker.patch to avoid real API calls.
  - We test routing logic (404 when no profile, style filter plumbing) not ML output.
  - Both profile and embedding vectors must be 1536d to match the VECTOR(1536) column.
"""
import uuid

import pytest
from sqlalchemy import text

from tests.conftest import TEST_USER_ID
from tests.factories import make_tasting_note, make_user, make_wine

# 1536d unit-ish vector — all elements equal so it's valid for cosine similarity.
# Not normalized but that doesn't affect test correctness (we just need it consistent).
_VEC_1536 = "[" + ",".join(["0.1"] * 1536) + "]"
# As a Python list for mocking embed_text return value
_VEC_LIST = [0.1] * 1536


async def _insert_user_profile(db, user_id: str) -> None:
    """Insert a minimal user taste profile row directly (bypasses embedding service)."""
    await db.execute(
        text(
            """
            INSERT INTO user_taste_profiles
                (id, user_id, profile_vector, last_computed, note_count)
            VALUES
                (:id, :uid, CAST(:vec AS vector), now(), 5)
            ON CONFLICT (user_id) DO UPDATE SET profile_vector = EXCLUDED.profile_vector
            """
        ),
        {"id": str(uuid.uuid4()), "uid": user_id, "vec": _VEC_1536},
    )
    await db.flush()


async def _insert_wine_embedding(db, wine_id: uuid.UUID) -> None:
    """Insert a global wine embedding row for ANN queries."""
    await db.execute(
        text(
            """
            INSERT INTO wine_embeddings
                (id, wine_id, user_id, embedding, embedding_text, model_version, created_at)
            VALUES
                (:id, :wid, NULL, CAST(:vec AS vector), 'test', 'test-v1', now())
            """
        ),
        {"id": str(uuid.uuid4()), "wid": str(wine_id), "vec": _VEC_1536},
    )
    await db.flush()


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------


async def test_recommendations_404_without_profile(client, db):
    """Must return 404 when user has no taste profile yet."""
    await make_user(db)
    response = await client.get("/api/v1/discover/recommendations")
    assert response.status_code == 404
    assert "taste profile" in response.json()["detail"].lower()


async def test_recommendations_returns_list_with_profile(client, db):
    """With a profile and at least one wine embedding, returns a list."""
    await make_user(db)
    wine = await make_wine(db)
    await _insert_user_profile(db, TEST_USER_ID)
    await _insert_wine_embedding(db, wine.id)

    response = await client.get("/api/v1/discover/recommendations?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        item = data[0]
        assert "wine_id" in item
        assert "full_name" in item
        assert "distance" in item
        assert "reason" in item


async def test_recommendations_excludes_already_tasted(client, db):
    """
    Wines the user has tasted must not appear in recommendations.
    We verify by checking the SQL subquery exclusion — the endpoint must
    return 0 results when the only embedded wine is already noted.
    """
    await make_user(db)
    wine = await make_wine(db)
    await _insert_user_profile(db, TEST_USER_ID)
    await _insert_wine_embedding(db, wine.id)

    # Note the wine so it gets excluded
    await make_tasting_note(db, user_id=TEST_USER_ID, wine_id=wine.id)

    response = await client.get("/api/v1/discover/recommendations")
    assert response.status_code == 200
    # The only embedded wine was excluded — list must be empty
    assert response.json() == []


# ---------------------------------------------------------------------------
# Similar wines
# ---------------------------------------------------------------------------


async def test_similar_wines_404_for_unknown_wine(client, db):
    await make_user(db)
    response = await client.get(f"/api/v1/discover/similar/{uuid.uuid4()}")
    assert response.status_code == 404


async def test_similar_wines_returns_list(client, db):
    await make_user(db)
    wine_a = await make_wine(db, slug="wine-a-sim-test")
    wine_b = await make_wine(db, slug="wine-b-sim-test")
    await _insert_wine_embedding(db, wine_a.id)
    await _insert_wine_embedding(db, wine_b.id)

    response = await client.get(f"/api/v1/discover/similar/{wine_a.id}?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # wine_a itself must be excluded
    assert not any(r["wine_id"] == str(wine_a.id) for r in data)


# ---------------------------------------------------------------------------
# Natural language search
# ---------------------------------------------------------------------------


async def test_nl_search_mocks_claude(client, db, mocker):
    """
    NL search makes two Claude calls: _parse_nl_query and _claude_reason.
    Both are mocked — we verify the endpoint plumbing, not Claude's output.
    """
    await make_user(db)
    wine = await make_wine(db, slug="nl-test-wine")
    await _insert_wine_embedding(db, wine.id)

    # Mock Claude parse to return empty filters (no style filter applied)
    mocker.patch(
        "app.routers.discover._parse_nl_query",
        return_value={},
    )
    # Mock Claude reason to return a fixed string
    mocker.patch(
        "app.routers.discover._claude_reason",
        return_value="Great match for your query.",
    )

    # Mock embed_text to return our tiny 1536d vector
    mocker.patch(
        "app.routers.discover.embed_text",
        return_value=_VEC_LIST,
    )

    response = await client.post(
        "/api/v1/discover/natural-language",
        json={"query": "earthy Pinot Noir from Burgundy", "limit": 5},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        assert "match_reason" in data[0]
