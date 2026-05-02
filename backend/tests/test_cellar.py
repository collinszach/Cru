from tests.conftest import TEST_USER_ID, TEST_USER_ID_B
from tests.factories import make_cellar_entry, make_user, make_wine


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


async def test_add_bottle_returns_201(client, db):
    await make_user(db)
    wine = await make_wine(db)
    response = await client.post(
        "/api/v1/cellar",
        json={"wine_id": str(wine.id), "vintage": 2018, "quantity": 3},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["vintage"] == 2018
    assert data["quantity"] == 3
    assert data["status"] == "in_cellar"


async def test_list_cellar_only_own_entries(client, client_b, db):
    await make_user(db, user_id=TEST_USER_ID, email="a@example.com")
    await make_user(db, user_id=TEST_USER_ID_B, email="b@example.com")
    wine = await make_wine(db)
    await make_cellar_entry(db, user_id=TEST_USER_ID, wine_id=wine.id)
    await make_cellar_entry(db, user_id=TEST_USER_ID_B, wine_id=wine.id)

    resp_a = await client.get("/api/v1/cellar")
    resp_b = await client_b.get("/api/v1/cellar")

    assert resp_a.status_code == 200
    assert resp_b.status_code == 200
    # Each user sees exactly 1 entry — their own
    assert len(resp_a.json()["items"]) == 1
    assert len(resp_b.json()["items"]) == 1


async def test_update_bottle_quantity(client, db):
    await make_user(db)
    wine = await make_wine(db)
    entry = await make_cellar_entry(db, user_id=TEST_USER_ID, wine_id=wine.id, quantity=6)
    response = await client.put(
        f"/api/v1/cellar/{entry.id}",
        json={"quantity": 4, "bin_location": "B-2"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["quantity"] == 4
    assert data["bin_location"] == "B-2"


async def test_update_bottle_isolation_404(client, client_b, db):
    """User B cannot update User A's bottle — returns 404, not 403."""
    await make_user(db, user_id=TEST_USER_ID, email="a@example.com")
    await make_user(db, user_id=TEST_USER_ID_B, email="b@example.com")
    wine = await make_wine(db)
    entry = await make_cellar_entry(db, user_id=TEST_USER_ID, wine_id=wine.id)

    response = await client_b.put(
        f"/api/v1/cellar/{entry.id}",
        json={"quantity": 99},
    )
    # Must be 404 — never leak existence of another user's bottle
    assert response.status_code == 404


async def test_delete_bottle_marks_consumed(client, db):
    await make_user(db)
    wine = await make_wine(db)
    entry = await make_cellar_entry(db, user_id=TEST_USER_ID, wine_id=wine.id)
    response = await client.delete(
        f"/api/v1/cellar/{entry.id}?final_status=consumed"
    )
    assert response.status_code == 204


async def test_delete_invalid_status_returns_422(client, db):
    await make_user(db)
    wine = await make_wine(db)
    entry = await make_cellar_entry(db, user_id=TEST_USER_ID, wine_id=wine.id)
    response = await client.delete(
        f"/api/v1/cellar/{entry.id}?final_status=destroyed"
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Consume endpoint — business rules
# ---------------------------------------------------------------------------


async def test_consume_decrements_quantity(client, db):
    await make_user(db)
    wine = await make_wine(db)
    entry = await make_cellar_entry(
        db, user_id=TEST_USER_ID, wine_id=wine.id, quantity=6
    )
    response = await client.post(
        f"/api/v1/cellar/{entry.id}/consume",
        json={"quantity": 2},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["quantity_remaining"] == 4
    assert data["status"] == "in_cellar"


async def test_consume_last_bottle_marks_consumed(client, db):
    await make_user(db)
    wine = await make_wine(db)
    entry = await make_cellar_entry(
        db, user_id=TEST_USER_ID, wine_id=wine.id, quantity=1
    )
    response = await client.post(
        f"/api/v1/cellar/{entry.id}/consume",
        json={"quantity": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["quantity_remaining"] == 0
    assert data["status"] == "consumed"
    assert data["consumed_at"] is not None


async def test_consume_more_than_stock_returns_422(client, db):
    await make_user(db)
    wine = await make_wine(db)
    entry = await make_cellar_entry(
        db, user_id=TEST_USER_ID, wine_id=wine.id, quantity=2
    )
    response = await client.post(
        f"/api/v1/cellar/{entry.id}/consume",
        json={"quantity": 5},
    )
    assert response.status_code == 422


async def test_consume_already_consumed_returns_409(client, db):
    await make_user(db)
    wine = await make_wine(db)
    entry = await make_cellar_entry(
        db, user_id=TEST_USER_ID, wine_id=wine.id, quantity=0, status="consumed"
    )
    response = await client.post(
        f"/api/v1/cellar/{entry.id}/consume",
        json={"quantity": 1},
    )
    assert response.status_code == 409


# ---------------------------------------------------------------------------
# Portfolio value
# ---------------------------------------------------------------------------


async def test_portfolio_value_empty_cellar(client, db):
    await make_user(db)
    response = await client.get("/api/v1/cellar/value")
    assert response.status_code == 200
    data = response.json()
    assert data["total_value"] == 0.0
    assert data["bottle_count"] == 0


async def test_portfolio_value_sums_purchase_prices(client, db):
    await make_user(db)
    wine = await make_wine(db)
    await make_cellar_entry(
        db, user_id=TEST_USER_ID, wine_id=wine.id, quantity=2, purchase_price=100.0
    )
    await make_cellar_entry(
        db, user_id=TEST_USER_ID, wine_id=wine.id, quantity=3, purchase_price=50.0
    )
    response = await client.get("/api/v1/cellar/value")
    assert response.status_code == 200
    data = response.json()
    # 2×100 + 3×50 = 350
    assert data["total_value"] == 350.0
    assert data["bottle_count"] == 5
