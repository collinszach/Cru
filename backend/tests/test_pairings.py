"""
Pairings endpoint tests.

All three modes (from-food, from-wine, tonight) call into app.services.pairing
which makes Claude API calls. We mock the service functions at their import
site in the router to avoid real API calls and test routing logic only.
"""
import pytest

from tests.conftest import TEST_USER_ID
from tests.factories import make_cellar_entry, make_user, make_wine

# Canonical mock return values shaped like the real service outputs
_FOOD_RESULT = [
    {"style": "White Burgundy", "why": "High acidity cuts through cream.", "avoid": "Big reds"},
    {"style": "Chablis", "why": "Minerality complements shellfish.", "avoid": "Oaky Chardonnay"},
    {"style": "Champagne", "why": "Effervescence refreshes the palate.", "avoid": "Dessert wines"},
]

_WINE_RESULT = [
    {"dish": "Roast lamb", "why": "Tannin tames the fat.", "preparation": "Medium-rare"},
    {"dish": "Duck confit", "why": "Earthy notes echo the dish.", "preparation": "Slow-roasted"},
    {"dish": "Hard cheese", "why": "Salt amplifies fruit.", "preparation": "Room temp"},
    {"dish": "Mushroom risotto", "why": "Umami harmony.", "preparation": "Al dente"},
]

_TONIGHT_RESULT = [
    {
        "wine_id": "abc",
        "wine_name": "Test Wine",
        "vintage": 2018,
        "reason": "Perfect for lamb.",
        "decant_minutes": 60,
        "serve_temp_c": 17.0,
    }
]


# ---------------------------------------------------------------------------
# from-food
# ---------------------------------------------------------------------------


async def test_from_food_returns_recommendations(client, db, mocker):
    """from-food mocks pair_from_food, checks response shape."""
    await make_user(db)
    mocker.patch(
        "app.routers.pairings.pair_from_food",
        return_value=_FOOD_RESULT,
    )

    response = await client.post(
        "/api/v1/pairings/from-food",
        json={"food": "pan-seared scallops with butter sauce"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3
    assert "style" in data[0]
    assert "why" in data[0]


async def test_from_food_with_constraints(client, db, mocker):
    """constraints param is forwarded to the service function."""
    await make_user(db)
    mock_fn = mocker.patch(
        "app.routers.pairings.pair_from_food",
        return_value=_FOOD_RESULT,
    )

    await client.post(
        "/api/v1/pairings/from-food",
        json={"food": "steak", "constraints": "under $50, no Bordeaux"},
    )
    # Verify the constraint string reached the service
    call_kwargs = mock_fn.call_args
    assert "under $50" in call_kwargs.kwargs.get("constraints", "") or (
        len(call_kwargs.args) >= 3 and "under $50" in call_kwargs.args[2]
    )


# ---------------------------------------------------------------------------
# from-wine
# ---------------------------------------------------------------------------


async def test_from_wine_returns_pairings(client, db, mocker):
    """from-wine mocks pair_from_wine, checks response shape."""
    await make_user(db)
    wine = await make_wine(db)
    mocker.patch(
        "app.routers.pairings.pair_from_wine",
        return_value=_WINE_RESULT,
    )

    response = await client.post(
        "/api/v1/pairings/from-wine",
        json={"wine_id": str(wine.id), "vintage": 2018},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 4
    assert "dish" in data[0]
    assert "why" in data[0]


async def test_from_wine_unknown_wine_returns_404(client, db, mocker):
    """Unknown wine_id → 404 before the service is even called."""
    import uuid
    await make_user(db)
    mocker.patch("app.routers.pairings.pair_from_wine", return_value=_WINE_RESULT)

    response = await client.post(
        "/api/v1/pairings/from-wine",
        json={"wine_id": str(uuid.uuid4()), "vintage": 2019},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# tonight
# ---------------------------------------------------------------------------


async def test_tonight_404_when_no_in_window_bottles(client, db, mocker):
    """If no cellar bottles are in their drinking window, return 404."""
    await make_user(db)
    wine = await make_wine(db)
    # Add a bottle with no drink_from/drink_by set — won't satisfy the filter
    await make_cellar_entry(db, user_id=TEST_USER_ID, wine_id=wine.id)
    mocker.patch("app.routers.pairings.pair_tonight", return_value=_TONIGHT_RESULT)

    response = await client.post(
        "/api/v1/pairings/tonight",
        json={"dish": "rack of lamb"},
    )
    assert response.status_code == 404
    assert "drinking window" in response.json()["detail"].lower()


async def test_tonight_returns_picks_when_in_window(client, db, mocker):
    """When at least one bottle is in window, returns Claude picks."""
    import datetime
    await make_user(db)
    wine = await make_wine(db)

    # Add a bottle explicitly in window for current year
    now_year = datetime.datetime.now(datetime.timezone.utc).year
    entry = await make_cellar_entry(db, user_id=TEST_USER_ID, wine_id=wine.id)
    # Set drink_from/drink_by via direct attribute mutation + flush
    entry.drink_from = now_year - 1
    entry.drink_by = now_year + 3
    await db.flush()

    mocker.patch(
        "app.routers.pairings.pair_tonight",
        return_value=_TONIGHT_RESULT,
    )

    response = await client.post(
        "/api/v1/pairings/tonight",
        json={"dish": "rack of lamb", "constraints": "prefer Burgundy"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert "wine_name" in data[0]
    assert "reason" in data[0]
