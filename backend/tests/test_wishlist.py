from tests.conftest import TEST_USER_ID, TEST_USER_ID_B
from tests.factories import make_user, make_wine


async def test_add_to_wishlist_returns_201(client, db):
    await make_user(db)
    wine = await make_wine(db)
    response = await client.post(
        "/api/v1/wishlist",
        json={"wine_id": str(wine.id), "priority": 4, "reason": "Heard it's great."},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["wine_id"] == str(wine.id)
    assert data["priority"] == 4


async def test_wishlist_user_isolation(client, client_b, db):
    await make_user(db, user_id=TEST_USER_ID, email="a@example.com")
    await make_user(db, user_id=TEST_USER_ID_B, email="b@example.com")
    wine = await make_wine(db)

    await client.post("/api/v1/wishlist", json={"wine_id": str(wine.id), "priority": 3})
    await client_b.post("/api/v1/wishlist", json={"wine_id": str(wine.id), "priority": 5})

    resp_a = await client.get("/api/v1/wishlist")
    resp_b = await client_b.get("/api/v1/wishlist")

    assert len(resp_a.json()) == 1
    assert len(resp_b.json()) == 1


async def test_delete_wishlist_item(client, db):
    await make_user(db)
    wine = await make_wine(db)
    add_resp = await client.post(
        "/api/v1/wishlist",
        json={"wine_id": str(wine.id), "priority": 2},
    )
    item_id = add_resp.json()["id"]
    del_resp = await client.delete(f"/api/v1/wishlist/{item_id}")
    assert del_resp.status_code == 204

    list_resp = await client.get("/api/v1/wishlist")
    assert len(list_resp.json()) == 0


async def test_delete_other_users_wishlist_item_returns_404(client, client_b, db):
    await make_user(db, user_id=TEST_USER_ID, email="a@example.com")
    await make_user(db, user_id=TEST_USER_ID_B, email="b@example.com")
    wine = await make_wine(db)
    add_resp = await client.post(
        "/api/v1/wishlist", json={"wine_id": str(wine.id), "priority": 1}
    )
    item_id = add_resp.json()["id"]

    response = await client_b.delete(f"/api/v1/wishlist/{item_id}")
    assert response.status_code == 404
