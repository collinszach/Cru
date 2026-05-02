from tests.factories import make_user


async def test_add_winery_returns_201(client, db):
    await make_user(db)
    response = await client.post(
        "/api/v1/wineries",
        json={
            "name": "Château Pétrus",
            "visit_status": "wishlist",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Château Pétrus"
    assert data["visit_status"] == "wishlist"


async def test_list_wineries_returns_all(client, db):
    """Wineries are a global shared dataset — no per-user isolation on list."""
    await make_user(db)
    await client.post("/api/v1/wineries", json={"name": "Winery One", "visit_status": "visited"})
    await client.post("/api/v1/wineries", json={"name": "Winery Two", "visit_status": "wishlist"})

    response = await client.get("/api/v1/wineries")
    assert response.status_code == 200
    names = [w["name"] for w in response.json()]
    assert "Winery One" in names
    assert "Winery Two" in names


async def test_update_winery_visit_status(client, db):
    await make_user(db)
    add_resp = await client.post(
        "/api/v1/wineries",
        json={"name": "DRC", "visit_status": "wishlist"},
    )
    winery_id = add_resp.json()["id"]
    response = await client.put(
        f"/api/v1/wineries/{winery_id}",
        json={"visit_status": "visited", "visit_notes": "Incredible cellar tour."},
    )
    assert response.status_code == 200
    assert response.json()["visit_status"] == "visited"
