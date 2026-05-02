from tests.conftest import TEST_USER_ID
from tests.factories import make_cellar_entry, make_tasting_note, make_user, make_wine


async def test_stats_returns_expected_shape(client, db):
    await make_user(db)
    response = await client.get("/api/v1/stats")
    assert response.status_code == 200
    data = response.json()
    # Verify the actual dashboard keys
    assert "bottle_count" in data
    assert "total_notes" in data
    assert "avg_score" in data
    assert "unique_regions" in data


async def test_stats_total_bottles_sums_quantities(client, db):
    await make_user(db)
    wine = await make_wine(db)
    await make_cellar_entry(db, user_id=TEST_USER_ID, wine_id=wine.id, quantity=3)
    await make_cellar_entry(db, user_id=TEST_USER_ID, wine_id=wine.id, quantity=2)
    response = await client.get("/api/v1/stats")
    assert response.status_code == 200
    # total_bottles sums quantity across entries; bottle_count counts entries
    assert response.json()["total_bottles"] == 5
    assert response.json()["bottle_count"] == 2


async def test_palate_radar_returns_axes(client, db):
    await make_user(db)
    response = await client.get("/api/v1/stats/palate-radar")
    assert response.status_code == 200
    data = response.json()
    # Verify the axes the endpoint actually returns
    for axis in ("sweetness", "acidity", "tannin", "body"):
        assert axis in data


async def test_score_distribution_returns_histogram(client, db):
    await make_user(db)
    wine = await make_wine(db)
    await make_tasting_note(db, user_id=TEST_USER_ID, wine_id=wine.id, personal_score=90.0)
    await make_tasting_note(db, user_id=TEST_USER_ID, wine_id=wine.id, personal_score=94.0)
    response = await client.get("/api/v1/stats/score-distribution")
    assert response.status_code == 200
    # Response is a list of {bucket, count} dicts
    assert isinstance(response.json(), list)
